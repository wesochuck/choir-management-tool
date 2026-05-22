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
import { seatingService, type SeatingChart } from '../../services/seatingService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import type { Profile } from '../../services/profileService';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { settingsService, getVoicePartsAndSections, type SectionDef, type SeatingSettings } from '../../services/settingsService';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';
import './SeatingView.css';

const getSingersListPosition = (): 'side' | 'bottom' | 'hidden' => 'bottom';

export default function SeatingView() {
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  const { performances } = useEvents();
  const { venues, editVenue } = useVenues();
  const hasDefaultedRef = useRef(false);
  
  const [performanceId, setPerformanceId] = useState('');
  const [activeTab, setActiveTab] = useState<'chart' | 'templates'>('chart');

  // Templates Independent Settings State
  const [customSeatingSettings, setCustomSeatingSettings] = useState<SeatingSettings>({
    defaultFormationId: 'columns-standard',
    formations: []
  });
  const [initialSeatingSettings, setInitialSeatingSettings] = useState<SeatingSettings | null>(null);
  const [allSections, setAllSections] = useState<SectionDef[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [templateMessage, setTemplateMessage] = useState('');

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    setTemplateMessage('');
    try {
      const [seating, voiceData] = await Promise.all([
        settingsService.getSeatingSettings(),
        getVoicePartsAndSections(),
      ]);
      setCustomSeatingSettings(JSON.parse(JSON.stringify(seating)));
      setInitialSeatingSettings(JSON.parse(JSON.stringify(seating)));
      setAllSections(voiceData.sections);
    } catch {
      setTemplateMessage('Could not load seating templates.');
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') {
      void loadTemplates();
    }
  }, [activeTab, loadTemplates]);

  const isTemplatesDirty = useMemo(() => {
    if (!initialSeatingSettings || !customSeatingSettings) return false;
    return JSON.stringify(customSeatingSettings) !== JSON.stringify(initialSeatingSettings);
  }, [initialSeatingSettings, customSeatingSettings]);

  const handleDiscardTemplates = () => {
    if (initialSeatingSettings) {
      setCustomSeatingSettings(JSON.parse(JSON.stringify(initialSeatingSettings)));
      setTemplateMessage('');
    }
  };

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
  
  const isWideLayout = true;
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    isSaving, isDirty, error: saveError, assignSinger, updateChart, copyFromPerformance, forceSave, refresh
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

  const handleSaveTemplates = async () => {
    setIsSavingTemplates(true);
    setTemplateMessage('');
    try {
      const formations = customSeatingSettings.formations || [];
      if (formations.length === 0) {
        setTemplateMessage('Error: At least one seating formation must be defined.');
        setIsSavingTemplates(false);
        return;
      }

      const seenFormationNames = new Set<string>();
      const sectionCodes = new Set(allSections.map(s => s.code.toUpperCase()));
      
      for (let i = 0; i < formations.length; i++) {
        const form = formations[i];
        const name = form.name.trim();
        if (!name) {
          setTemplateMessage(`Error: Seating formation name at position ${i + 1} cannot be empty.`);
          setIsSavingTemplates(false);
          return;
        }
        const lowerName = name.toLowerCase();
        if (seenFormationNames.has(lowerName)) {
          setTemplateMessage(`Error: Seating formation name "${name}" is duplicated.`);
          setIsSavingTemplates(false);
          return;
        }
        seenFormationNames.add(lowerName);

        const codes = form.sectionOrder.map(c => c.trim().toUpperCase()).filter(Boolean);
        if (codes.length === 0) {
          setTemplateMessage(`Error: Seating formation "${name}" must have at least one section code.`);
          setIsSavingTemplates(false);
          return;
        }

        for (const code of codes) {
          if (!sectionCodes.has(code)) {
            setTemplateMessage(`Error: Seating formation "${name}" contains unknown section code "${code}".`);
            setIsSavingTemplates(false);
            return;
          }
        }
      }

      await settingsService.saveSeatingSettings(customSeatingSettings);
      setInitialSeatingSettings(JSON.parse(JSON.stringify(customSeatingSettings)));
      setTemplateMessage('Templates saved successfully.');
      
      refresh();
      
      await dialog.showMessage({ title: 'Success', message: 'Seating templates saved successfully.' });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setTemplateMessage(`Error saving templates: ${errMsg}`);
      await dialog.showMessage({ title: 'Error', message: 'Failed to save seating templates.', variant: 'danger' });
    } finally {
      setIsSavingTemplates(false);
    }
  };

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
        
        {activeTab === 'chart' && (
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
                  💾 Update Venue
                </button>
              )}
            </div>

            <div className="flex-row seating-control-item">
              <span className="text-label text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Formation:</span>
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

      {/* Segmented Tab Navigation */}
      <div className="flex-row no-print" style={{ gap: 'var(--space-md)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
        <button
          onClick={() => setActiveTab('chart')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'chart' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'chart' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'chart' ? '600' : '500',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
          }}
        >
          Seating Chart
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'templates' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'templates' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'templates' ? '600' : '500',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
          }}
        >
          Formations Templates
        </button>
      </div>

      {activeTab === 'templates' ? (
        <div className="flex-col" style={{ gap: 'var(--space-xl)', paddingBottom: 'var(--space-2xl)' }}>
          {templateMessage && (
            <div 
              className="badge" 
              style={{ 
                alignSelf: 'flex-start',
                backgroundColor: templateMessage.startsWith('Error') ? '#fee2e2' : '#e0f2fe',
                color: templateMessage.startsWith('Error') ? '#991b1b' : '#0369a1',
                border: templateMessage.startsWith('Error') ? '1px solid #fecaca' : '1px solid #bae6fd',
                padding: 'var(--space-xs) var(--space-sm)'
              }}
            >
              {templateMessage}
            </div>
          )}

          {isLoadingTemplates ? (
            <div style={{ padding: 'var(--space-xl)' }}>Loading seating templates...</div>
          ) : (
            <>
              <AppCard title="Default Seating Formation">
                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <label className="text-label">Default Seating Formation</label>
                  <select
                    value={customSeatingSettings.defaultFormationId}
                    onChange={(e) => setCustomSeatingSettings({ ...customSeatingSettings, defaultFormationId: e.target.value })}
                    className="card"
                    style={{ width: '100%', maxWidth: '400px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                  >
                    {customSeatingSettings.formations?.map(form => (
                      <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                  </select>
                  <p className="text-muted" style={{ margin: 0 }}>
                    This formation logic will be used by default for newly created seating charts.
                  </p>
                </div>
              </AppCard>

              <AppCard title="Seating Formations">
                <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                  <p className="text-muted" style={{ margin: 0 }}>
                    Define reusable seating formations for your choir.
                  </p>

                  {customSeatingSettings.formations?.map((formation, index) => {
                    return (
                      <div key={formation.id} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 2fr 80px', gap: 'var(--space-sm)', alignItems: 'center', width: '100%', padding: 'var(--space-sm)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg)' }}>
                        <input
                          value={formation.name}
                          onChange={(e) => {
                            const newFormations = [...customSeatingSettings.formations];
                            newFormations[index] = { ...newFormations[index], name: e.target.value };
                            setCustomSeatingSettings({ ...customSeatingSettings, formations: newFormations });
                          }}
                          placeholder="Formation Name"
                          className="card"
                          style={{ width: '100%', padding: '0 8px', height: '40px' }}
                        />
                        <select
                          value={formation.strategy}
                          onChange={(e) => {
                            const newFormations = [...customSeatingSettings.formations];
                            newFormations[index] = { ...newFormations[index], strategy: e.target.value as 'vertical_column' | 'horizontal_row' };
                            setCustomSeatingSettings({ ...customSeatingSettings, formations: newFormations });
                          }}
                          className="card"
                          style={{ width: '100%', padding: '0 8px', height: '40px' }}
                        >
                          <option value="vertical_column">Vertical Columns</option>
                          <option value="horizontal_row">Horizontal Rows</option>
                        </select>
                        <div 
                          className="flex-row" 
                          style={{ 
                            alignItems: 'center', 
                            gap: 'var(--space-xs)', 
                            flexWrap: 'wrap', 
                            width: '100%', 
                            minHeight: '40px', 
                            padding: '4px var(--space-sm)', 
                            border: '1px solid var(--border)', 
                            borderRadius: 'var(--radius-md)', 
                            backgroundColor: 'var(--card-bg)' 
                          }}
                        >
                          {formation.sectionOrder.map((code, secIdx) => {
                            const sec = allSections.find(s => s.code.toUpperCase() === code.toUpperCase());
                            const hasSec = !!sec;
                            
                            const bgColor = hasSec ? (sec.color || sec.colorBg || 'var(--border)') : '#fee2e2';
                            const textColor = hasSec ? (sec.colorText || '#000000') : '#991b1b';
                            const borderStyle = hasSec ? '1px solid rgba(0,0,0,0.1)' : '1px solid #ef4444';

                            return (
                              <div
                                key={secIdx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: bgColor,
                                  color: textColor,
                                  border: borderStyle,
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  boxShadow: 'var(--shadow-sm)',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {!hasSec && <span title="Unknown section bucket! Click 'x' to remove." style={{ cursor: 'help' }}>⚠️</span>}
                                  {code}
                                </span>
                                
                                <div 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '2px', 
                                    marginLeft: '4px', 
                                    borderLeft: '1px solid rgba(0,0,0,0.15)', 
                                    paddingLeft: '4px' 
                                  }}
                                >
                                  {secIdx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newFormations = [...customSeatingSettings.formations];
                                        const order = [...newFormations[index].sectionOrder];
                                        const temp = order[secIdx];
                                        order[secIdx] = order[secIdx - 1];
                                        order[secIdx - 1] = temp;
                                        newFormations[index] = { ...newFormations[index], sectionOrder: order };
                                        setCustomSeatingSettings({ ...customSeatingSettings, formations: newFormations });
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'inherit',
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        fontSize: '0.8rem',
                                        opacity: 0.7,
                                        display: 'flex',
                                        alignItems: 'center',
                                      }}
                                      title="Move Left"
                                    >
                                      ◀
                                    </button>
                                  )}
                                  {secIdx < formation.sectionOrder.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newFormations = [...customSeatingSettings.formations];
                                        const order = [...newFormations[index].sectionOrder];
                                        const temp = order[secIdx];
                                        order[secIdx] = order[secIdx + 1];
                                        order[secIdx + 1] = temp;
                                        newFormations[index] = { ...newFormations[index], sectionOrder: order };
                                        setCustomSeatingSettings({ ...customSeatingSettings, formations: newFormations });
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'inherit',
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        fontSize: '0.8rem',
                                        opacity: 0.7,
                                        display: 'flex',
                                        alignItems: 'center',
                                      }}
                                      title="Move Right"
                                    >
                                      ▶
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFormations = [...customSeatingSettings.formations];
                                      const order = newFormations[index].sectionOrder.filter((_, sIdx) => sIdx !== secIdx);
                                      newFormations[index] = { ...newFormations[index], sectionOrder: order };
                                      setCustomSeatingSettings({ ...customSeatingSettings, formations: newFormations });
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'inherit',
                                      cursor: 'pointer',
                                      padding: '0 2px',
                                      fontSize: '0.9rem',
                                      fontWeight: 'bold',
                                      opacity: 0.7,
                                      display: 'flex',
                                      alignItems: 'center',
                                      marginLeft: '2px',
                                    }}
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <select
                              value=""
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                const newFormations = [...customSeatingSettings.formations];
                                newFormations[index] = {
                                  ...newFormations[index],
                                  sectionOrder: [...newFormations[index].sectionOrder, val]
                                };
                                setCustomSeatingSettings({ ...customSeatingSettings, formations: newFormations });
                              }}
                              style={{
                                opacity: 0,
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'pointer',
                                zIndex: 2,
                              }}
                              title="Add section to order"
                            >
                              <option value="" disabled>+ Add Section</option>
                              {allSections.filter(s => s.code).map(s => (
                                <option key={s.code} value={s.code}>
                                  {s.name ? `${s.name} (${s.code})` : s.code}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: '2px 8px',
                                height: '28px',
                                fontSize: '0.8rem',
                                border: '1px dashed var(--border)',
                                backgroundColor: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                pointerEvents: 'none',
                              }}
                            >
                              + Add Section
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newFormations = customSeatingSettings.formations.filter((_, idx) => idx !== index);
                            setCustomSeatingSettings({ ...customSeatingSettings, formations: newFormations });
                          }}
                          className="btn btn-danger btn-sm"
                          style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      const newId = `preset-${Date.now()}`;
                      setCustomSeatingSettings({
                        ...customSeatingSettings,
                        formations: [
                          ...(customSeatingSettings.formations || []),
                          { id: newId, name: 'New Formation', strategy: 'vertical_column', sectionOrder: allSections.map(s => s.code) }
                        ]
                      });
                    }}
                    className="btn btn-secondary"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    + Add Formation Preset
                  </button>
                </div>
              </AppCard>

              <FloatingSaveBar 
                isDirty={isTemplatesDirty} 
                isSaving={isSavingTemplates} 
                onSave={handleSaveTemplates} 
                onDiscard={handleDiscardTemplates} 
              />
            </>
          )}
        </div>
      ) : performanceId && venueId ? (
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
                />
                
                {(!selectedVenue?.isOpenSeating && singersListPosition === 'bottom' && printMode === 'visual') && (
                  <SeatingBottomDock 
                    activeProfiles={activeProfiles}
                    assignments={optimisticAssignments}
                    sections={sections}
                    voiceParts={voiceParts}
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
