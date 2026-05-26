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
    charts, activeChartId, setActiveChartId, createChart, renameChart, deleteChart
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
    return activeProfiles.filter(p => !assignedIds.has(p.id)).length;
  }, [activeProfiles, optimisticAssignments]);

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
        <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <h1 className="text-headline seating-header-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
            Seating Chart
          </h1>
          
          <div className="flex-row" style={{ display: 'flex', backgroundColor: 'var(--surface-muted, #f1f5f9)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', gap: '2px' }}>
            <button
              onClick={() => setActiveTab('chart')}
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
          <div className="flex-row seating-controls-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <div className="flex-row seating-control-item" style={{ alignItems: 'center', gap: '6px' }}>
              <span className="seating-control-label">Perf:</span>
              <select 
                value={performanceId} 
                onChange={(e) => setPerformanceId(e.target.value)}
                className="seating-select-perf"
                style={{ height: '32px', minHeight: '32px', padding: '0 24px 0 8px', fontSize: '0.75rem', width: '180px' }}
              >
                <option value="">-- Select Performance --</option>
                {performances.map(p => (
                  <option key={p.id} value={p.id}>{p.title || formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })}</option>
                ))}
              </select>
            </div>

            <div className="flex-row seating-control-item" style={{ alignItems: 'center', gap: '6px' }}>
              <span className="seating-control-label">Venue:</span>
              <select 
                value={venueId} 
                onChange={(e) => setVenueId(e.target.value)}
                className="seating-select-venue"
                style={{ height: '32px', minHeight: '32px', padding: '0 24px 0 8px', fontSize: '0.75rem', width: '140px' }}
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
                  style={{ height: '32px', minHeight: '32px', padding: '0 var(--space-xs)', fontSize: '0.75rem' }}
                >
                  💾 Update
                </button>
              )}
            </div>

            <div className="flex-row seating-control-item" style={{ alignItems: 'center', gap: '6px' }}>
              <span className="seating-control-label">Format:</span>
              <div className="flex-row" style={{ gap: '4px' }}>
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
                  className="seating-select-pattern"
                  style={{ height: '32px', minHeight: '32px', padding: '0 24px 0 8px', fontSize: '0.75rem', width: '130px' }}
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
          <div className="no-print flex-row seating-charts-tabs-row" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: '0 var(--space-md)',
            borderBottom: '1px solid var(--border)',
            width: '100%',
            marginBottom: 'var(--space-md)'
          }}>
            {/* Render visible tabs */}
            {(charts || []).slice(0, 3).map(c => {
              const isActive = c.id === activeChartId;
              return (
                <div key={c.id} className="flex-row" style={{ 
                  alignItems: 'center', 
                  gap: '4px', 
                  borderBottom: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                  paddingBottom: '12px',
                  marginBottom: '-1px',
                  transition: 'all 0.2s ease'
                }}>
                  <button
                    onClick={() => setActiveChartId(c.id)}
                    className="btn btn-sm btn-ghost"
                    style={{ 
                      fontWeight: isActive ? 700 : 500,
                      padding: '0 var(--space-xs)',
                      color: isActive ? 'var(--primary-deep)' : 'var(--text-muted)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                      borderRadius: 0,
                      height: 'auto',
                      minHeight: 'auto'
                    }}
                  >
                    {c.name}
                  </button>
                  {isActive && (
                    <div className="flex-row" style={{ gap: '2px' }}>
                      <button
                        onClick={() => {
                          setChartToRename(c);
                          setRenameChartName(c.name);
                          setIsRenameChartModalOpen(true);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0 2px', minWidth: 'auto', fontSize: '0.85rem', height: '24px', minHeight: '24px' }}
                        title="Rename chart"
                      >
                        ✏️
                      </button>
                      {(charts || []).length > 1 && (
                        <button
                          onClick={async () => {
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
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0 2px', minWidth: 'auto', fontSize: '0.85rem', color: 'var(--color-danger-text)', height: '24px', minHeight: '24px' }}
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

            {/* Render overflow dropdown if more than 3 charts */}
            {(charts || []).length > 3 && (
              <div style={{
                borderBottom: `2px solid ${!(charts || []).slice(0, 3).some(c => c.id === activeChartId) ? 'var(--primary)' : 'transparent'}`,
                paddingBottom: '12px',
                marginBottom: '-1px'
              }}>
                <select
                  value={(charts || []).slice(0, 3).some(c => c.id === activeChartId) ? '' : activeChartId}
                  onChange={(e) => {
                    if (e.target.value) {
                      setActiveChartId(e.target.value);
                    }
                  }}
                  className="seating-select-perf"
                  style={{
                    height: '24px',
                    minHeight: '24px',
                    padding: '0 24px 0 8px !important',
                    fontSize: '0.75rem',
                    width: '140px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: !(charts || []).slice(0, 3).some(c => c.id === activeChartId) ? 'var(--primary-deep)' : 'var(--text-muted)',
                    fontWeight: !(charts || []).slice(0, 3).some(c => c.id === activeChartId) ? 700 : 500,
                    boxShadow: 'none'
                  }}
                >
                  <option value="">More Charts... ▼</option>
                  {(charts || []).slice(3).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Add New Seating Chart Button (Plus sign on far right) */}
            <button
              onClick={() => setIsNewChartModalOpen(true)}
              className="btn btn-sm btn-ghost"
              style={{ 
                marginLeft: 'auto', 
                fontWeight: 800, 
                fontSize: '1.25rem', 
                padding: '0 12px', 
                height: '32px', 
                minHeight: '32px', 
                width: '32px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: '50%', 
                border: '1px dashed var(--border)', 
                color: 'var(--primary)',
                marginBottom: '12px'
              }}
              title="Create new seating chart"
            >
              +
            </button>
          </div>

          <div className="flex-responsive seating-main-layout">
          <AppCard className="flex-col seating-card-editor">
            <div className="no-print flex-responsive seating-toolbar">
               <div className="flex-row" style={{ gap: 'var(--space-xs)' }}>
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
                  <span className="text-label text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Copy:</span>
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
               <div className="flex-row seating-save-feedback-wrap" style={{ alignItems: 'center' }}>
                 <SavingIndicator isSaving={isSaving} error={saveError} />
                 <span className="text-muted seating-autosave-tag">
                   Auto-saved
                 </span>
                 <button
                   onClick={handleManualSave}
                   className="btn btn-sm btn-ghost seating-toolbar-btn-save"
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
              <div className="seating-print-shell flex-col" style={{ gap: 'var(--space-lg)' }}>
                {printMode === 'visual' && (
                  <div className="no-print seating-grid-editor-info">
                    <strong>Editor Mode:</strong>{' '}
                    {singersListPosition === 'bottom' ? (
                      <span>
                        Drag singers from the <strong>bottom shelf</strong> below, or click an <strong>empty seat</strong> to assign. Drag assigned singers to move or swap them.
                        <span style={{ marginLeft: 'var(--space-sm)', fontWeight: 700, color: 'var(--color-performance-text)' }}>
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
                <div className="flex-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', gap: 'var(--space-xs)' }}>
                  <h3 className="text-headline seating-sidebar-title" style={{ margin: 0 }}>Unassigned</h3>
                  <div className="flex-row" style={{ gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setIsSingerLookupOpen(true)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontWeight: 600, padding: '0 8px', height: '28px', minHeight: '28px', fontSize: '11px' }}
                    >
                      🔍 Lookup
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSingerModalOpen(true)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontWeight: 600, padding: '0 8px', height: '28px', minHeight: '28px', fontSize: '11px' }}
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
                        <span className="text-label" style={{ fontWeight: 600 }}>{p.name}</span>
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
              className="btn btn-ghost" 
              onClick={() => {
                setIsNewChartModalOpen(false);
                setNewChartName('');
              }}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
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
            </button>
          </>
        }
      >
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label" style={{ fontWeight: 600 }}>Chart Name</label>
          <input 
            className="card" 
            value={newChartName} 
            onChange={(e) => setNewChartName(e.target.value)} 
            placeholder="e.g. Chamber Choir, Combined Finale"
            required 
            style={{ padding: '0 12px', height: '44px', width: '100%' }} 
          />
        </div>
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
              className="btn btn-primary" 
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
            </button>
          </>
        }
      >
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label" style={{ fontWeight: 600 }}>New Chart Name</label>
          <input 
            className="card" 
            value={renameChartName} 
            onChange={(e) => setRenameChartName(e.target.value)} 
            placeholder="e.g. Chamber Choir"
            required 
            style={{ padding: '0 12px', height: '44px', width: '100%' }} 
          />
        </div>
      </BaseModal>
    </div>
  );
}
