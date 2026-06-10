import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { settingsService, getVoicePartsAndSections, type SectionDef, type VoicePartDef, type SeatingSettings, type SeatingFormationDef } from '../../services/settingsService';
import { AppCard } from '../common/AppCard';
import { FloatingSaveBar } from './FloatingSaveBar';
import { useDialog } from '../../contexts/DialogContext';
import { toggleAccordion } from '../../lib/seatingFormationsUtils';




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
        className="flex items-center text-inherit opacity-55 text-base cursor-grab shrink-0"
        title="Drag to reorder"
      >
        ⣿
      </span>
      <span className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
        {!hasSec &&                     <span title="Unknown item — click × to remove" className="cursor-help shrink-0">⚠️</span>}
        {label}
      </span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="bg-none border-none text-inherit cursor-pointer px-0.5 text-base font-bold opacity-65 flex items-center shrink-0 leading-none"
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
  allVoiceParts: VoicePartDef[];
  setCustomSeatingSettings: React.Dispatch<React.SetStateAction<SeatingSettings>>;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function FormationRow({ 
  formation, 
  formationIndex, 
  allSections, 
  allVoiceParts, 
  setCustomSeatingSettings,
  isExpanded,
  onToggleExpand
}: FormationRowProps) {
  const isRows = formation.strategy === 'horizontal_row';
  const isVoice = !!formation.isVoicePartLayout;
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
      className="flex flex-col w-full p-2 border border-border rounded-lg bg-bg transition-all duration-200 ease-out"
      // @allow-inline-style - expansion toggle
      style={{ gap: isExpanded ? 'var(--space-sm)' : '0' }}
    >
      {/* Collapsible Accordion Header */}
      <div
        onClick={onToggleExpand}
        className="flex justify-between items-center cursor-pointer py-1 select-none"
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-[1.05rem] text-text">
            {formation.name || 'New Formation'}
          </span>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-light)] text-text-muted border border-border"
          >
            {isRows ? 'Horizontal Rows' : 'Vertical Columns'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // prevent collapsing triggers
              setCustomSeatingSettings((prev) => {
                const newFormations = prev.formations.filter((_, idx) => idx !== formationIndex);
                return { ...prev, formations: newFormations };
              });
            }}
            className="bg-none border-none text-red-600 cursor-pointer inline-flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded transition-colors duration-200"
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-light)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            🗑 Delete template
          </button>
          <span className="text-sm text-text-muted font-bold pr-1">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Collapsible details body container */}
      <div
        className={isExpanded ? 'flex flex-col gap-2 border-t border-border pt-2' : 'hidden'}
      >
        {/* Row 1: name input + strategy select */}
        <div className="grid grid-cols-[1fr_170px] gap-2 items-center">
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
            className="card w-full px-2 h-[38px]"
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
            className="card w-full px-2 h-[38px]"
          >
            <option value="vertical_column">Vertical Columns</option>
            <option value="horizontal_row">Horizontal Rows</option>
          </select>
        </div>

        {/* Checkbox: Voice Part Layout Toggle */}
        <div className="flex items-center px-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
            <input
              type="checkbox"
              checked={isVoice}
              onChange={(e) => {
                const checked = e.target.checked;
                setCustomSeatingSettings((prev) => {
                  const newFormations = [...prev.formations];
                  newFormations[formationIndex] = {
                    ...newFormations[formationIndex],
                    isVoicePartLayout: checked,
                    sectionOrder: [] // Clear previous order to avoid mismatching items
                  };
                  return { ...prev, formations: newFormations };
                });
              }}
              className="accent-primary cursor-pointer w-[15px] h-[15px]"
            />
            Layout by Voice Parts (S1, S2...) instead of Section Buckets
          </label>
        </div>

        {/* Row 2: section/voice part order preview */}
        <div className="p-[6px_8px] border border-border rounded-lg bg-surface min-h-[44px]">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={dndItems} strategy={horizontalListSortingStrategy}>
              <div
                // @allow-inline-style - row vs grid layout toggle
                style={{
                  display: 'flex',
                  flexDirection: isRows ? 'column' : 'row',
                  gap: isRows ? '4px' : '6px',
                  flexWrap: isRows ? 'nowrap' : 'wrap',
                  alignItems: isRows ? 'stretch' : 'center',
                }}
              >
                {formation.sectionOrder.map((code, secIdx) => {
                  const itemDndId = `${formation.id}::${code}::${secIdx}`;
                  let label = code;
                  let color = '#7f8c8d';
                  let itemResolved = false;

                  if (isVoice) {
                    const vp = allVoiceParts.find(v => v.label === code);
                    if (vp) {
                      label = vp.fullName;
                      const parentSec = allSections.find(s => s.code === vp.sectionCode);
                      color = vp.color || vp.colorBg || parentSec?.color || parentSec?.colorBg || color;
                      itemResolved = true;
                    }
                  } else {
                    const sec = allSections.find(s => s.code === code);
                    if (sec) {
                      label = sec.name;
                      color = sec.color || sec.colorBg || color;
                      itemResolved = true;
                    }
                  }

                  const bg = `${color}22`;

                  return (
                    <FormationSectionPill
                      key={itemDndId}
                      dndId={itemDndId}
                      label={label}
                      hasSec={itemResolved}
                      bgColor={bg}
                      textColor={color}
                      borderColor={color}
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
        </div>

        {/* Row 3: Section/Voice dropdown pill creators */}
        <div className="flex flex-wrap gap-1 items-center">
          <div
            className={`relative inline-block${formation.sectionOrder.length > 0 ? ' mt-[6px]' : ''}`}
          >              <select
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
              className="opacity-0 absolute top-0 left-0 w-full h-full cursor-pointer z-[2]"
              title={isVoice ? "Add voice part to order" : "Add section to order"}
            >
              <option value="" disabled>{isVoice ? "+ Add Voice Part" : "+ Add Section"}</option>
              {isVoice ? (
                allVoiceParts.filter(vp => vp.label && !formation.sectionOrder.includes(vp.label)).map(vp => (
                  <option key={vp.label} value={vp.label}>
                    {vp.fullName} ({vp.label})
                  </option>
                ))
              ) : (
                allSections.filter(s => s.code && !formation.sectionOrder.includes(s.code)).map(s => (
                  <option key={s.code} value={s.code}>
                    {s.name ? `${s.name} (${s.code})` : s.code}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="btn btn-secondary btn-sm px-2 h-[26px] text-[0.8rem] border border-dashed border-border bg-transparent flex items-center gap-1 pointer-events-none"
            >
              {isVoice ? "+ Add Voice Part" : "+ Add Section"}
            </button>
          </div>
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
  const [expandedFormationId, setExpandedFormationId] = useState<string | null>(null);
  const [allSections, setAllSections] = useState<SectionDef[]>([]);
  const [allVoiceParts, setAllVoiceParts] = useState<VoicePartDef[]>([]);
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
      setAllVoiceParts(voiceData.voiceParts);
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
      const voicePartLabels = new Set(allVoiceParts.map(vp => vp.label.toUpperCase()));
      
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
          setMessage(`Error: Seating formation "${name}" must have at least one section or voice part.`);
          setIsSaving(false);
          return;
        }

        const isVoice = !!form.isVoicePartLayout;
        const validCodes = isVoice ? voicePartLabels : sectionCodes;

        for (const code of codes) {
          if (!validCodes.has(code)) {
            setMessage(`Error: Seating formation "${name}" contains unknown ${isVoice ? 'voice part' : 'section'} code "${code}".`);
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
    return <div className="p-8">Loading seating templates...</div>;
  }

  return (
    <div className="flex-col gap-8 pb-16">
      {message && (
        <div 
          className={`inline-flex items-center rounded text-xs font-semibold uppercase tracking-wider self-start px-2 py-1 ${message.startsWith('Error') ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-sky-100 text-sky-700 border border-sky-200'}`}
        >
          {message}
        </div>
      )}

      <AppCard title="Default Seating Formation">
          <div className="flex-col gap-1">
          <label className="text-label">Default Seating Formation</label>
          <select
            value={customSeatingSettings.defaultFormationId}
            onChange={(e) => setCustomSeatingSettings((prev) => ({ ...prev, defaultFormationId: e.target.value }))}
            className="card w-full max-w-[400px] px-3 h-10 border border-border rounded-lg"
          >
            {customSeatingSettings.formations?.map(form => (
              <option key={form.id} value={form.id}>{form.name}</option>
            ))}
          </select>
          <p className="text-muted m-0">
            This formation logic will be used by default for newly created seating charts.
          </p>
        </div>
      </AppCard>

      <AppCard title="Seating Formations">
        <div className="flex-col gap-4">
          <div className="flex-row flex-wrap justify-between items-center gap-2">
          <p className="text-muted m-0">
              Define reusable seating formations for your choir.
            </p>
            <Link 
              to="/admin/roster" 
              className="btn btn-ghost btn-sm text-sm inline-flex items-center gap-[6px] text-primary font-semibold px-2 py-1"
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
              allVoiceParts={allVoiceParts}
              setCustomSeatingSettings={setCustomSeatingSettings}
              isExpanded={expandedFormationId === formation.id}
              onToggleExpand={() => setExpandedFormationId(prev => toggleAccordion(prev, formation.id))}
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
            className="btn btn-secondary self-start"
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
