import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { seatingService, type SeatingChart, type VoicePart } from '../services/seatingService';
import { profileService, type Profile } from '../services/profileService';
import { type Venue } from '../services/venueService';
import {
  mergeSeatingResponseWithDirtyState,
  seatingContextId,
  seatingContextKey,
  shouldApplySeatingResponse,
  type SeatingSyncContext,
} from '../lib/seatingSync';

interface SyncOptions {
  performanceId?: string;
  venueId?: string;
  sessionId?: number;
  payload?: Partial<SeatingChart> | null;
  baseChart?: SeatingChart | null;
  requestId?: number;
  updateCurrentState?: boolean;
}

export const useSeatingChart = (performanceId: string, venue: Venue | null) => {
  const venueId = venue?.id || '';
  const contextKey = seatingContextKey(performanceId, venueId);
  const [chart, setChart] = useState<SeatingChart | null>(null);
  const [optimisticAssignments, setOptimisticAssignments] = useState<Record<string, string>>({});
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncPending, setIsSyncPending] = useState(false);
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [contextState, setContextState] = useState({ key: contextKey, sessionId: 0 });

  const chartRef = useRef<SeatingChart | null>(null);
  const optimisticAssignmentsRef = useRef<Record<string, string>>({});
  const dirtyPayloadRef = useRef<Partial<SeatingChart> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const syncSequenceRef = useRef(0);
  const lastEditIdRef = useRef(0);
  const lastAppliedIdRef = useRef(0);
  const loadedContextKeyRef = useRef<string | null>(null);
  const currentContextRef = useRef<SeatingSyncContext>({
    performanceId,
    venueId,
    sessionId: 0,
  });
  const syncWithServerRef = useRef<(options?: SyncOptions) => Promise<void>>(async () => undefined);

  const currentSessionId = contextState.key === contextKey
    ? contextState.sessionId
    : contextState.sessionId + 1;

  const currentContext = useMemo<SeatingSyncContext>(() => ({
    performanceId,
    venueId,
    sessionId: currentSessionId,
  }), [currentSessionId, performanceId, venueId]);

  useLayoutEffect(() => {
    currentContextRef.current = currentContext;

    if (contextState.key !== contextKey) {
      setContextState({ key: contextKey, sessionId: currentSessionId });
    }
  }, [contextKey, contextState.key, currentContext, currentSessionId]);

  const clearSaveTimer = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const resetDirtyTracking = useCallback(() => {
    dirtyPayloadRef.current = null;
    isDirtyRef.current = false;
    lastEditIdRef.current = 0;
    lastAppliedIdRef.current = 0;
    setIsDirty(false);
    setIsSyncPending(false);
  }, []);

  const syncWithServer = useCallback(async (options: SyncOptions = {}) => {
    const targetPerformanceId = options.performanceId ?? performanceId;
    const targetVenueId = options.venueId ?? venueId;
    const payload = options.payload ?? dirtyPayloadRef.current;

    if (!targetVenueId || !targetPerformanceId || !payload) return;

    const requestContext: SeatingSyncContext = {
      performanceId: targetPerformanceId,
      venueId: targetVenueId,
      sessionId: options.sessionId ?? currentContext.sessionId,
    };
    const requestId = options.requestId ?? lastEditIdRef.current;
    const baseChart = options.baseChart ?? chartRef.current;
    const requestSequence = ++syncSequenceRef.current;
    const shouldTrackInCurrentUi = () => (
      options.updateCurrentState !== false &&
      shouldApplySeatingResponse(requestContext, currentContextRef.current)
    );
    const trackInCurrentUi = shouldTrackInCurrentUi();

    if (trackInCurrentUi) {
      clearSaveTimer();
      setIsSyncPending(false);
      setActiveRequestsCount((current) => current + 1);
      setError(null);
    }

    try {
      const updated = await seatingService.saveChart({
        ...(baseChart || {}),
        ...payload,
        performance: targetPerformanceId,
        venue: targetVenueId,
      });

      if (!shouldTrackInCurrentUi() || syncSequenceRef.current !== requestSequence) return;

      if (requestId > lastAppliedIdRef.current) {
        lastAppliedIdRef.current = requestId;

        if (lastEditIdRef.current === requestId) {
          chartRef.current = updated;
          optimisticAssignmentsRef.current = updated.assignments || {};
          dirtyPayloadRef.current = null;
          isDirtyRef.current = false;

          setChart(updated);
          setOptimisticAssignments(updated.assignments || {});
          setIsDirty(false);
          setError(null);
        } else {
          const merged = mergeSeatingResponseWithDirtyState(
            updated,
            dirtyPayloadRef.current || {},
            optimisticAssignmentsRef.current,
            performanceId,
            venueId,
          );

          chartRef.current = merged;
          setChart(merged);
          setError(null);
        }
      }
    } catch (err: any) {
      if (shouldTrackInCurrentUi() && requestId === lastEditIdRef.current) {
        setError(err.message || 'Failed to save seating chart');
      }
    } finally {
      if (trackInCurrentUi) {
        setActiveRequestsCount((current) => Math.max(0, current - 1));
      }

      if (shouldTrackInCurrentUi() && isDirtyRef.current && lastEditIdRef.current !== requestId) {
        setIsSyncPending(true);
        saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = null;
          void syncWithServerRef.current();
        }, 0);
      }
    }
  }, [clearSaveTimer, currentContext.sessionId, performanceId, venueId]);

  useEffect(() => {
    syncWithServerRef.current = syncWithServer;
  }, [syncWithServer]);

  useEffect(() => {
    const capturedContext = currentContext;

    return () => {
      if (!isDirtyRef.current || !dirtyPayloadRef.current || !capturedContext.venueId) return;

      void syncWithServerRef.current({
        performanceId: capturedContext.performanceId,
        venueId: capturedContext.venueId,
        sessionId: capturedContext.sessionId,
        payload: { ...dirtyPayloadRef.current },
        baseChart: chartRef.current ? { ...chartRef.current } : null,
        requestId: lastEditIdRef.current,
        updateCurrentState: false,
      });
    };
  }, [contextKey, currentContext]);

  const scheduleSync = useCallback((delay = 1000) => {
    clearSaveTimer();
    setIsSyncPending(true);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      void syncWithServerRef.current();
    }, delay);
  }, [clearSaveTimer]);

  useEffect(() => {
    return () => clearSaveTimer();
  }, [clearSaveTimer]);

  const fetchData = useCallback(async () => {
    if (!performanceId) return;
    const requestContext = currentContext;
    const requestContextId = seatingContextId(requestContext);
    const contextChanged = loadedContextKeyRef.current !== seatingContextKey(performanceId, venueId);

    setIsLoading(true);

    if (contextChanged) {
      clearSaveTimer();
      resetDirtyTracking();
      setError(null);
    }

    try {
      const [existingChart, profiles] = await Promise.all([
        seatingService.getChartForPerformance(performanceId, venueId || null),
        profileService.getActiveProfiles(), // Filtered for Active (Current/Future)
      ]);

      // Strictly filter for Active (Current) as per user request for seating chart
      const activeCurrent = profiles.filter(p => p.globalStatus === 'Active (Current)');
      if (seatingContextId(currentContextRef.current) !== requestContextId) return;

      const mergedChart = !contextChanged && isDirtyRef.current && dirtyPayloadRef.current
        ? mergeSeatingResponseWithDirtyState(
          existingChart,
          dirtyPayloadRef.current,
          optimisticAssignmentsRef.current,
          performanceId,
          venueId,
        )
        : existingChart;
      const assignments = mergedChart?.assignments || {};

      setChart(mergedChart);
      chartRef.current = mergedChart;
      optimisticAssignmentsRef.current = assignments;
      setOptimisticAssignments(assignments);
      setActiveProfiles(activeCurrent);
      setError(null);
      loadedContextKeyRef.current = contextKey;
    } catch (err: any) {
      if (seatingContextId(currentContextRef.current) === requestContextId) {
        setError(err.message || 'Failed to fetch seating data');
      }
    } finally {
      if (seatingContextId(currentContextRef.current) === requestContextId) {
        setIsLoading(false);
      }
    }
  }, [clearSaveTimer, contextKey, currentContext, performanceId, resetDirtyTracking, venueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const partCounts = useMemo(() => {
    const counts: Record<VoicePart, number> = { S: 0, A: 0, T: 0, B: 0 };
    activeProfiles.forEach(p => {
      const section = p.voicePart[0] as VoicePart;
      if (counts[section] !== undefined) counts[section]++;
    });
    return counts;
  }, [activeProfiles]);

  const rowCounts = useMemo(() => {
    return chart?.layoutOverride || venue?.rowCounts || [];
  }, [chart, venue]);

  const sections = useMemo(() => {
    const order = chart?.sectionOrder;
    if (order && order.trim()) {
      return order.split(',').map(s => s.trim().toUpperCase()) as VoicePart[];
    }
    // Default formation
    return ['S', 'A', 'T', 'B'] as VoicePart[];
  }, [chart]);

  const suggestions = useMemo(() => {
    return seatingService.calculateAutoPaint(rowCounts, partCounts, sections);
  }, [rowCounts, partCounts, sections]);

  const queueChartSave = useCallback((updates: Partial<SeatingChart>) => {
    if (!venue || !performanceId) return undefined;

    lastEditIdRef.current += 1;
    isDirtyRef.current = true;

    const baseChart = chartRef.current;
    const nextChart = {
      ...(baseChart || {}),
      performance: performanceId,
      venue: venueId,
      ...updates,
    } as SeatingChart;

    chartRef.current = nextChart;

    if (updates.assignments) {
      optimisticAssignmentsRef.current = updates.assignments;
      setOptimisticAssignments(updates.assignments);
    }

    dirtyPayloadRef.current = {
      ...(dirtyPayloadRef.current || {}),
      ...updates,
      performance: performanceId,
      venue: venueId,
    };

    setChart(nextChart);
    setIsDirty(lastEditIdRef.current > lastAppliedIdRef.current);
    setError(null);
    scheduleSync();

    return nextChart;
  }, [performanceId, scheduleSync, venue, venueId]);

  const assignSinger = async (seatKey: string, profileId: string) => {
    if (!venue || !performanceId) return;
    
    const newAssignments = { ...optimisticAssignmentsRef.current };
    
    // If we're assigning a singer, remove them from any other seat they might be in
    if (profileId) {
      Object.keys(newAssignments).forEach(key => {
        if (newAssignments[key] === profileId) {
          delete newAssignments[key];
        }
      });
      newAssignments[seatKey] = profileId;
    } else {
      // If profileId is empty, just remove the assignment for this seat
      delete newAssignments[seatKey];
    }

    queueChartSave({ assignments: newAssignments });
  };

  const updateChart = async (updates: Partial<SeatingChart>) => {
    if (!venue || !performanceId) return;
    return queueChartSave(updates);
  };

  const copyFromPerformance = async (sourceChart: any) => {
    return updateChart({
      assignments: sourceChart.assignments,
      layoutOverride: sourceChart.layoutOverride,
      sectionOrder: sourceChart.sectionOrder,
    });
  };

  const forceSave = useCallback(async () => {
    if (error && !isDirtyRef.current) {
      await fetchData();
      return;
    }

    if (lastEditIdRef.current <= lastAppliedIdRef.current && !dirtyPayloadRef.current) return;
    await syncWithServer();
  }, [error, fetchData, syncWithServer]);

  const isSaving = isSyncPending || activeRequestsCount > 0;

  return {
    chart,
    optimisticAssignments,
    activeProfiles,
    partCounts,
    rowCounts,
    suggestions,
    sections,
    isLoading,
    isSaving,
    isDirty,
    error,
    assignSinger,
    updateChart,
    copyFromPerformance,
    forceSave,
    refresh: fetchData,
  };
};
