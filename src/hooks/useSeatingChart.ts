import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { seatingService, type SeatingChart } from '../services/seatingService';
import { profileService, type Profile } from '../services/profileService';
import { type Venue } from '../services/venueService';
import {
  mergeSeatingResponseWithDirtyState,
  seatingContextId,
  seatingContextKey,
  shouldApplySeatingResponse,
  type SeatingSyncContext,
  filterProfilesByRsvpYes,
} from '../lib/seatingSync';
import { rosterService } from '../services/rosterService';
import { settingsService, getVoicePartsAndSections, type SeatingSettings, DEFAULT_SEATING_SETTINGS, DEFAULT_SECTIONS, DEFAULT_VOICE_PARTS, type VoicePartSettings, type SeatingFormationDef } from '../services/settingsService';

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
  const [activeChartId, setActiveChartId] = useState<string>('');
  const [charts, setCharts] = useState<SeatingChart[]>([]);
  
  const contextKey = `${seatingContextKey(performanceId, venueId)}-${activeChartId}`;
  const [chart, setChart] = useState<SeatingChart | null>(null);
  const [optimisticAssignments, setOptimisticAssignments] = useState<Record<string, string>>({});
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [seatingSettings, setSeatingSettings] = useState<SeatingSettings>(DEFAULT_SEATING_SETTINGS);
  const [voicePartSettings, setVoicePartSettings] = useState<VoicePartSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVenueId, setCurrentVenueId] = useState(venueId);
  const [currentPerformanceId, setCurrentPerformanceId] = useState(performanceId);
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

  // Sync performanceId and venueId when they change to trigger reloading charts list
  useEffect(() => {
    if (performanceId !== currentPerformanceId || venueId !== currentVenueId) {
      setCurrentPerformanceId(performanceId);
      setCurrentVenueId(venueId);
      setActiveChartId('');
    }
  }, [performanceId, venueId, currentPerformanceId, currentVenueId]);

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
          
          // Update in local list
          setCharts(prev => prev.map(c => c.id === updated.id ? updated : c));
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
          setCharts(prev => prev.map(c => c.id === merged.id ? merged : c));
          setError(null);
        }
      }
    } catch (err: unknown) {
      if (shouldTrackInCurrentUi() && requestId === lastEditIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to save seating chart');
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
    const contextChanged = loadedContextKeyRef.current !== contextKey;

    setIsLoading(true);

    if (contextChanged) {
      clearSaveTimer();
      resetDirtyTracking();
      setError(null);
    }

    try {
      const [profiles, roster, sSettings, vpSettings] = await Promise.all([
        profileService.getActiveProfiles(), // Filtered for Active (Current/Future)
        rosterService.getEventRoster(performanceId),
        settingsService.getSeatingSettings(),
        getVoicePartsAndSections(),
      ]);

      let loadedCharts = await seatingService.getChartsForPerformance(performanceId, venueId || null);
      
      // Auto-create default chart if none exist
      if (loadedCharts.length === 0 && performanceId && venueId) {
        const defaultChart = await seatingService.saveChart({
          performance: performanceId,
          venue: venueId,
          name: 'Main Seating Chart',
          formationId: sSettings.defaultFormationId,
          assignments: {},
          layoutOverride: null,
        });
        loadedCharts = [defaultChart];
      }

      setCharts(loadedCharts);

      const activeChart = loadedCharts.find(c => c.id === activeChartId) || loadedCharts[0] || null;
      if (activeChart && activeChart.id !== activeChartId) {
        setActiveChartId(activeChart.id);
      }

      // Strictly filter for Active and RSVP'd Yes as per user request for seating chart
      const activeCurrent = filterProfilesByRsvpYes(profiles, roster);
      if (seatingContextId(currentContextRef.current) !== requestContextId) return;

      const mergedChart = !contextChanged && isDirtyRef.current && dirtyPayloadRef.current
        ? mergeSeatingResponseWithDirtyState(
          activeChart,
          dirtyPayloadRef.current,
          optimisticAssignmentsRef.current,
          performanceId,
          venueId,
        )
        : activeChart;
      const assignments = mergedChart?.assignments || {};

      setChart(mergedChart);
      chartRef.current = mergedChart;
      optimisticAssignmentsRef.current = assignments;
      setOptimisticAssignments(assignments);
      setActiveProfiles(activeCurrent);
      setAllProfiles(profiles);
      setSeatingSettings(sSettings);
      setVoicePartSettings(vpSettings);
      setError(null);
      loadedContextKeyRef.current = contextKey;
    } catch (err: unknown) {
      if (seatingContextId(currentContextRef.current) === requestContextId) {
        setError(err instanceof Error ? err.message : 'Failed to fetch seating data');
      }
    } finally {
      if (seatingContextId(currentContextRef.current) === requestContextId) {
        setIsLoading(false);
      }
    }
  }, [clearSaveTimer, contextKey, currentContext, performanceId, resetDirtyTracking, venueId, activeChartId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rowCounts = useMemo(() => {
    return chart?.layoutOverride || venue?.rowCounts || [];
  }, [chart, venue]);

  const currentFormation = useMemo((): SeatingFormationDef => {
    const fId = chart?.formationId || seatingSettings.defaultFormationId;
    const found = seatingSettings.formations.find((f: SeatingFormationDef) => f.id === fId);
    return found || seatingSettings.formations[0] || DEFAULT_SEATING_SETTINGS.formations[0];
  }, [chart?.formationId, seatingSettings]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const order = currentFormation?.sectionOrder || [];
    const hasOrder = order.length > 0;

    if (currentFormation?.isVoicePartLayout) {
      const parts = voicePartSettings?.voiceParts && voicePartSettings.voiceParts.length > 0
        ? voicePartSettings.voiceParts
        : DEFAULT_VOICE_PARTS;
      parts.forEach(vp => {
        if (!hasOrder || order.includes(vp.label)) {
          counts[vp.label] = 0;
        }
      });
      
      activeProfiles.forEach(p => {
        if (!hasOrder || order.includes(p.voicePart)) {
          if (counts[p.voicePart] !== undefined) {
            counts[p.voicePart]++;
          } else if (!hasOrder) {
            counts[p.voicePart] = 1;
          }
        }
      });
    } else {
      const sections = voicePartSettings?.sections && voicePartSettings.sections.length > 0
        ? voicePartSettings.sections
        : DEFAULT_SECTIONS;
      const vParts = voicePartSettings?.voiceParts && voicePartSettings.voiceParts.length > 0
        ? voicePartSettings.voiceParts
        : DEFAULT_VOICE_PARTS;
      sections.forEach(s => {
        if (!hasOrder || order.includes(s.code)) {
          counts[s.code] = 0;
        }
      });
      
      activeProfiles.forEach(p => {
        const voicePart = vParts.find(vp => vp.label === p.voicePart);
        const sectionCode = voicePart?.sectionCode || (p.voicePart && p.voicePart[0]);
        if (!hasOrder || order.includes(sectionCode)) {
          if (counts[sectionCode] !== undefined) {
            counts[sectionCode]++;
          } else if (!hasOrder) {
            counts[sectionCode] = 1;
          }
        }
      });
    }
    return counts;
  }, [activeProfiles, voicePartSettings, currentFormation]);

  const formationType = useMemo((): 'Column' | 'Row' => {
    return currentFormation.strategy === 'horizontal_row' ? 'Row' : 'Column';
  }, [currentFormation]);

  const sectionOrder = useMemo((): string[] => {
    return currentFormation.sectionOrder;
  }, [currentFormation]);

  const suggestions = useMemo(() => {
    return seatingService.calculateAutoPaint(rowCounts, sectionCounts, sectionOrder, currentFormation.strategy);
  }, [rowCounts, sectionCounts, sectionOrder, currentFormation.strategy]);

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

  const assignSinger = async (seatKey: string, profileId: string, fromSeatKey?: string) => {
    if (!venue || !performanceId) return;
    
    const newAssignments = { ...optimisticAssignmentsRef.current };
    
    if (profileId) {
      // If target seat is already occupied by a different singer and we dragged from another seat:
      if (fromSeatKey && newAssignments[seatKey] && newAssignments[seatKey] !== profileId) {
        const occupantId = newAssignments[seatKey];
        newAssignments[fromSeatKey] = occupantId; // Move occupant to the source seat (Swap!)
      } else {
        // Normal duplicate prevention (remove singer from any other seat)
        Object.keys(newAssignments).forEach(key => {
          if (newAssignments[key] === profileId) {
            delete newAssignments[key];
          }
        });
      }
      newAssignments[seatKey] = profileId;
    } else {
      // Unassign target seat
      delete newAssignments[seatKey];
    }

    queueChartSave({ assignments: newAssignments });
  };

  const updateChart = async (updates: Partial<SeatingChart>) => {
    if (!venue || !performanceId) return;
    return queueChartSave(updates);
  };

  const copyFromPerformance = async (sourceChart: SeatingChart) => {
    return updateChart({
      assignments: sourceChart.assignments,
      layoutOverride: sourceChart.layoutOverride,
      formationId: sourceChart.formationId,
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

  const createChart = async (name: string) => {
    if (!venue || !performanceId) return;
    const maxSortOrder = (charts || []).reduce((max, c) => Math.max(max, c.sortOrder || 0), 0);
    const newChart = await seatingService.saveChart({
      performance: performanceId,
      venue: venueId,
      name,
      formationId: seatingSettings.defaultFormationId,
      assignments: {},
      layoutOverride: null,
      sortOrder: maxSortOrder + 1,
    });
    await fetchData();
    setActiveChartId(newChart.id);
    return newChart;
  };

  const renameChart = async (id: string, name: string) => {
    await seatingService.saveChart({ id, name } as Partial<SeatingChart>);
    await fetchData();
  };

  const deleteChart = async (id: string) => {
    await seatingService.deleteChart(id);
    if (activeChartId === id) {
      setActiveChartId('');
    }
    await fetchData();
  };

  const reorderCharts = async (orderedIds: string[]) => {
    try {
      await seatingService.reorderCharts(orderedIds);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reorder seating charts');
    }
  };

  const isSaving = isSyncPending || activeRequestsCount > 0;

  return {
    chart,
    charts,
    activeChartId,
    setActiveChartId,
    createChart,
    renameChart,
    deleteChart,
    reorderCharts,
    optimisticAssignments,
    activeProfiles,
    allProfiles,
    sectionCounts,
    rowCounts,
    suggestions,
    formationType,
    sectionOrder,
    currentFormation,
    sections: (voicePartSettings?.sections && voicePartSettings.sections.length > 0) ? voicePartSettings.sections : DEFAULT_SECTIONS,
    voiceParts: (voicePartSettings?.voiceParts && voicePartSettings.voiceParts.length > 0) ? voicePartSettings.voiceParts : DEFAULT_VOICE_PARTS,
    seatingSettings,
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
