import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { settingsService, getVoicePartsAndSections, type SectionDef, type SeatingSettings, type SeatingFormationDef } from '../../services/settingsService';
import { AppCard } from '../common/AppCard';
import { FloatingSaveBar } from './FloatingSaveBar';
import { useDialog } from '../../contexts/DialogContext';

interface FormationSectionPillProps {
  dndId: string;
  label: string;
  hasSec: boolean;
  bgColor: string;
  textColor: string;
  borderColor: string;
  isRows: boolean;
  onRemove: () => void;
}

function FormationSectionPill({ dndId, label, hasSec, bgColor, textColor, borderColor, isRows, onRemove }: FormationSectionPillProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : (transition ?? undefined),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: isRows ? '6px 10px' : '4px 8px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: bgColor,
    color: textColor,
    border: `1px solid ${borderColor}`,
    fontSize: '0.85rem',
    fontWeight: 600,
    boxShadow: 'var(--shadow-sm)',
    cursor: 'grab',
    userSelect: 'none',
    // fill width when displaying as a row
    ...(isRows ? { width: '100%', boxSizing: 'border-box' as const, justifyContent: 'space-between' } : {}),
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{ display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.55, fontSize: '1rem', cursor: 'grab', flexShrink: 0 }}
        title="Drag to reorder"
      >
        ⣿
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {!hasSec && <span title="Unknown section — click × to remove" style={{ cursor: 'help', flexShrink: 0 }}>⚠️</span>}
        {label}
      </span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '0 2px',
          fontSize: '1rem',
          fontWeight: 'bold',
          opacity: 0.65,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          lineHeight: 1,
        }}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

interface FormationRowProps {
  formation: SeatingFormationDef;
  formationIndex: number;
  allSections: SectionDef[];
  setCustomSeatingSettings: React.Dispatch<React.SetStateAction<SeatingSettings>>;
}

