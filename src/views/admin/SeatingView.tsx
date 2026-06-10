import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { seatingService, type SeatingChart } from '../../services/seatingService';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import type { Profile, ProfileInput } from '../../services/profileService';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { SingerModal } from '../../components/admin/SingerModal';
import { SingerLookupModal } from '../../components/admin/SingerLookupModal';
import { profileService } from '../../services/profileService';
import { rosterService } from '../../services/rosterService';
import './SeatingView.css';

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
  const [allCharts, setAllCharts] = useState<SeatingChart[]>([]);
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

  const selectedVenue = venues.find(v => v.id === venueId) || null;
  const { 
    chart, optimisticAssignments, activeProfiles, rowCounts, suggestions, sections, voiceParts, seatingSettings, isLoading,
    isSaving, isDirty, error: saveError, assignSinger, updateChart, copyFromPerformance, forceSave, refresh, currentFormation,
    charts, activeChartId, setActiveChartId, createChart, renameChart, deleteChart, reorderCharts
  } = useSeatingChart(performanceId, selectedVenue);

  const [isSingerModalOpen, setIsSingerModalOpen] = useState(false);
  const [isSingerLookupOpen, setIsSingerLookupOpen] = useState(false);

  const [isNewChartModalOpen, setIsNewChartModalOpen] = useState(false);
  const [newChartName, setNewChartName] = useState('');
  
  const [isRenameChartModalOpen, setIsRenameChartModalOpen] = useState(false);
  const [renameChartName, setRenameChartName] = useState('');
  const [chartToRename, setChartToRename] = useState<SeatingChart | null>(null);

  const [dragOverChartId, setDragOverChartId] = useState<string | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [visibleTabCount, setVisibleTabCount] = useState(10);

  const CHART_DRAG_MIME = 'application/x-chart-reorder';

  // Estimate how many tabs fit based on container width and chart name lengths
  const estimateVisibleTabs = useCallback((containerWidth: number) => {
    const allChartsList = charts || [];
    if (allChartsList.length === 0) return 10;
    // Reserve space for the + button (40px) and overflow dropdown (160px) and padding (32px)
    const reservedWidth = 40 + 32;
    let usedWidth = reservedWidth;
    let count = 0;
    for (const chart of allChartsList) {
      // Estimate: drag handle ~20px, name ~8px/char, padding/gap ~48px, action buttons ~60px if active
      const nameWidth = chart.name.length * 8;
      const tabWidth = 20 + nameWidth + 48 + (chart.id === activeChartId ? 60 : 0);
      if (usedWidth + tabWidth > containerWidth && count > 0) {
        break;
      }
      usedWidth += tabWidth;
      count++;
    }
    return Math.max(1, count);
  }, [charts, activeChartId]);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setVisibleTabCount(estimateVisibleTabs(width));
      }
    });
    observer.observe(container);
    // Run initial measurement
    setVisibleTabCount(estimateVisibleTabs(container.offsetWidth));
    return () => observer.disconnect();
  }, [estimateVisibleTabs, activeTab]);

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
      variant: 'danger'
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
      seatingService.getAllCharts().then(setAllCharts).catch(console.error);
      
      const perf = performances.find(p => p.id === performanceId);
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
    activeProfiles.forEach(p => profileMap[p.id] = p);

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

    return activeProfiles.filter(p => {
      if (assignedIds.has(p.id)) return false;
      if (!hasOrder) return true;

      if (currentFormation?.isVoicePartLayout) {
        return order.some(key =>
          key.toLowerCase() === (p.voicePart || '').trim().toLowerCase()
        );
      }

      const vpDef = voiceParts.find(vp =>
        vp.label === p.voicePart || vp.fullName === p.voicePart
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
      message: 'REALLY RESET EVERYTHING? This will clear assignments, custom row counts, and formations.',
      confirmLabel: 'Reset',
      variant: 'danger',
    });
    if (!shouldReset) return;

    await updateChart({ assignments: {}, layoutOverride: null, formationId: seatingSettings.defaultFormationId });
  };

  const handleCopy = async (sourceChartId: string) => {
    const source = allCharts.find(c => c.id === sourceChartId);
    if (!source) return;

    const shouldCopy = await dialog.confirm({
      title: 'Copy Seating Chart',
      message: `Copy seating layout and assignments from "${source.expand?.performance?.title || 'Another Performance'}"?`,
      confirmLabel: 'Copy',
    });
    if (!shouldCopy) return;

    await copyFromPerformance(source);
  };

  return (
    <div 
      className={`flex-col seating-view-container ${isWideLayout ? 'seating-chart-wide-active' : ''} ${isFullscreen ? 'seating-fullscreen-active' : ''}`} 
      ref={workspaceRef}
      data-print-mode={printMode} 
    >
      <div className="no-print seating-controls-bar seating-header">
        <div className="flex-row seating-header-row">
          <h1 className="text-headline seating-header-title seating-header-title-sm">
            Seating Chart
          </h1>
          
          <div className="flex-row seating-tab-group">
            <button
              onClick={() => setActiveTab('chart')}
              // @allow-inline-style - active tab state
              style={{
                height: '28px',
                minHeight: '28px',
                padding: '0 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 'calc(var(--radius-md) - 2px)',
                backgroundColor: activeTab === 'chart' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'chart' ? 'var(--bg, white)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Chart
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              // @allow-inline-style - active tab state
              style={{
                height: '28px',
                minHeight: '28px',
                padding: '0 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 'calc(var(--radius-md) - 2px)',
                backgroundColor: activeTab === 'templates' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'templates' ? 'var(--bg, white)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Formations
            </button>
          </div>
        </div>
        
        {activeTab === 'chart' && (
          <div className="flex-row seating-controls-group seating-controls-group-wrap">
            <div className="flex-row seating-control-item seating-control-item-row">
              <span className="seating-control-label">Perf:</span>
              <select 
                value={performanceId} 
                onChange={(e) => setPerformanceId(e.target.value)}
                className="seating-select-perf seating-perf-select"
              >
                <option value="">-- Select Performance --</option>
                {performances.map(p => (
                  <option key={p.id} value={p.id}>{p.title || formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })}</option>
                ))}
              </select>
            </div>

            <div className="flex-row seating-control-item seating-control-item-row">
              <span className="seating-control-label">Venue:</span>
              <select 
                value={venueId} 
                onChange={(e) => setVenueId(e.target.value)}
                className="seating-select-venue seating-venue-select"
              >
                <option value="">-- Select Venue --</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              {hasLayoutOverride && (
                <button 
                  onClick={async () => {
                    const confirmed = await dialog.confirm({
                      title: 'Update Master Venue Template?',
                      message: `Would you like to overwrite the master template for "${selectedVenue?.name}" with this performance's row configuration (${chart?.layoutOverride?.join(', ')})? This will affect new seating charts for this venue.`,
                      confirmLabel: 'Yes, Update Template',
                      cancelLabel: 'Cancel'
                    });
                    if (confirmed && selectedVenue) {
                      try {
                        await editVenue(selectedVenue.id, { rowCounts: chart?.layoutOverride || undefined });
                        await dialog.showMessage({
                          title: 'Success',
                          message: `Successfully updated the master template for "${selectedVenue.name}".`
                        });
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : String(err);
                        console.error('Failed to update venue', err);
                        await dialog.showMessage({
                          title: 'Error',
                          message: msg
                        });
                      }
                    }
                  }}
                  className="btn btn-sm btn-ghost no-print seating-update-venue-btn" 
                  title={`Overwrite "${selectedVenue?.name}" default layout counts with this chart's current counts`}
                >
                  💾 Update
                </button>
              )}
            </div>

            <div className="flex-row seating-control-item seating-control-item-row">
              <span className="seating-control-label">Format:</span>
              <div className="flex-row seating-format-row">
                <select 
                  value={chart?.formationId || seatingSettings.defaultFormationId} 
                  onChange={async (e) => {
                    const selectedId = e.target.value;
                    const formation = seatingSettings.formations.find(f => f.id === selectedId);
                    if (!formation) return;
                    
                    const shouldChange = await dialog.confirm({
                      title: 'Change Formation',
                      message: 'Changing the formation logic will clear all current seating assignments. Do you want to proceed?',
                      confirmLabel: 'Change',
                      variant: 'danger',
                    });
                    if (!shouldChange) return;

                    await updateChart({ formationId: selectedId, assignments: {} });
                  }}
                  className="seating-select-pattern seating-format-select"
                >
                  {seatingSettings.formations?.map(formation => (
                    <option key={formation.id} value={formation.id}>{formation.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'templates' ? (
        <SeatingFormationsEditor onSaveSuccess={refresh} />
      ) : performanceId && venueId ? (
        <>
          {/* Seating Charts Tabs Row */}
          <div ref={tabsContainerRef} className="no-print flex-row seating-charts-tabs-row">
            {/* Render visible tabs (dynamic count based on container width) */}
            {(charts || []).slice(0, visibleTabCount).map(c => {
              const isActive = c.id === activeChartId;
              const isDragOver = dragOverChartId === c.id;
              return (
                <div 
                  key={c.id} 
                  className="flex-row seating-chart-tab"
                  // @allow-inline-style - dynamic border based on active and drag-over state
                  style={{ 
                    borderBottom: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                    borderLeft: isDragOver ? '2px solid var(--primary)' : '2px solid transparent'
                  }}
                  onClick={() => {
                    if (!isActive) {
                      setActiveChartId(c.id);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer) {
                      e.dataTransfer.dropEffect = 'move';
                    }
                    setDragOverChartId(c.id);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOverChartId(c.id);
                  }}
                  onDragLeave={() => {
                    setDragOverChartId(prev => prev === c.id ? null : prev);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverChartId(null);
                    const draggedId = e.dataTransfer.getData(CHART_DRAG_MIME);
                    if (draggedId && draggedId !== c.id) {
                      const currentCharts = [...(charts || [])];
                      const draggedIndex = currentCharts.findIndex(x => x.id === draggedId);
                      const targetIndex = currentCharts.findIndex(x => x.id === c.id);
                      if (draggedIndex !== -1 && targetIndex !== -1) {
                        const [draggedItem] = currentCharts.splice(draggedIndex, 1);
                        currentCharts.splice(targetIndex, 0, draggedItem);
                        await reorderCharts(currentCharts.map(x => x.id));
                      }
                    }
                  }}
                >
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(CHART_DRAG_MIME, c.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragOverChartId(null)}
                    // @allow-inline-style - dynamic drag handle color and opacity
                    style={{
                      color: isActive ? 'var(--primary-deep)' : 'var(--text-muted)',
                      opacity: isActive ? 0.95 : 0.75,
                      cursor: 'grab',
                      padding: '2px 4px',
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      userSelect: 'none',
                      marginRight: '2px',
                      fontWeight: 'bold'
                    }}
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isActive) setActiveChartId(c.id);
                    }}
                    className="btn btn-sm btn-ghost seating-chart-tab-btn"
                    // @allow-inline-style - dynamic font weight and color based on active state
                    style={{ 
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--primary-deep)' : 'var(--text-muted)'
                    }}
                  >
                    {c.name}
                  </button>
                  {isActive && (
                    <div className="flex-row seating-chart-action-row" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChartToRename(c);
                          setRenameChartName(c.name);
                          setIsRenameChartModalOpen(true);
                        }}
                        className="btn btn-ghost btn-sm seating-chart-action-btn"
                        title="Rename chart"
                      >
                        ✏️
                      </button>
                      {(charts || []).length > 1 && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmed = await dialog.confirm({
                              title: 'Delete Seating Chart?',
                              message: `Are you sure you want to delete "${c.name}"? This cannot be undone.`,
                              confirmLabel: 'Delete',
                              variant: 'danger'
                            });
                            if (confirmed) {
                              await deleteChart(c.id);
                            }
                          }}
                          className="btn btn-ghost btn-sm seating-chart-delete-btn"
                          title="Delete chart"
                        >
                          ❌
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render overflow dropdown when charts exceed visible count */}
            {(charts || []).length > visibleTabCount && (
              <div 
                className="seating-overflow-dropdown-wrap"
                // @allow-inline-style - dynamic border based on active chart visibility
                style={{
                  borderBottom: `2px solid ${!(charts || []).slice(0, visibleTabCount).some(c => c.id === activeChartId) ? 'var(--primary)' : 'transparent'}`
                }}
              >
                <select
                  value={(charts || []).slice(0, visibleTabCount).some(c => c.id === activeChartId) ? '' : activeChartId}
                  onChange={(e) => {
                    if (e.target.value) {
                      setActiveChartId(e.target.value);
                    }
                  }}
                  className="seating-select-perf seating-overflow-select"
                  // @allow-inline-style - dynamic color and weight based on active chart
                  style={{
                    color: !(charts || []).slice(0, visibleTabCount).some(c => c.id === activeChartId) ? 'var(--primary-deep)' : 'var(--text-muted)',
                    fontWeight: !(charts || []).slice(0, visibleTabCount).some(c => c.id === activeChartId) ? 700 : 500
                  }}
                >
                  <option value="">More Charts... ▼</option>
                  {(charts || []).slice(visibleTabCount).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Add New Seating Chart Button (Plus sign to the right of tabs) */}
            <button
              onClick={() => setIsNewChartModalOpen(true)}
              className="btn btn-sm btn-ghost seating-add-btn"
              title="Create new seating chart"
            >
              +
            </button>
          </div>

          <div className="flex-responsive seating-main-layout">
          <AppCard className="flex-col seating-card-editor">
            <div className="no-print flex-responsive seating-toolbar">
               <div className="flex-row seating-toolbar-row">
                  <button onClick={handleClear} className="btn btn-sm btn-ghost seating-toolbar-btn">
                    🧹 Clear
                  </button>
                  <button onClick={handleReset} className="btn btn-sm btn-danger seating-toolbar-btn-danger">
                    💥 Reset
                  </button>
               </div>
               
               <div className="flex-row no-print seating-toolbar-segmented-group">
                <button 
                  onClick={() => setPrintMode('visual')}
                  className={`btn btn-sm ${printMode === 'visual' ? 'btn-primary' : 'btn-ghost'} seating-toolbar-segmented-btn`}
                >
                  Grid
                </button>
                <button 
                  onClick={() => setPrintMode('text')}
                  className={`btn btn-sm ${printMode === 'text' ? 'btn-primary' : 'btn-ghost'} seating-toolbar-segmented-btn`}
                >
                  List
                </button>
               </div>

               <div className="flex-row no-print seating-segmented-control-wrap">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className={`btn btn-sm ${isFullscreen ? 'btn-primary' : 'btn-ghost'} seating-toolbar-btn-fullscreen`}
                    // @allow-inline-style - dynamic fullscreen state background
                    style={{ backgroundColor: isFullscreen ? 'var(--primary)' : 'var(--surface)' }}
                  >
                   {isFullscreen ? 'Exit' : '🖥️ Full'}
                 </button>

                 {printMode === 'text' && (
                   <label className="flex-row seating-checkbox-label">
                     <input 
                       type="checkbox" 
                       checked={showVoicePartsInList} 
                       onChange={(e) => setShowVoicePartsInList(e.target.checked)}
                       className="seating-checkbox-input"
                     />
                     Show Voice Parts
                   </label>
                 )}
               </div>
               
               <div className="flex-row seating-copy-section">
                  <span className="text-label text-muted seating-copy-label">Copy:</span>
                  <select 
                    onChange={(e) => handleCopy(e.target.value)}
                    value=""
                    className="seating-copy-select"
                  >
                    <option value="">-- Choose --</option>
                    {allCharts
                      .filter(c => c.venue === venueId && c.performance !== performanceId)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.expand?.performance?.title || 'Untitled'}</option>
                      ))}
                  </select>
               </div>

               <button onClick={handlePrint} className="btn btn-sm btn-primary seating-toolbar-btn-print">
                  🖨️ Print
               </button>
               <div className="flex-row seating-save-feedback-wrap seating-toolbar-save-wrap">
                 <SavingIndicator isSaving={isSaving} error={saveError} />
                 <span className="text-muted seating-autosave-tag">
                   Auto-saved
                 </span>
                 <button
                   onClick={handleManualSave}
                   className="btn btn-sm btn-ghost seating-toolbar-btn-save"
                   // @allow-inline-style - dynamic save feedback color
                   style={{ 
                     color: saveError ? 'var(--color-danger-text)' : saveFeedback ? 'var(--color-success-text)' : 'var(--text)'
                   }}
                 >
                   {saveError ? (isDirty ? 'Retry' : 'Retry') : isSaving ? 'Saving...' : saveFeedback ? '✓ Saved' : isDirty ? 'Save' : 'Save'}
                 </button>
               </div>
            </div>

            {isLoading ? (
              <div className="flex-col seating-loading-wrap">
                <p className="text-muted">Loading seating data...</p>
              </div>
            ) : selectedVenue?.isOpenSeating ? (
              <div className="flex-col seating-open-wrap">
                <h3 className="text-headline">Open Seating</h3>
                <p className="text-muted">This venue is configured for open seating. No seating assignments are required.</p>
                {selectedVenue.address && (
                  <p className="seating-open-map-btn">
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedVenue.address)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                      📍 View Map
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <div className="seating-print-shell flex-col">
                {printMode === 'visual' && (
                  <div className="no-print seating-grid-editor-info">
                    <strong>Editor Mode:</strong>{' '}
                    {singersListPosition === 'bottom' ? (
                      <span>
                        Drag singers from the <strong>bottom shelf</strong> below, or click an <strong>empty seat</strong> to assign. Drag assigned singers to move or swap them.
                        <span className="seating-editor-info-highlight">
                          👇 Scroll down to see unassigned singers!
                        </span>
                      </span>
                    ) : singersListPosition === 'side' ? (
                      <span>Drag singers from the <strong>right sidebar</strong>, or click an <strong>empty seat</strong> to assign. Drag assigned singers to move or swap them.</span>
                    ) : (
                      <span>Click an <strong>empty seat</strong> to assign. Drag assigned singers to move or swap them. (Singers list is currently hidden).</span>
                    )}
                  </div>
                )}
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
                
                {(!selectedVenue?.isOpenSeating && singersListPosition === 'bottom' && printMode === 'visual') && (
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
                  <div className="no-print seating-grid-unassigned-warn">
                    ⚠️ You have {unassignedCount} unassigned singer{unassignedCount > 1 ? 's' : ''} left. Switch to Grid view to assign them.
                  </div>
                )}

                <SeatingTextList rows={groupedRows} showVoiceParts={showVoicePartsInList} />

                {printMode === 'visual' && (
                  <UnassignedPrintSection 
                    activeProfiles={activeProfiles}
                    assignments={optimisticAssignments}
                  />
                )}
              </div>
            )}
          </AppCard>

          {(!selectedVenue?.isOpenSeating && singersListPosition === 'side' && printMode === 'visual') && (
            <AppCard className="no-print seating-sidebar">
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
                className="seating-sidebar-content"
              >
                <div className="flex-row seating-sidebar-header-row">
                  <h3 className="text-headline seating-sidebar-title">Unassigned</h3>
                  <div className="flex-row seating-sidebar-buttons-row">
                    <button
                      type="button"
                      onClick={() => setIsSingerLookupOpen(true)}
                      className="btn btn-secondary btn-sm seating-sidebar-btn"
                    >
                      🔍 Lookup
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSingerModalOpen(true)}
                      className="btn btn-secondary btn-sm seating-sidebar-btn"
                    >
                      + Add New
                    </button>
                  </div>
                </div>
                <div className="flex-col seating-sidebar-list">
                  {activeProfiles
                    .filter(p => !Object.values(optimisticAssignments).includes(p.id))
                    .sort((a, b) => a.voicePart.localeCompare(b.voicePart))
                    .map(p => (
                      <div 
                        key={p.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ profileId: p.id }))}
                        className="flex-row seating-sidebar-item"
                      >
                        <span className="text-label seating-sidebar-item-name">{p.name}</span>
                        <span className="badge badge-rehearsal">{p.voicePart}</span>
                      </div>
                    ))}
                  {activeProfiles.filter(p => !Object.values(optimisticAssignments).includes(p.id)).length === 0 && (
                    <div className="seating-sidebar-empty">
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
        <AppCard className="seating-empty-view">
          <p className="text-muted">Select a Performance and a Venue to start creating the seating chart.</p>
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
        excludeIds={useMemo(() => new Set(activeProfiles.map(p => p.id)), [activeProfiles])}
      />

      {/* New Chart Modal */}
      <BaseModal
        isOpen={isNewChartModalOpen}
        onClose={() => {
          setIsNewChartModalOpen(false);
          setNewChartName('');
        }}
        title="New Seating Chart"
        maxWidth="400px"
        footer={
          <>
            <button 
              type="button"
              className="btn btn-ghost" 
              onClick={() => {
                setIsNewChartModalOpen(false);
                setNewChartName('');
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              form="new-chart-form"
              className="btn btn-primary" 
              disabled={!newChartName.trim()}
            >
              Create
            </button>
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
          <div className="flex-col seating-modal-row">
            <label className="text-label seating-new-chart-label">Chart Name</label>
            <input 
              className="card seating-new-chart-input" 
              value={newChartName} 
              onChange={(e) => setNewChartName(e.target.value)} 
              placeholder="e.g. Chamber Choir, Combined Finale"
              required 
            />
          </div>
        </form>
      </BaseModal>

      {/* Rename Chart Modal */}
      <BaseModal
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
            <button 
              type="button"
              className="btn btn-ghost" 
              onClick={() => {
                setIsRenameChartModalOpen(false);
                setRenameChartName('');
                setChartToRename(null);
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              form="rename-chart-form"
              className="btn btn-primary" 
              disabled={!renameChartName.trim()}
            >
              Save
            </button>
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
          <div className="flex-col seating-modal-row">
            <label className="text-label seating-rename-label">New Chart Name</label>
            <input 
              className="card seating-rename-input" 
              value={renameChartName} 
              onChange={(e) => setRenameChartName(e.target.value)} 
              placeholder="e.g. Chamber Choir"
              required 
            />
          </div>
        </form>
      </BaseModal>
    </div>
  );
}
