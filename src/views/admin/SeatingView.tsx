import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { SeatingGrid } from '../../components/admin/SeatingGrid';
import { SavingIndicator } from '../../components/admin/SavingIndicator';
import { SeatingTextList } from '../../components/admin/SeatingTextList';
import { UnassignedPrintSection } from '../../components/admin/UnassignedPrintSection';
import { SeatingBottomDock } from '../../components/admin/SeatingBottomDock';
import { SeatingFormationsEditor } from '../../components/admin/SeatingFormationsEditor';
import { ChartCopyDropdown } from '../../components/admin/ChartCopyDropdown';
import { seatingService, type SeatingChart } from '../../services/seatingService';
import { AppCard } from '../../components/common/AppCard';
import { Modal, Select, Button, Input } from '../../components/ui';
import { useDialog } from '../../contexts/DialogContext';
import type { Profile, ProfileInput } from '../../services/profileService';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { SingerModal } from '../../components/admin/SingerModal';
import { SingerLookupModal } from '../../components/admin/SingerLookupModal';
import { profileService } from '../../services/profileService';
import { rosterService } from '../../services/rosterService';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';

const getSingersListPosition = (): 'side' | 'bottom' | 'hidden' => 'bottom';

export default function SeatingView() {
  const dialog = useDialog();
  const { timezone } = useChoirSettings();
  const [searchParams] = useSearchParams();
  const { performances } = useEvents();
  const { venues, editVenue } = useVenues();
  const hasDefaultedRef = useRef(false);

  const [performanceId, setPerformanceId] = useState('');
  const [activeTab, setActiveTab] = useState<'chart' | 'templates'>('chart');

  useEffect(() => {
    if (performances.length > 0 && !performanceId && !hasDefaultedRef.current) {
      const urlEventId = searchParams.get('eventId');
      const resolved = resolveInitialEventId(performances, urlEventId);
      if (resolved) {
        setPerformanceId(resolved);
        hasDefaultedRef.current = true;
      }
    }
  }, [performances, performanceId, searchParams]);

  const [venueId, setVenueId] = useState('');
  const { data: allCharts = [] } = useQuery({
    queryKey: queryKeys.seating.all,
    queryFn: () => seatingService.getAllCharts(),
    enabled: !!performanceId,
  });
  const [printMode, setPrintMode] = useState<'visual' | 'text'>('visual');
  const [showVoicePartsInList, setShowVoicePartsInList] = useState(true);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const isWideLayout = isFullscreen;
  const singersListPosition = getSingersListPosition();

  const workspaceRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!workspaceRef.current) return;
    if (!document.fullscreenElement) {
      workspaceRef.current.requestFullscreen().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error attempting to enable fullscreen: ${msg}`);
      });
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const selectedVenue = venues.find((v) => v.id === venueId) || null;
  const {
    chart,
    optimisticAssignments,
    activeProfiles,
    rowCounts,
    suggestions,
    sections,
    voiceParts,
    seatingSettings,
    isLoading,
    isSaving,
    isDirty,
    error: saveError,
    assignSinger,
    updateChart,
    copyFromPerformance,
    forceSave,
    refresh,
    currentFormation,
    charts,
    activeChartId,
    setActiveChartId,
    createChart,
    renameChart,
    deleteChart,
    reorderCharts,
  } = useSeatingChart(performanceId, selectedVenue);

  const [isSingerModalOpen, setIsSingerModalOpen] = useState(false);
  const [isSingerLookupOpen, setIsSingerLookupOpen] = useState(false);

  const [isNewChartModalOpen, setIsNewChartModalOpen] = useState(false);
  const [newChartName, setNewChartName] = useState('');

  const [isRenameChartModalOpen, setIsRenameChartModalOpen] = useState(false);
  const [renameChartName, setRenameChartName] = useState('');
  const [chartToRename, setChartToRename] = useState<SeatingChart | null>(null);

  const handleLookupSingerSelect = async (profile: Profile) => {
    if (performanceId && profile.id) {
      await rosterService.updateRSVP(performanceId, profile.id, 'Yes');
      await refresh();
    }
  };

  const handleAddSingerSave = async (data: ProfileInput) => {
    const newProfile = await profileService.createProfile(data);
    if (performanceId && newProfile?.id) {
      await rosterService.updateRSVP(performanceId, newProfile.id, 'Yes');
    }
    await refresh();
  };

  const handleRemoveRsvp = async (profileId: string, name: string) => {
    const confirmed = await dialog.confirm({
      title: 'Remove from Performance Roster?',
      message: `Change RSVP for ${name} to "No" (Not Attending) for this performance? This will remove them from the seating chart shelf.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) return;

    await rosterService.updateRSVP(performanceId, profileId, 'No');
    await refresh();
  };

  const hasLayoutOverride = (() => {
    const layoutOverride = chart?.layoutOverride;
    if (!selectedVenue || !layoutOverride) return false;
    if (layoutOverride.length !== selectedVenue.rowCounts.length) return true;
    return layoutOverride.some((count, idx) => count !== selectedVenue.rowCounts[idx]);
  })();

  const [saveFeedback, setSaveFeedback] = useState(false);
  const wasSavingRef = useRef(false);

  useEffect(() => {
    if (performanceId) {
      const perf = performances.find((p) => p.id === performanceId);
      if (perf && perf.venue) {
        setVenueId(perf.venue);
      }
    }
  }, [performanceId, performances]);

  useEffect(() => {
    if (wasSavingRef.current && !isSaving && !saveError) {
      setSaveFeedback(true);
      const timeout = setTimeout(() => setSaveFeedback(false), 2000);
      wasSavingRef.current = false;
      return () => clearTimeout(timeout);
    }

    if (isSaving) {
      wasSavingRef.current = true;
    }
  }, [isSaving, saveError]);

  const groupedRows = useMemo(() => {
    if (!rowCounts.length) return [];

    const profileMap: Record<string, Profile> = {};
    activeProfiles.forEach((p) => (profileMap[p.id] = p));

    return rowCounts.map((seatCount, rowIndex) => {
      const row: (Profile | null)[] = [];
      for (let seatIndex = 0; seatIndex < seatCount; seatIndex++) {
        const profileId = optimisticAssignments[`${rowIndex}-${seatIndex}`];
        row.push(profileId ? profileMap[profileId] : null);
      }
      return row;
    });
  }, [rowCounts, activeProfiles, optimisticAssignments]);

  const unassignedCount = useMemo(() => {
    const assignedIds = new Set(Object.values(optimisticAssignments));
    const order = currentFormation?.sectionOrder || [];
    const hasOrder = order.length > 0;

    return activeProfiles.filter((p) => {
      if (assignedIds.has(p.id)) return false;
      if (!hasOrder) return true;

      if (currentFormation?.isVoicePartLayout) {
        return order.some((key) => key.toLowerCase() === (p.voicePart || '').trim().toLowerCase());
      }

      const vpDef = voiceParts.find(
        (vp) => vp.label === p.voicePart || vp.fullName === p.voicePart
      );
      let sectionCode = vpDef?.sectionCode;
      if (!sectionCode) {
        sectionCode = (p.voicePart || '').trim().charAt(0).toUpperCase() || undefined;
      }
      return sectionCode ? order.includes(sectionCode) : false;
    }).length;
  }, [activeProfiles, optimisticAssignments, currentFormation, voiceParts]);

  const handlePrint = () => {
    window.print();
  };

  const handleManualSave = async () => {
    if (isSaving || isDirty || saveError) {
      wasSavingRef.current = true;
      await forceSave();
      return;
    }

    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleClear = async () => {
    const shouldClear = await dialog.confirm({
      title: 'Clear Assignments',
      message: 'Clear all singer assignments for this chart?',
      confirmLabel: 'Clear',
      variant: 'danger',
    });
    if (!shouldClear) return;

    await updateChart({ assignments: {} });
  };

  const handleReset = async () => {
    const shouldReset = await dialog.confirm({
      title: 'Reset Seating Chart',
      message:
        'REALLY RESET EVERYTHING? This will clear assignments, custom row counts, and formations.',
      confirmLabel: 'Reset',
      variant: 'danger',
    });
    if (!shouldReset) return;

    await updateChart({
      assignments: {},
      layoutOverride: null,
      formationId: seatingSettings.defaultFormationId,
    });
  };

  const handleCopy = async (sourceChartId: string) => {
    const source = allCharts.find((c) => c.id === sourceChartId);
    if (!source) return;

    const shouldCopy = await dialog.confirm({
      title: 'Copy Seating Chart',
      message: `Copy seating layout and assignments from "${source.expand?.performance?.title || 'Another Performance'}"?`,
      confirmLabel: 'Copy',
    });
    if (!shouldCopy) return;

    await copyFromPerformance(source);
  };

  const chartList = charts || [];
  const activeChart = chartList.find((c) => c.id === activeChartId) || null;
  const activeChartIndex = chartList.findIndex((c) => c.id === activeChartId);
  const canMoveChartEarlier = activeChartIndex > 0;
  const canMoveChartLater = activeChartIndex >= 0 && activeChartIndex < chartList.length - 1;

  const moveActiveChart = async (direction: -1 | 1) => {
    if (activeChartIndex < 0) return;
    const targetIndex = activeChartIndex + direction;
    if (targetIndex < 0 || targetIndex >= chartList.length) return;

    const orderedCharts = [...chartList];
    const [movedChart] = orderedCharts.splice(activeChartIndex, 1);
    orderedCharts.splice(targetIndex, 0, movedChart);
    await reorderCharts(orderedCharts.map((c) => c.id));
  };

  return (
    <div
      className={`print-landscape flex w-full flex-col gap-4 bg-transparent px-0 py-2 ${isWideLayout ? '!bg-bg !mx-0 w-full max-w-none !p-4' : ''}`}
      ref={workspaceRef}
      data-print-mode={printMode}
    >
      {/* Header Area */}
      <div className="no-print flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Seating Chart</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Assign singers to seats, manage formations, and print seating layouts
        </p>
      </div>

      {/* Tabs / Actions Navigation Bar */}
      <div className="no-print flex w-full flex-row items-center justify-between border-b border-slate-200 pb-px">
        <div className="flex gap-3 md:gap-6">
          <button
            type="button"
            className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'chart'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('chart')}
          >
            Chart
          </button>
          <button
            type="button"
            className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'templates'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            Formations
          </button>
        </div>
      </div>

      {/* Filter Deck (Chart tab only) */}
      {activeTab === 'chart' && (
        <div className="no-print grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 md:grid-cols-2 xl:grid-cols-[0.8fr_1fr_1fr_1.6fr]">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Performance
            </label>
            <Select
              value={performanceId}
              onChange={(e) => setPerformanceId(e.target.value)}
              size="small"
              className="focus:!border-primary focus:!ring-primary focus:!ring-1"
            >
              <option value="">-- Select Performance --</option>
              {performances.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title ||
                    formatInTimezone(p.date, timezone, {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                    })}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Venue
            </label>
            <div className="flex items-center gap-2">
              <Select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                size="small"
                className="focus:!border-primary focus:!ring-primary focus:!ring-1"
              >
                <option value="">-- Select Venue --</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
              {hasLayoutOverride && (
                <button
                  onClick={async () => {
                    const confirmed = await dialog.confirm({
                      title: 'Update Master Venue Template?',
                      message: `Would you like to overwrite the master template for "${selectedVenue?.name}" with this performance's row configuration (${chart?.layoutOverride?.join(', ')})? This will affect new seating charts for this venue.`,
                      confirmLabel: 'Yes, Update Template',
                      cancelLabel: 'Cancel',
                    });
                    if (confirmed && selectedVenue) {
                      try {
                        await editVenue(selectedVenue.id, {
                          rowCounts: chart?.layoutOverride || undefined,
                        });
                        await dialog.showMessage({
                          title: 'Success',
                          message: `Successfully updated the master template for "${selectedVenue.name}".`,
                        });
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : String(err);
                        console.error('Failed to update venue', err);
                        await dialog.showMessage({
                          title: 'Error',
                          message: msg,
                        });
                      }
                    }
                  }}
                  className="border-primary bg-primary-light text-primary-deep hover:bg-primary/10 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 text-xs font-bold whitespace-nowrap shadow-sm transition-colors"
                  title={`Overwrite "${selectedVenue?.name}" default layout counts with this chart's current counts`}
                >
                  💾 Update
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Formation
            </label>
            <Select
              value={chart?.formationId || seatingSettings.defaultFormationId}
              onChange={async (e) => {
                const selectedId = e.target.value;
                const formation = seatingSettings.formations.find((f) => f.id === selectedId);
                if (!formation) return;

                const shouldChange = await dialog.confirm({
                  title: 'Change Formation',
                  message:
                    'Changing the formation logic will clear all current seating assignments. Do you want to proceed?',
                  confirmLabel: 'Change',
                  variant: 'danger',
                });
                if (!shouldChange) return;

                await updateChart({ formationId: selectedId, assignments: {} });
              }}
              size="small"
              className="focus:!border-primary focus:!ring-primary focus:!ring-1"
            >
              {seatingSettings.formations?.map((formation) => (
                <option key={formation.id} value={formation.id}>
                  {formation.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Chart
            </label>
            <div className="flex min-w-0 items-center gap-1">
              <Select
                aria-label="Select seating chart"
                value={activeChartId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setActiveChartId(e.target.value);
                  }
                }}
                size="small"
                className="focus:!border-primary focus:!ring-primary focus:!ring-1"
              >
                {chartList.map((c, index) => (
                  <option key={c.id} value={c.id}>{`${index + 1}. ${c.name}`}</option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => moveActiveChart(-1)}
                disabled={!canMoveChartEarlier}
                className="enabled:hover:border-primary enabled:hover:text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                title="Move chart earlier in concert order"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveActiveChart(1)}
                disabled={!canMoveChartLater}
                className="enabled:hover:border-primary enabled:hover:text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                title="Move chart later in concert order"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => setIsNewChartModalOpen(true)}
                className="border-primary bg-primary-light text-primary hover:bg-primary/10 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed text-lg font-extrabold shadow-sm transition-colors"
                title="Create new seating chart"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!activeChart) return;
                  setChartToRename(activeChart);
                  setRenameChartName(activeChart.name);
                  setIsRenameChartModalOpen(true);
                }}
                disabled={!activeChart}
                className="enabled:hover:border-primary enabled:hover:text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                title="Rename chart"
              >
                ✎
              </button>
              {chartList.length > 1 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeChart) return;
                    const confirmed = await dialog.confirm({
                      title: 'Delete Seating Chart?',
                      message: `Are you sure you want to delete "${activeChart.name}"? This cannot be undone.`,
                      confirmLabel: 'Delete',
                      variant: 'danger',
                    });
                    if (confirmed) {
                      await deleteChart(activeChart.id);
                    }
                  }}
                  disabled={!activeChart}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-[var(--color-danger-text)] shadow-sm transition-colors enabled:hover:border-[var(--color-danger-text)] disabled:cursor-not-allowed disabled:opacity-40"
                  title="Delete chart"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' ? (
        <SeatingFormationsEditor onSaveSuccess={refresh} />
      ) : performanceId && venueId ? (
        <>
          <div className="flex w-full min-w-0 flex-col items-start gap-4 sm:flex-row">
            <AppCard className="flex w-full min-w-0 flex-1 flex-col p-4">
              <div className="no-print seating-toolbar border-border bg-primary-light flex flex-row flex-wrap items-center justify-between gap-2 rounded-lg border p-1.5 px-3 shadow-sm">
                <div className="flex flex-row gap-1">
                  <Button variant="outline" size="small" onClick={handleClear}>
                    🧹 Clear
                  </Button>
                  <Button variant="danger" size="small" onClick={handleReset}>
                    💥 Reset
                  </Button>
                </div>

                <div className="no-print border-border bg-surface flex h-8 flex-row items-center gap-0.5 rounded-lg border p-0.5">
                  <button
                    onClick={() => setPrintMode('visual')}
                    className={`inline-flex h-[26px] min-h-[26px] items-center justify-center rounded-[calc(var(--radius-md)-2px)] px-2.5 text-xs font-medium tracking-wide ${printMode === 'visual' ? 'bg-primary text-[var(--bg,white)]' : 'text-muted bg-transparent'}`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setPrintMode('text')}
                    className={`inline-flex h-[26px] min-h-[26px] items-center justify-center rounded-[calc(var(--radius-md)-2px)] px-2.5 text-xs font-medium tracking-wide ${printMode === 'text' ? 'bg-primary text-[var(--bg,white)]' : 'text-muted bg-transparent'}`}
                  >
                    List
                  </button>
                </div>

                <div className="no-print flex flex-row flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className={`border-border inline-flex h-8 min-h-8 items-center justify-center gap-2 rounded-md border px-2.5 text-xs font-medium tracking-wide whitespace-nowrap ${isFullscreen ? 'bg-primary text-surface' : 'text-muted bg-surface'}`}
                  >
                    {isFullscreen ? 'Exit' : '🖥️ Full'}
                  </button>

                  {printMode === 'text' && (
                    <label className="text-muted ml-2 flex cursor-pointer items-center gap-1 text-[0.8125rem] leading-none font-semibold select-none">
                      <Input
                        type="checkbox"
                        checked={showVoicePartsInList}
                        onChange={(e) => setShowVoicePartsInList(e.target.checked)}
                        className="size-[15px] cursor-pointer"
                      />
                      <span>Show Voice Parts</span>
                    </label>
                  )}
                </div>

                <ChartCopyDropdown
                  allCharts={allCharts.filter((c) => c.venue === venueId)}
                  currentChartId={activeChartId || ''}
                  onCopy={handleCopy}
                />

                <Button variant="primary" size="small" onClick={handlePrint}>
                  <span aria-hidden="true">🖨️</span>
                  <span>Print</span>
                </Button>
                <div className="flex flex-row items-center gap-1">
                  <SavingIndicator isSaving={isSaving} error={saveError} />
                  <span className="text-muted mr-1 text-xs font-medium whitespace-nowrap">
                    Auto-saved
                  </span>
                  <button
                    onClick={handleManualSave}
                    className={`border-border inline-flex h-8 min-h-8 items-center justify-center gap-2 rounded-md border bg-transparent px-2.5 text-xs font-medium tracking-wide whitespace-nowrap ${
                      saveError
                        ? 'text-[var(--color-danger-text)]'
                        : saveFeedback
                          ? 'text-[var(--color-success-text)]'
                          : 'text-text'
                    }`}
                  >
                    {saveError
                      ? isDirty
                        ? 'Retry'
                        : 'Retry'
                      : isSaving
                        ? 'Saving...'
                        : saveFeedback
                          ? '✓ Saved'
                          : isDirty
                            ? 'Save'
                            : 'Save'}
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center p-8">
                  <p className="text-muted">Loading seating data...</p>
                </div>
              ) : selectedVenue?.isOpenSeating ? (
                <div className="flex flex-col items-center p-8 text-center">
                  <h3 className="text-headline">Open Seating</h3>
                  <p className="text-muted">
                    This venue is configured for open seating. No seating assignments are required.
                  </p>
                  {selectedVenue.address && (
                    <p className="mt-4">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedVenue.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted border-border inline-flex h-11 items-center justify-center gap-2 rounded-md border bg-transparent px-6 font-medium tracking-wide whitespace-nowrap"
                      >
                        📍 View Map
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex min-w-0 flex-col gap-6">
                  {printMode === 'visual' && (
                    <div className="no-print border-border bg-primary-light text-primary-deep rounded-md border p-2 text-center text-sm shadow-sm">
                      <strong>Editor Mode:</strong>{' '}
                      {singersListPosition === 'bottom' ? (
                        <span>
                          Drag singers from the <strong>bottom shelf</strong> below, or click an{' '}
                          <strong>empty seat</strong> to assign. Drag assigned singers to move or
                          swap them.
                          <span className="ml-2 font-bold text-[var(--color-danger-text)]">
                            👇 Scroll down to see unassigned singers!
                          </span>
                        </span>
                      ) : singersListPosition === 'side' ? (
                        <span>
                          Drag singers from the <strong>right sidebar</strong>, or click an{' '}
                          <strong>empty seat</strong> to assign. Drag assigned singers to move or
                          swap them.
                        </span>
                      ) : (
                        <span>
                          Click an <strong>empty seat</strong> to assign. Drag assigned singers to
                          move or swap them. (Singers list is currently hidden).
                        </span>
                      )}
                    </div>
                  )}
                  {printMode === 'visual' && (
                    <SeatingGrid
                      rowCounts={rowCounts}
                      assignments={optimisticAssignments}
                      suggestions={suggestions}
                      activeProfiles={activeProfiles}
                      sections={sections}
                      voiceParts={voiceParts}
                      onAssign={assignSinger}
                      onUpdateRowCounts={async (newRowCounts, newAssignments) => {
                        const updates: Partial<SeatingChart> = { layoutOverride: newRowCounts };
                        if (newAssignments) {
                          updates.assignments = newAssignments;
                        }
                        await updateChart(updates);
                      }}
                      isVoicePartLayout={currentFormation?.isVoicePartLayout}
                      sectionOrder={currentFormation?.sectionOrder}
                    />
                  )}

                  {!selectedVenue?.isOpenSeating &&
                    singersListPosition === 'bottom' &&
                    printMode === 'visual' && (
                      <SeatingBottomDock
                        activeProfiles={activeProfiles}
                        assignments={optimisticAssignments}
                        sections={sections}
                        voiceParts={voiceParts}
                        assignSinger={assignSinger}
                        onAddSinger={() => setIsSingerModalOpen(true)}
                        onLookupSinger={() => setIsSingerLookupOpen(true)}
                        onRemoveRsvp={handleRemoveRsvp}
                        isVoicePartLayout={currentFormation?.isVoicePartLayout}
                        sectionOrder={currentFormation?.sectionOrder}
                      />
                    )}

                  {printMode === 'text' && unassignedCount > 0 && (
                    <div className="no-print mb-4 rounded-md border border-[var(--color-danger-text)] bg-[var(--color-danger-bg)] p-4 text-center text-sm font-semibold text-[var(--color-danger-text)] shadow-sm">
                      ⚠️ You have {unassignedCount} unassigned singer
                      {unassignedCount > 1 ? 's' : ''} left. Switch to Grid view to assign them.
                    </div>
                  )}

                  {printMode === 'text' && (
                    <SeatingTextList rows={groupedRows} showVoiceParts={showVoicePartsInList} />
                  )}

                  {printMode === 'visual' && (
                    <UnassignedPrintSection
                      activeProfiles={activeProfiles}
                      assignments={optimisticAssignments}
                    />
                  )}
                </div>
              )}
            </AppCard>

            {!selectedVenue?.isOpenSeating &&
              singersListPosition === 'side' &&
              printMode === 'visual' && (
                <AppCard className="no-print border-border sticky top-6 flex h-[calc(100vh-140px)] w-[320px] flex-col border-2 border-dashed">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      try {
                        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                        if (data.fromSeatKey) {
                          assignSinger(data.fromSeatKey, '');
                        }
                      } catch (err) {
                        console.error('Failed to parse sidebar drop data', err);
                      }
                    }}
                    className="flex size-full flex-col"
                  >
                    <div className="mb-4 flex flex-row items-center justify-between gap-1">
                      <h3 className="text-headline m-0">Unassigned</h3>
                      <div className="flex flex-row gap-1">
                        <button
                          type="button"
                          onClick={() => setIsSingerLookupOpen(true)}
                          className="bg-primary-light text-primary-deep inline-flex h-7 min-h-[28px] items-center justify-center gap-2 rounded-md px-2 text-[11px] font-semibold whitespace-nowrap"
                        >
                          🔍 Lookup
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSingerModalOpen(true)}
                          className="bg-primary-light text-primary-deep inline-flex h-7 min-h-[28px] items-center justify-center gap-2 rounded-md px-2 text-[11px] font-semibold whitespace-nowrap"
                        >
                          + Add New
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-1">
                      {activeProfiles
                        .filter((p) => !Object.values(optimisticAssignments).includes(p.id))
                        .sort((a, b) => a.voicePart.localeCompare(b.voicePart))
                        .map((p) => (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData(
                                'text/plain',
                                JSON.stringify({ profileId: p.id })
                              )
                            }
                            className="border-border bg-bg flex cursor-grab flex-row justify-between rounded-md border px-4 py-2"
                          >
                            <span className="text-label font-semibold">{p.name}</span>
                            <span className="bg-primary-light text-primary-deep inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase">
                              {p.voicePart}
                            </span>
                          </div>
                        ))}
                      {activeProfiles.filter(
                        (p) => !Object.values(optimisticAssignments).includes(p.id)
                      ).length === 0 && (
                        <div className="p-8 text-center">
                          <p className="text-muted text-sm">All singers assigned!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </AppCard>
              )}
          </div>
        </>
      ) : (
        <AppCard className="p-[80px] text-center">
          <p className="text-muted">
            Select a Performance and a Venue to start creating the seating chart.
          </p>
        </AppCard>
      )}

      <SingerModal
        isOpen={isSingerModalOpen}
        onClose={() => setIsSingerModalOpen(false)}
        onSave={handleAddSingerSave}
      />

      <SingerLookupModal
        isOpen={isSingerLookupOpen}
        onClose={() => setIsSingerLookupOpen(false)}
        onSelect={handleLookupSingerSelect}
        excludeIds={useMemo(() => new Set(activeProfiles.map((p) => p.id)), [activeProfiles])}
      />

      {/* New Chart Modal */}
      <Modal
        isOpen={isNewChartModalOpen}
        onClose={() => {
          setIsNewChartModalOpen(false);
          setNewChartName('');
        }}
        title="New Seating Chart"
        maxWidth="400px"
        footer={
          <>
            <Button
              variant="outline"
              className=""
              onClick={() => {
                setIsNewChartModalOpen(false);
                setNewChartName('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className=""
              disabled={!newChartName.trim()}
              onClick={async () => {
                if (newChartName.trim()) {
                  await createChart(newChartName.trim());
                  setIsNewChartModalOpen(false);
                  setNewChartName('');
                }
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <form
          id="new-chart-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (newChartName.trim()) {
              await createChart(newChartName.trim());
              setIsNewChartModalOpen(false);
              setNewChartName('');
            }
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-label font-semibold">Chart Name</label>
            <Input
              value={newChartName}
              onChange={(e) => setNewChartName(e.target.value)}
              placeholder="e.g. Chamber Choir, Combined Finale"
              required
            />
          </div>
        </form>
      </Modal>

      {/* Rename Chart Modal */}
      <Modal
        isOpen={isRenameChartModalOpen}
        onClose={() => {
          setIsRenameChartModalOpen(false);
          setRenameChartName('');
          setChartToRename(null);
        }}
        title="Rename Seating Chart"
        maxWidth="400px"
        footer={
          <>
            <Button
              variant="outline"
              className=""
              onClick={() => {
                setIsRenameChartModalOpen(false);
                setRenameChartName('');
                setChartToRename(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className=""
              disabled={!renameChartName.trim()}
              onClick={async () => {
                if (chartToRename && renameChartName.trim()) {
                  await renameChart(chartToRename.id, renameChartName.trim());
                  setIsRenameChartModalOpen(false);
                  setRenameChartName('');
                  setChartToRename(null);
                }
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="rename-chart-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (chartToRename && renameChartName.trim()) {
              await renameChart(chartToRename.id, renameChartName.trim());
              setIsRenameChartModalOpen(false);
              setRenameChartName('');
              setChartToRename(null);
            }
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-label font-semibold">New Chart Name</label>
            <Input
              value={renameChartName}
              onChange={(e) => setRenameChartName(e.target.value)}
              placeholder="e.g. Chamber Choir"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
