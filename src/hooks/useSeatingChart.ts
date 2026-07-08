import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { seatingService, type SeatingChart } from '../services/seatingService';
import { profileService } from '../services/profileService';
import { type Venue } from '../services/venueService';
import {
  mergeSeatingResponseWithDirtyState,
  seatingContextKey,
  shouldApplySeatingResponse,
  type SeatingSyncContext,
  filterProfilesByRsvpYes,
} from '../lib/seatingSync';
import { rosterService } from '../services/rosterService';
import {
  settingsService,
  getVoicePartsAndSections,
  DEFAULT_SEATING_SETTINGS,
  DEFAULT_SECTIONS,
  DEFAULT_VOICE_PARTS,
  type SeatingFormationDef,
} from '../services/settingsService';

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
  const queryClient = useQueryClient();

  // ── UI state ──
  const [activeChartId, setActiveChartId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── Auto-save / dirty tracking refs ──
  const chartRef = useRef<SeatingChart | null>(null);
  const dirtyPayloadRef = useRef<Partial<SeatingChart> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const syncSequenceRef = useRef(0);
  const lastEditIdRef = useRef(0);
  const lastAppliedIdRef = useRef(0);
  const didAutoCreateRef = useRef<string | null>(null);
  const currentContextRef = useRef<SeatingSyncContext>({
    performanceId,
    venueId,
    sessionId: 0,
  });
  const syncWithServerRef = useRef<(options?: SyncOptions) => Promise<void>>(async () => undefined);

  // ── Queries ──
  const contextKey = `${seatingContextKey(performanceId, venueId)}-${activeChartId}`;

  const dataQuery = useQuery({
    queryKey: queryKeys.seating.data(performanceId, venueId),
    queryFn: async () => {
      const [profiles, roster, sSettings, vpSettings] = await Promise.all([
        profileService.getActiveProfiles(),
        rosterService.getEventRoster(performanceId),
        settingsService.getSeatingSettings(),
        getVoicePartsAndSections(),
      ]);

      const loadedCharts = await seatingService.getChartsForPerformance(
        performanceId,
        venueId || null
      );

      return {
        profiles,
        roster,
        settings: sSettings,
        voiceParts: {
          sections: vpSettings.sections,
          voiceParts: vpSettings.voiceParts.filter((vp) => {
            const sec = vpSettings.sections.find((s) => s.code === vp.sectionCode);
            return !sec?.trackOnly;
          }),
        },
        charts: loadedCharts,
      };
    },
    enabled: !!performanceId,
    staleTime: 30_000,
  });

  // ── Derived data ──
  const charts = useMemo(() => dataQuery.data?.charts ?? [], [dataQuery.data?.charts]);
  const allProfiles = useMemo(() => dataQuery.data?.profiles ?? [], [dataQuery.data?.profiles]);
  const seatingSettings = dataQuery.data?.settings ?? DEFAULT_SEATING_SETTINGS;
  const voicePartSettings = dataQuery.data?.voiceParts ?? null;
  const isLoading = dataQuery.isLoading;
  const queryError = dataQuery.error;

  useEffect(() => {
    if (queryError instanceof Error && !isDirtyRef.current) {
      setError(queryError.message);
    }
  }, [queryError]);

  // Active chart selection
  useEffect(() => {
    if (charts.length === 0) return;
    const activeChart = charts.find((c) => c.id === activeChartId) ?? charts[0] ?? null;
    if (activeChart && activeChart.id !== activeChartId) {
      setActiveChartId(activeChart.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeChartId intentionally omitted so user selection is not overridden
  }, [charts]);

  // Active profiles derived from roster filter. Excludes profiles assigned strictly to "Learning Track Only" voice parts (so they don't occupy seats).
  const activeProfiles = useMemo(() => {
    const rsvpYes = filterProfilesByRsvpYes(allProfiles, dataQuery.data?.roster ?? []);
    if (!voicePartSettings) return rsvpYes;
    const allowedLabels = new Set(voicePartSettings.voiceParts.map((vp) => vp.label));
    return rsvpYes.filter((p) => !p.voicePart || allowedLabels.has(p.voicePart));
  }, [allProfiles, dataQuery.data?.roster, voicePartSettings]);

  // ── Chart state (server data + optimistic local state) ──
  const activeChart = useMemo(
    () => charts.find((c) => c.id === activeChartId) ?? charts[0] ?? null,
    [charts, activeChartId]
  );

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const [chart, setChart] = useState<SeatingChart | null>(null);

  useEffect(() => {
    if (!activeChart) {
      chartRef.current = null;
      setChart(null);
      return;
    }

    if (!isDirtyRef.current || !dirtyPayloadRef.current) {
      chartRef.current = activeChart;
      setChart(activeChart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watch only id + assignments so unrelated activeChart fields do not re-sync local state
  }, [activeChart?.id, activeChart?.assignments]);

  // ── Mutations ──
  // saveChartMutation intentionally omits onError because it is also driven by the debounced
  // syncWithServer pipeline, which applies its own context-aware error handling. User-triggered
  // callers (createChart, renameChart) catch errors themselves.
  const saveChartMutation = useMutation({
    mutationFn: (chartData: Partial<SeatingChart>) => seatingService.saveChart(chartData),
  });

  const deleteChartMutation = useMutation({
    mutationFn: (chartId: string) => seatingService.deleteChart(chartId),
    onSuccess: (_data, deletedId) => {
      if (activeChartId === deletedId) setActiveChartId('');
      queryClient.invalidateQueries({ queryKey: queryKeys.seating.data(performanceId, venueId) });
    },
    onError: (err: Error) => setError(err.message),
  });

  const reorderChartsMutation = useMutation({
    mutationFn: (orderedIds: string[]) => seatingService.reorderCharts(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seating.data(performanceId, venueId) });
    },
    onError: (err: Error) => setError(err.message),
  });

  const refresh = useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.seating.data(performanceId, venueId) }),
    [queryClient, performanceId, venueId]
  );

  // Auto-create default chart when none exist. Guarded by a ref so the effect cannot fire twice
  // for the same performance+venue while the create+invalidate round trip is in flight.
  useEffect(() => {
    if (!performanceId || !venueId) return;
    const loaded = dataQuery.data?.charts;
    if (!loaded || loaded.length > 0) return;
    const guardKey = `${performanceId}::${venueId}`;
    if (didAutoCreateRef.current === guardKey) return;
    didAutoCreateRef.current = guardKey;

    saveChartMutation
      .mutateAsync({
        performance: performanceId,
        venue: venueId,
        name: 'Main Seating Chart',
        formationId: dataQuery.data?.settings?.defaultFormationId,
        assignments: {},
        layoutOverride: null,
      })
      .then(() => refresh())
      .catch(() => {
        didAutoCreateRef.current = null;
      });
  }, [
    dataQuery.data?.charts,
    dataQuery.data?.settings?.defaultFormationId,
    performanceId,
    venueId,
    refresh,
    saveChartMutation,
  ]);

  // ── Session context ──
  const [contextState, setContextState] = useState({ key: contextKey, sessionId: 0 });

  const currentSessionId =
    contextState.key === contextKey ? contextState.sessionId : contextState.sessionId + 1;

  const currentContext = useMemo<SeatingSyncContext>(
    () => ({
      performanceId,
      venueId,
      sessionId: currentSessionId,
    }),
    [currentSessionId, performanceId, venueId]
  );

  useLayoutEffect(() => {
    currentContextRef.current = currentContext;

    if (contextState.key !== contextKey) {
      setContextState({ key: contextKey, sessionId: currentSessionId });
    }
  }, [contextKey, contextState.key, currentContext, currentSessionId]);

  // ── Auto-save ──
  const clearSaveTimer = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const syncWithServer = useCallback(
    async (options: SyncOptions = {}) => {
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
      const shouldTrackInCurrentUi = () =>
        options.updateCurrentState !== false &&
        shouldApplySeatingResponse(requestContext, currentContextRef.current);
      const trackInCurrentUi = shouldTrackInCurrentUi();

      if (trackInCurrentUi) {
        clearSaveTimer();
        setError(null);
      }

      try {
        const updated = await saveChartMutation.mutateAsync({
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
            dirtyPayloadRef.current = null;
            isDirtyRef.current = false;
            setIsDirty(false);

            setChart(updated);
            setError(null);
          } else {
            const merged = mergeSeatingResponseWithDirtyState(
              updated,
              dirtyPayloadRef.current ?? {},
              chartRef.current?.assignments ?? {},
              performanceId,
              venueId
            );

            chartRef.current = merged;
            setChart(merged);
            setError(null);
          }
        }
      } catch (err: unknown) {
        if (shouldTrackInCurrentUi() && requestId === lastEditIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to save seating chart');
        }
      } finally {
        if (shouldTrackInCurrentUi() && isDirtyRef.current && lastEditIdRef.current !== requestId) {
          saveTimeoutRef.current = setTimeout(() => {
            saveTimeoutRef.current = null;
            void syncWithServerRef.current();
          }, 0);
        }
      }
    },
    [clearSaveTimer, currentContext.sessionId, performanceId, saveChartMutation, venueId]
  );

  useEffect(() => {
    syncWithServerRef.current = syncWithServer;
  }, [syncWithServer]);

  // Flush dirty state on unmount or context change
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentContext only changes alongside contextKey, so capturing it here is safe
  }, [contextKey]);

  const scheduleSync = useCallback(
    (delay = 1000) => {
      clearSaveTimer();
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        void syncWithServerRef.current();
      }, delay);
    },
    [clearSaveTimer]
  );

  useEffect(() => {
    return () => clearSaveTimer();
  }, [clearSaveTimer]);

  const queueChartSave = useCallback(
    (updates: Partial<SeatingChart>) => {
      if (!venue || !performanceId) return undefined;

      lastEditIdRef.current += 1;
      isDirtyRef.current = true;
      setIsDirty(true);

      const baseChart = chartRef.current;
      const nextChart = {
        ...(baseChart ?? {}),
        performance: performanceId,
        venue: venueId,
        ...updates,
      } as SeatingChart;

      chartRef.current = nextChart;

      dirtyPayloadRef.current = {
        ...(dirtyPayloadRef.current ?? {}),
        ...updates,
        performance: performanceId,
        venue: venueId,
      };

      setChart(nextChart);
      setError(null);
      scheduleSync();

      return nextChart;
    },
    [performanceId, scheduleSync, venue, venueId]
  );

  // ── Actions ──
  const assignSinger = useCallback(
    async (seatKey: string, profileId: string, fromSeatKey?: string) => {
      if (!venue || !performanceId) return;

      const newAssignments: Record<string, string> = { ...(chartRef.current?.assignments ?? {}) };

      if (profileId) {
        if (fromSeatKey && newAssignments[seatKey] && newAssignments[seatKey] !== profileId) {
          const occupantId = newAssignments[seatKey];
          newAssignments[fromSeatKey] = occupantId;
        } else {
          Object.keys(newAssignments).forEach((key) => {
            if (newAssignments[key] === profileId) {
              delete newAssignments[key];
            }
          });
        }
        newAssignments[seatKey] = profileId;
      } else {
        delete newAssignments[seatKey];
      }

      queueChartSave({ assignments: newAssignments });
    },
    [performanceId, queueChartSave, venue]
  );

  const updateChart = useCallback(
    async (updates: Partial<SeatingChart>) => {
      if (!venue || !performanceId) return;
      return queueChartSave(updates);
    },
    [performanceId, queueChartSave, venue]
  );

  const copyFromPerformance = useCallback(
    async (sourceChart: SeatingChart) => {
      return updateChart({
        assignments: sourceChart.assignments,
        layoutOverride: sourceChart.layoutOverride,
        formationId: sourceChart.formationId,
      });
    },
    [updateChart]
  );

  const forceSave = useCallback(async () => {
    if (errorRef.current && !isDirtyRef.current) {
      await refresh();
      return;
    }
    if (lastEditIdRef.current <= lastAppliedIdRef.current && !dirtyPayloadRef.current) return;
    await syncWithServer();
  }, [refresh, syncWithServer]);

  const createChart = useCallback(
    async (name: string) => {
      if (!venue || !performanceId) return;
      const maxSortOrder = (charts ?? []).reduce((max, c) => Math.max(max, c.sortOrder ?? 0), 0);
      try {
        const newChart = await saveChartMutation.mutateAsync({
          performance: performanceId,
          venue: venueId,
          name,
          formationId: seatingSettings.defaultFormationId,
          assignments: {},
          layoutOverride: null,
          sortOrder: maxSortOrder + 1,
        });
        await refresh();
        setActiveChartId(newChart.id);
        return newChart;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create seating chart');
        throw err;
      }
    },
    [
      charts,
      performanceId,
      refresh,
      saveChartMutation,
      seatingSettings.defaultFormationId,
      venue,
      venueId,
    ]
  );

  const renameChart = useCallback(
    async (id: string, name: string) => {
      try {
        await saveChartMutation.mutateAsync({ id, name } as Partial<SeatingChart>);
        await refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to rename seating chart');
        throw err;
      }
    },
    [refresh, saveChartMutation]
  );

  const deleteChart = useCallback(
    async (id: string) => {
      await deleteChartMutation.mutateAsync(id);
    },
    [deleteChartMutation]
  );

  const reorderCharts = useCallback(
    async (orderedIds: string[]) => {
      await reorderChartsMutation.mutateAsync(orderedIds);
    },
    [reorderChartsMutation]
  );

  // ── Computed values ──
  const rowCounts = useMemo(() => chart?.layoutOverride ?? venue?.rowCounts ?? [], [chart, venue]);

  const currentFormation = useMemo((): SeatingFormationDef => {
    const fId = chart?.formationId ?? seatingSettings.defaultFormationId;
    const found = seatingSettings.formations.find((f: SeatingFormationDef) => f.id === fId);
    return found ?? seatingSettings.formations[0] ?? DEFAULT_SEATING_SETTINGS.formations[0];
  }, [chart?.formationId, seatingSettings]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const order = currentFormation?.sectionOrder ?? [];
    const hasOrder = order.length > 0;

    if (currentFormation?.isVoicePartLayout) {
      const parts =
        voicePartSettings?.voiceParts && voicePartSettings.voiceParts.length > 0
          ? voicePartSettings.voiceParts
          : DEFAULT_VOICE_PARTS;
      parts.forEach((vp) => {
        if (!hasOrder || order.includes(vp.label)) {
          counts[vp.label] = 0;
        }
      });

      activeProfiles.forEach((p) => {
        if (!hasOrder || order.includes(p.voicePart)) {
          if (counts[p.voicePart] !== undefined) {
            counts[p.voicePart]++;
          } else if (!hasOrder) {
            counts[p.voicePart] = 1;
          }
        }
      });
    } else {
      const sections =
        voicePartSettings?.sections && voicePartSettings.sections.length > 0
          ? voicePartSettings.sections
          : DEFAULT_SECTIONS;
      const vParts =
        voicePartSettings?.voiceParts && voicePartSettings.voiceParts.length > 0
          ? voicePartSettings.voiceParts
          : DEFAULT_VOICE_PARTS;
      sections.forEach((s) => {
        if (!hasOrder || order.includes(s.code)) {
          counts[s.code] = 0;
        }
      });

      activeProfiles.forEach((p) => {
        const voicePart = vParts.find((vp) => vp.label === p.voicePart);
        const sectionCode = voicePart?.sectionCode ?? (p.voicePart && p.voicePart[0]);
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

  const formationType = useMemo(
    (): 'Column' | 'Row' => (currentFormation.strategy === 'horizontal_row' ? 'Row' : 'Column'),
    [currentFormation]
  );

  const sectionOrder = useMemo((): string[] => currentFormation.sectionOrder, [currentFormation]);

  const suggestions = useMemo(
    () =>
      seatingService.calculateAutoPaint(
        rowCounts,
        sectionCounts,
        sectionOrder,
        currentFormation.strategy
      ),
    [rowCounts, sectionCounts, sectionOrder, currentFormation.strategy]
  );

  // ── Derived status ──
  const isSaving =
    saveChartMutation.isPending || deleteChartMutation.isPending || reorderChartsMutation.isPending;

  return {
    chart,
    charts,
    activeChartId,
    setActiveChartId,
    createChart,
    renameChart,
    deleteChart,
    reorderCharts,
    optimisticAssignments: chart?.assignments ?? {},
    activeProfiles,
    allProfiles,
    sectionCounts,
    rowCounts,
    suggestions,
    formationType,
    sectionOrder,
    currentFormation,
    sections:
      voicePartSettings?.sections && voicePartSettings.sections.length > 0
        ? voicePartSettings.sections
        : DEFAULT_SECTIONS,
    voiceParts:
      voicePartSettings?.voiceParts && voicePartSettings.voiceParts.length > 0
        ? voicePartSettings.voiceParts
        : DEFAULT_VOICE_PARTS,
    seatingSettings,
    isLoading,
    isSaving,
    isDirty,
    error,
    assignSinger,
    updateChart,
    copyFromPerformance,
    forceSave,
    refresh,
  };
};
