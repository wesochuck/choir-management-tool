import { useState, useEffect, useRef, useMemo } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { SeatingGrid } from '../../components/admin/SeatingGrid';
import { seatingService, type SeatingChart } from '../../services/seatingService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { getLastName } from '../../lib/stringUtils';

export default function SeatingView() {
  const dialog = useDialog();
  const { performances } = useEvents();
  const { venues } = useVenues();
  
  const [performanceId, setPerformanceId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [allCharts, setAllCharts] = useState<SeatingChart[]>([]);
  const [printMode, setPrintMode] = useState<'visual' | 'text'>('visual');

  const selectedVenue = venues.find(v => v.id === venueId) || null;
  const { 
    chart, optimisticAssignments, activeProfiles, rowCounts, suggestions, isLoading,
    isSaving, isDirty, error: saveError, assignSinger, updateChart, copyFromPerformance, forceSave
  } = useSeatingChart(performanceId, selectedVenue);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const wasSavingRef = useRef(false);

  useEffect(() => {
    if (performanceId) {
      seatingService.getAllCharts().then(setAllCharts).catch(console.error);
    }
  }, [performanceId]);

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
    
    const profileMap: Record<string, any> = {};
    activeProfiles.forEach(p => profileMap[p.id] = p);

    return rowCounts.map((seatCount, rowIndex) => {
      const row: any[] = [];
      for (let seatIndex = 0; seatIndex < seatCount; seatIndex++) {
        const profileId = optimisticAssignments[`${rowIndex}-${seatIndex}`];
        row.push(profileId ? profileMap[profileId] : null);
      }
      return row;
    });
  }, [rowCounts, activeProfiles, optimisticAssignments]);

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
    <div className="flex-col" data-print-mode={printMode} style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="no-print flex-col" style={{ gap: 'var(--space-md)' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Seating Chart Creator</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Performance</label>
            <select 
              value={performanceId} 
              onChange={(e) => setPerformanceId(e.target.value)}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '48px', border: '1px solid var(--border)' }}
            >
              <option value="">-- Select Performance --</option>
              {performances.map(p => (
                <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} - {p.location}</option>
              ))}
            </select>
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Venue Layout</label>
            <select 
              value={venueId} 
              onChange={(e) => setVenueId(e.target.value)}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '48px', border: '1px solid var(--border)' }}
            >
              <option value="">-- Select Venue Template --</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Choir Formation</label>
            <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
              <select 
                value={
                  (!chart?.sectionOrder || chart?.sectionOrder?.toUpperCase() === 'S,A,T,B') ? 'SATB' : 
                  chart?.sectionOrder?.toUpperCase() === 'S,B,T,A' ? 'SBTA' : 
                  'Custom'
                } 
                onChange={(e) => handlePatternChange(e.target.value)}
                className="card"
                style={{ flex: 1, padding: '0 12px', height: '48px', border: '1px solid var(--border)' }}
              >
                <option value="SATB">SATB (Standard)</option>
                <option value="SBTA">SBTA (Wedge Mix)</option>
                <option value="Custom">Custom...</option>
              </select>
              {(chart?.sectionOrder !== 'S,A,T,B' && chart?.sectionOrder !== 'S,B,T,A') && (
                <div className="flex-row" style={{ flex: 1.5, gap: 'var(--space-xs)' }}>
                  <input 
                    value={localCustomPattern}
                    onChange={(e) => setLocalCustomPattern(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && updateChart({ sectionOrder: localCustomPattern })}
                    onBlur={() => updateChart({ sectionOrder: localCustomPattern })}
                    placeholder="S,B,T,A"
                    className="card"
                    style={{ flex: 1, padding: '0 12px', height: '48px', border: '1px solid var(--border)' }}
                  />
                  <button onClick={() => updateChart({ sectionOrder: localCustomPattern })} className="btn btn-primary btn-sm">
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {performanceId && venueId ? (
        <div className="flex-responsive" style={{ alignItems: 'flex-start', gap: 'var(--space-xl)' }}>
          <AppCard className="flex-col" style={{ flex: 1 }}>
            <div className="no-print flex-responsive" style={{ 
              justifyContent: 'space-between', 
              padding: 'var(--space-lg)', 
              backgroundColor: 'var(--primary-light)', 
              borderRadius: 'var(--radius-lg)',
              gap: 'var(--space-lg)'
            }}>
               <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
                  <button onClick={handleClear} className="btn btn-ghost" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    🧹 Clear People
                  </button>
                  <button onClick={handleReset} className="btn btn-danger">
                    💥 Full Reset
                  </button>
               </div>
               
               <div className="flex-row no-print" style={{ 
                backgroundColor: 'var(--surface)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border)',
                padding: '4px'
               }}>
                <button 
                  onClick={() => setPrintMode('visual')}
                  className={`btn btn-sm ${printMode === 'visual' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Visual Grid
                </button>
                <button 
                  onClick={() => setPrintMode('text')}
                  className={`btn btn-sm ${printMode === 'text' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Text List
                </button>
               </div>
               
               <div className="flex-responsive" style={{ gap: 'var(--space-md)', flex: 1, justifyContent: 'center' }}>
                  <span className="text-label" style={{ color: 'var(--primary-deep)', whiteSpace: 'nowrap' }}>Copy Layout From:</span>
                  <select 
                    onChange={(e) => handleCopy(e.target.value)}
                    value=""
                    className="card"
                    style={{ fontSize: '0.875rem', padding: '0 var(--space-md)', height: '44px', minWidth: '200px', flex: 1, maxWidth: '300px' }}
                  >
                    <option value="">-- Choose Performance --</option>
                    {allCharts
                      .filter(c => c.venue === venueId && c.performance !== performanceId)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.expand?.performance?.title || 'Untitled'}</option>
                      ))}
                  </select>
               </div>

               <button onClick={handlePrint} className="btn btn-primary" style={{ minWidth: '140px' }}>
                  🖨️ Print Layout
               </button>
               <div className="flex-col" style={{ gap: 'var(--space-xs)', alignItems: 'flex-end' }}>
                <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                  <SavingIndicator isSaving={isSaving} error={saveError} />
                  <button
                    onClick={handleManualSave}
                    className="btn btn-secondary"
                    style={{ minWidth: '96px' }}
                  >
                    {saveError ? (isDirty ? 'Retry Save' : 'Retry') : isSaving ? 'Saving...' : saveFeedback ? 'Saved!' : isDirty ? 'Save Now' : 'Save'}
                  </button>
                </div>
                <span className="text-xs text-muted">Your changes are saved automatically.</span>
               </div>
            </div>

            {isLoading ? (
              <div className="flex-col" style={{ alignItems: 'center', padding: 'var(--space-xl)' }}>
                <p className="text-muted">Loading seating data...</p>
              </div>
            ) : (
              <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
                <div className="no-print" style={{ 
                  padding: 'var(--space-sm)', 
                  backgroundColor: 'var(--bg)', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: 'var(--font-size-sm)', 
                  color: 'var(--text-muted)', 
                  textAlign: 'center',
                  border: '1px solid var(--border)'
                }}>
                  <strong>Editor Mode:</strong> Drag singers from the sidebar or click a seat to assign.
                </div>
                <SeatingGrid 
                  rowCounts={rowCounts}
                  assignments={optimisticAssignments}
                  suggestions={suggestions}
                  activeProfiles={activeProfiles}
                  onAssign={assignSinger}
                />
                <SeatingTextList rows={groupedRows} />
              </div>
            )}
          </AppCard>

          <AppCard className="no-print" style={{ 
            width: '320px', 
            position: 'sticky', 
            top: 'var(--space-lg)',
            height: 'calc(100vh - 140px)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            border: '2px dashed var(--border)'
          }}>
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
              style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
            >
              <h3 className="text-headline" style={{ marginBottom: 'var(--space-md)' }}>Unassigned</h3>
              <div className="flex-col" style={{ gap: 'var(--space-sm)', overflowY: 'auto', paddingRight: '4px', flex: 1 }}>
                {activeProfiles
                  .filter(p => !Object.values(optimisticAssignments).includes(p.id))
                  .sort((a, b) => a.voicePart.localeCompare(b.voicePart))
                  .map(p => (
                    <div 
                      key={p.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ profileId: p.id }))}
                      className="flex-row"
                      style={{ 
                        padding: 'var(--space-sm) var(--space-md)', 
                        backgroundColor: 'var(--bg)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 'var(--radius-md)', 
                        cursor: 'grab',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span className="text-label" style={{ fontWeight: 600 }}>{p.name}</span>
                      <span className="badge badge-rehearsal">{p.voicePart}</span>
                    </div>
                  ))}
                {activeProfiles.filter(p => !Object.values(optimisticAssignments).includes(p.id)).length === 0 && (
                  <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                    <p className="text-muted text-sm">All singers assigned!</p>
                  </div>
                )}
              </div>
            </div>
          </AppCard>
        </div>
      ) : (
        <AppCard style={{ padding: '80px', textAlign: 'center' }}>
          <p className="text-muted">Select a Performance and a Venue to start creating the seating chart.</p>
        </AppCard>
      )}
    </div>
  );
}

