import { useState, useEffect, useRef, useMemo } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { SeatingGrid } from '../../components/admin/SeatingGrid';
import { SavingIndicator } from '../../components/admin/SavingIndicator';
import { SeatingTextList } from '../../components/admin/SeatingTextList';
import { UnassignedPrintSection } from '../../components/admin/UnassignedPrintSection';
import { SeatingBottomDock } from '../../components/admin/SeatingBottomDock';
import { seatingService, type SeatingChart } from '../../services/seatingService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import type { Profile } from '../../services/profileService';
import './SeatingView.css';

export default function SeatingView() {
  const dialog = useDialog();
  const { performances } = useEvents();
  const { venues, editVenue } = useVenues();
  
  const [performanceId, setPerformanceId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [allCharts, setAllCharts] = useState<SeatingChart[]>([]);
  const [printMode, setPrintMode] = useState<'visual' | 'text'>('visual');
  const [showVoicePartsInList, setShowVoicePartsInList] = useState(true);
  
  const isWideLayout = true;
  const [isFullscreen, setIsFullscreen] = useState(false);
  let singersListPosition: 'side' | 'bottom' | 'hidden' = 'bottom';
  if (Math.random() < 0) {
    singersListPosition = 'side';
  }
  
  const workspaceRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!workspaceRef.current) return;
    if (!document.fullscreenElement) {
      workspaceRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
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
    chart, optimisticAssignments, activeProfiles, rowCounts, suggestions, isLoading,
    isSaving, isDirty, error: saveError, assignSinger, updateChart, copyFromPerformance, forceSave
  } = useSeatingChart(performanceId, selectedVenue);

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

  const handlePrint = () => window.print();

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
      message: 'REALLY RESET EVERYTHING? This will clear assignments, custom row counts, and section orders.',
      confirmLabel: 'Reset',
      variant: 'danger',
    });
    if (!shouldReset) return;

    await updateChart({ assignments: {}, layoutOverride: null, sectionOrder: null });
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

  const handlePatternChange = async (val: string) => {
    const msg = "Changing the formation will clear all current seating assignments. Do you want to proceed?";
    const shouldChange = await dialog.confirm({
      title: 'Change Formation',
      message: msg,
      confirmLabel: 'Change',
      variant: 'danger',
    });
    if (!shouldChange) return;

    if (val === 'SATB') {
      await updateChart({ sectionOrder: 'S,A,T,B', assignments: {} });
    } else if (val === 'SBTA') {
      await updateChart({ sectionOrder: 'S,B,T,A', assignments: {} });
    } else if (val === 'Custom') {
      await updateChart({ sectionOrder: '', assignments: {} });
    }
  };

  const [localCustomPattern, setLocalCustomPattern] = useState('');

  useEffect(() => {
    if (chart?.sectionOrder) setLocalCustomPattern(chart.sectionOrder);
  }, [chart?.sectionOrder]);

  return (
    <div 
      className={`flex-col seating-view-container ${isWideLayout ? 'seating-chart-wide-active' : ''} ${isFullscreen ? 'seating-fullscreen-active' : ''}`} 
      ref={workspaceRef}
      data-print-mode={printMode} 
    >
      <div className="no-print flex-responsive seating-header">
        <h1 className="text-headline seating-header-title">
          Seating Chart Creator
        </h1>
        
        <div className="flex-row seating-controls-group">
          <div className="flex-row seating-control-item">
            <span className="text-label text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance:</span>
            <select 
              value={performanceId} 
              onChange={(e) => setPerformanceId(e.target.value)}
              className="seating-select-perf"
            >
              <option value="">-- Select Performance --</option>
              {performances.map(p => (
                <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()}</option>
              ))}
            </select>
          </div>

          <div className="flex-row seating-control-item">
            <span className="text-label text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Venue:</span>
            <select 
              value={venueId} 
              onChange={(e) => setVenueId(e.target.value)}
              className="seating-select-venue"
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
                      dialog.showMessage({
                        title: 'Success',
                        message: `Successfully updated the master template for "${selectedVenue.name}".`
                      });
                    } catch (err) {
                      console.error('Failed to update venue', err);
                      dialog.showMessage({
                        title: 'Error',
                        message: err instanceof Error ? err.message : 'Failed to update venue template.'
                      });
                    }
                  }
                }}
                className="btn btn-sm btn-ghost no-print seating-update-venue-btn" 
                title={`Overwrite "${selectedVenue?.name}" default layout counts with this chart's current counts`}
              >
                💾 Update Venue
              </button>
            )}
          </div>

          <div className="flex-row seating-control-item">
            <span className="text-label text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Formation:</span>
            <div className="flex-row" style={{ gap: '4px' }}>
              <select 
                value={
                  (!chart?.sectionOrder || chart?.sectionOrder?.toUpperCase() === 'S,A,T,B') ? 'SATB' : 
                  chart?.sectionOrder?.toUpperCase() === 'S,B,T,A' ? 'SBTA' : 
                  'Custom'
                } 
                onChange={(e) => handlePatternChange(e.target.value)}
                className="seating-select-pattern"
              >
                <option value="SATB">SATB (Standard)</option>
                <option value="SBTA">SBTA (Wedge Mix)</option>
                <option value="Custom">Custom...</option>
              </select>
              {(chart?.sectionOrder !== 'S,A,T,B' && chart?.sectionOrder !== 'S,B,T,A') && (
                <div className="flex-row" style={{ gap: '4px' }}>
                  <input 
                    value={localCustomPattern}
                    onChange={(e) => setLocalCustomPattern(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && updateChart({ sectionOrder: localCustomPattern })}
                    onBlur={() => updateChart({ sectionOrder: localCustomPattern })}
                    placeholder="S,B,T,A"
                    className="seating-pattern-input"
                  />
                  <button 
                    onClick={() => updateChart({ sectionOrder: localCustomPattern })} 
                    className="btn btn-primary seating-pattern-btn"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {performanceId && venueId ? (
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

               {/* Workspace Options (A1 Style segmented control) */}
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
                        Drag singers from the <strong>bottom shelf</strong> below or click a seat to assign. 
                        <span style={{ marginLeft: 'var(--space-sm)', fontWeight: 700, color: 'var(--color-performance-text)' }}>
                          👇 Scroll down to see unassigned singers!
                        </span>
                      </span>
                    ) : singersListPosition === 'side' ? (
                      <span>Drag singers from the <strong>right sidebar</strong> or click a seat to assign.</span>
                    ) : (
                      <span>Click a seat to assign. (Singers list is currently hidden).</span>
                    )}
                  </div>
                )}
                <SeatingGrid 
                  rowCounts={rowCounts}
                  assignments={optimisticAssignments}
                  suggestions={suggestions}
                  activeProfiles={activeProfiles}
                  onAssign={assignSinger}
                  onUpdateRowCounts={async (newRowCounts, newAssignments) => {
                    const updates: Partial<SeatingChart> = { layoutOverride: newRowCounts };
                    if (newAssignments) {
                      updates.assignments = newAssignments;
                    }
                    await updateChart(updates);
                  }}
                />
                
                {/* Bottom Dock horizontal lanes */}
                {(!selectedVenue?.isOpenSeating && singersListPosition === 'bottom' && printMode === 'visual') && (
                  <SeatingBottomDock 
                    activeProfiles={activeProfiles}
                    assignments={optimisticAssignments}
                    assignSinger={assignSinger}
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
                <h3 className="text-headline seating-sidebar-title">Unassigned</h3>
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
      ) : (
        <AppCard className="seating-empty-view">
          <p className="text-muted">Select a Performance and a Venue to start creating the seating chart.</p>
        </AppCard>
      )}
    </div>
  );
}