function FormationRow({ formation, formationIndex, allSections, setCustomSeatingSettings }: FormationRowProps) {
  const isRows = formation.strategy === 'horizontal_row';
  const dndItems = formation.sectionOrder.map((code, i) => `${formation.id}::${code}::${i}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = dndItems.indexOf(active.id as string);
    const newIdx = dndItems.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const newOrder = arrayMove(formation.sectionOrder, oldIdx, newIdx);
    setCustomSeatingSettings((prev) => {
      const newFormations = [...prev.formations];
      newFormations[formationIndex] = { ...newFormations[formationIndex], sectionOrder: newOrder };
      return { ...prev, formations: newFormations };
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        width: '100%',
        padding: 'var(--space-sm)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg)',
      }}
    >
      {/* Row 1: name input + strategy select + delete */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px auto', gap: 'var(--space-sm)', alignItems: 'center' }}>
        <input
          value={formation.name}
          onChange={(e) => {
            setCustomSeatingSettings((prev) => {
              const newFormations = [...prev.formations];
              newFormations[formationIndex] = { ...newFormations[formationIndex], name: e.target.value };
              return { ...prev, formations: newFormations };
            });
          }}
          placeholder="Formation Name"
          className="card"
          style={{ width: '100%', padding: '0 8px', height: '38px' }}
        />
        <select
          value={formation.strategy}
          onChange={(e) => {
            setCustomSeatingSettings((prev) => {
              const newFormations = [...prev.formations];
              newFormations[formationIndex] = { ...newFormations[formationIndex], strategy: e.target.value as 'vertical_column' | 'horizontal_row' };
              return { ...prev, formations: newFormations };
            });
          }}
          className="card"
          style={{ width: '100%', padding: '0 8px', height: '38px' }}
        >
          <option value="vertical_column">Vertical Columns</option>
          <option value="horizontal_row">Horizontal Rows</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setCustomSeatingSettings((prev) => {
              const newFormations = prev.formations.filter((_, idx) => idx !== formationIndex);
              return { ...prev, formations: newFormations };
            });
          }}
          className="btn btn-danger btn-sm"
          style={{ height: '38px', minHeight: '38px', whiteSpace: 'nowrap', padding: '0 14px' }}
        >
          Delete
        </button>
      </div>

      {/* Row 2: section order preview */}
      <div
        style={{
          padding: '6px 8px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--card-bg)',
          minHeight: '44px',
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={dndItems} strategy={horizontalListSortingStrategy}>
            <div
              style={{
                display: 'flex',
                flexDirection: isRows ? 'column' : 'row',
                gap: isRows ? '4px' : '6px',
                flexWrap: isRows ? 'nowrap' : 'wrap',
                alignItems: isRows ? 'stretch' : 'center',
              }}
            >
              {formation.sectionOrder.map((code, secIdx) => {
                const sec = allSections.find(s => s.code.toUpperCase() === code.toUpperCase());
                const hasSec = !!sec;
                const bgColor = hasSec ? (sec.color || sec.colorBg || 'var(--border)') : '#fee2e2';
                const textColor = hasSec ? (sec.colorText || '#000000') : '#991b1b';
                const borderColor = hasSec ? 'rgba(0,0,0,0.12)' : '#ef4444';
                const label = hasSec && sec.name ? `${sec.name} (${code})` : code;
                const dndId = dndItems[secIdx];
                return (
                  <FormationSectionPill
                    key={dndId}
                    dndId={dndId}
                    label={label}
                    hasSec={hasSec}
                    bgColor={bgColor}
                    textColor={textColor}
                    borderColor={borderColor}
                    isRows={isRows}
                    onRemove={() => {
                      setCustomSeatingSettings((prev) => {
                        const newFormations = [...prev.formations];
                        const order = newFormations[formationIndex].sectionOrder.filter((_, sIdx) => sIdx !== secIdx);
                        newFormations[formationIndex] = { ...newFormations[formationIndex], sectionOrder: order };
                        return { ...prev, formations: newFormations };
                      });
                    }}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Section trigger */}
        <div style={{ position: 'relative', display: 'inline-block', marginTop: formation.sectionOrder.length > 0 ? '6px' : '0' }}>
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (!val) return;
              setCustomSeatingSettings((prev) => {
                const newFormations = [...prev.formations];
                newFormations[formationIndex] = {
                  ...newFormations[formationIndex],
                  sectionOrder: [...newFormations[formationIndex].sectionOrder, val],
                };
                return { ...prev, formations: newFormations };
              });
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
              height: '26px',
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
    </div>
  );
}

interface SeatingFormationsEditorProps {
  onSaveSuccess?: () => void;
}

export function SeatingFormationsEditor({ onSaveSuccess }: SeatingFormationsEditorProps) {
  const dialog = useDialog();
  
  // Templates Independent Settings State
  const [customSeatingSettings, setCustomSeatingSettings] = useState<SeatingSettings>({
    defaultFormationId: 'columns-standard',
    formations: []
  });
  const [initialSeatingSettings, setInitialSeatingSettings] = useState<SeatingSettings | null>(null);
  const [allSections, setAllSections] = useState<SectionDef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const [seating, voiceData] = await Promise.all([
        settingsService.getSeatingSettings(),
        getVoicePartsAndSections(),
      ]);
      setCustomSeatingSettings(JSON.parse(JSON.stringify(seating)));
      setInitialSeatingSettings(JSON.parse(JSON.stringify(seating)));
      setAllSections(voiceData.sections);
    } catch {
      setMessage('Could not load seating templates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const isDirty = useMemo(() => {
    if (!initialSeatingSettings) return false;
    return JSON.stringify(customSeatingSettings) !== JSON.stringify(initialSeatingSettings);
  }, [initialSeatingSettings, customSeatingSettings]);

  const handleDiscard = () => {
    if (initialSeatingSettings) {
      setCustomSeatingSettings(JSON.parse(JSON.stringify(initialSeatingSettings)));
      setMessage('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const formations = customSeatingSettings.formations || [];
      if (formations.length === 0) {
        setMessage('Error: At least one seating formation must be defined.');
        setIsSaving(false);
        return;
      }

      const seenFormationNames = new Set<string>();
      const sectionCodes = new Set(allSections.map(s => s.code.toUpperCase()));
      
      for (let i = 0; i < formations.length; i++) {
        const form = formations[i];
        const name = form.name.trim();
        if (!name) {
          setMessage(`Error: Seating formation name at position ${i + 1} cannot be empty.`);
          setIsSaving(false);
          return;
        }
        const lowerName = name.toLowerCase();
        if (seenFormationNames.has(lowerName)) {
          setMessage(`Error: Seating formation name "${name}" is duplicated.`);
          setIsSaving(false);
          return;
        }
        seenFormationNames.add(lowerName);

        const codes = form.sectionOrder.map(c => c.trim().toUpperCase()).filter(Boolean);
        if (codes.length === 0) {
          setMessage(`Error: Seating formation "${name}" must have at least one section code.`);
          setIsSaving(false);
          return;
        }

        for (const code of codes) {
          if (!sectionCodes.has(code)) {
            setMessage(`Error: Seating formation "${name}" contains unknown section code "${code}".`);
            setIsSaving(false);
            return;
          }
        }
      }

      await settingsService.saveSeatingSettings(customSeatingSettings);
      setInitialSeatingSettings(JSON.parse(JSON.stringify(customSeatingSettings)));
      setMessage('Templates saved successfully.');
      
      onSaveSuccess?.();
      
      dialog.showToast('Seating templates saved successfully.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage(`Error saving templates: ${errMsg}`);
      await dialog.showMessage({ title: 'Error', message: 'Failed to save seating templates.', variant: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: 'var(--space-xl)' }}>Loading seating templates...</div>;
  }

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', paddingBottom: 'var(--space-2xl)' }}>
      {message && (
        <div 
          className="badge" 
          style={{ 
            alignSelf: 'flex-start',
            backgroundColor: message.startsWith('Error') ? '#fee2e2' : '#e0f2fe',
            color: message.startsWith('Error') ? '#991b1b' : '#0369a1',
            border: message.startsWith('Error') ? '1px solid #fecaca' : '1px solid #bae6fd',
            padding: 'var(--space-xs) var(--space-sm)'
          }}
        >
          {message}
        </div>
      )}

      <AppCard title="Default Seating Formation">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Default Seating Formation</label>
          <select
            value={customSeatingSettings.defaultFormationId}
            onChange={(e) => setCustomSeatingSettings((prev) => ({ ...prev, defaultFormationId: e.target.value }))}
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
          <div className="flex-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <p className="text-muted" style={{ margin: 0 }}>
              Define reusable seating formations for your choir.
            </p>
            <Link 
              to="/admin/roster" 
              className="btn btn-ghost btn-sm"
              style={{ 
                fontSize: '0.8125rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px',
                color: 'var(--primary)',
                fontWeight: 600,
                padding: '4px 8px',
              }}
            >
              🎨 Edit Section Colors in Roster
            </Link>
          </div>

          {customSeatingSettings.formations?.map((formation, formationIndex) => (
            <FormationRow
              key={formation.id}
              formation={formation}
              formationIndex={formationIndex}
              allSections={allSections}
              setCustomSeatingSettings={setCustomSeatingSettings}
            />
          ))}

          <button
            type="button"
            onClick={() => {
              const newId = `preset-${Date.now()}`;
              setCustomSeatingSettings((prev) => ({
                ...prev,
                formations: [
                  ...(prev.formations || []),
                  { id: newId, name: 'New Formation', strategy: 'vertical_column', sectionOrder: allSections.map(s => s.code) }
                ]
              }));
            }}
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-start' }}
          >
            + Add Formation Preset
          </button>
        </div>
      </AppCard>

      <FloatingSaveBar 
        isDirty={isDirty} 
        isSaving={isSaving} 
        onSave={handleSave} 
        onDiscard={handleDiscard} 
      />
    </div>
  );
}