function SavingIndicator({ isSaving, error }: { isSaving: boolean; error: string | null }) {
  if (error) {
    return <span className="text-label" style={{ color: 'var(--color-danger-text)' }}>Save failed</span>;
  }

  if (isSaving) {
    return <span className="text-label text-muted">Saving...</span>;
  }

  return null;
}

function SeatingTextList({ rows }: { rows: any[][] }) {
  return (
    <div className="seating-text-list flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
      {rows.map((row, i) => {
        const isBack = i === 0;
        const isFront = i === rows.length - 1;
        const label = `Row ${i + 1}${isBack ? ' (Back)' : isFront ? ' (Front)' : ''}`;

        const assignedSingers = row.filter(p => !!p);
        const namesString = assignedSingers.length > 0 
          ? assignedSingers.map(p => `${getLastName(p.name)} (${p.voicePart})`).join(', ')
          : 'No singers assigned';

        return (
          <div key={i} className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <h3 className="text-label" style={{ 
              borderBottom: '2px solid var(--primary)', 
              paddingBottom: '4px',
              color: 'var(--primary-deep)',
              margin: 0
            }}>
              {label}
            </h3>
            <div className="text-sm" style={{ 
              padding: 'var(--space-sm)',
              backgroundColor: 'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              lineHeight: 1.5
            }}>
              {namesString}
            </div>
          </div>
        );
      })}
    </div>
  );
}
