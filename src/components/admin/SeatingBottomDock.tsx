import { useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import { getUniqueDisplayNames } from '../../lib/stringUtils';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import { getContrastColor } from '../../lib/colorUtils';


interface SeatingBottomDockProps {
  activeProfiles: Profile[];
  assignments: Record<string, string>;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
  assignSinger: (seatKey: string, profileId: string, fromSeatKey?: string) => Promise<void>;
  onAddSinger?: () => void;
  onLookupSinger?: () => void;
  onRemoveRsvp?: (profileId: string, name: string) => void;
  isVoicePartLayout?: boolean;
  sectionOrder?: string[];
}

export function SeatingBottomDock({
  activeProfiles,
  assignments,
  sections,
  voiceParts,
  assignSinger,
  onAddSinger,
  onLookupSinger,
  onRemoveRsvp,
  isVoicePartLayout = false,
  sectionOrder
}: SeatingBottomDockProps) {
  const assignedIds = useMemo(() => new Set(Object.values(assignments)), [assignments]);

  const unassigned = useMemo(() => {
    return activeProfiles.filter(p => !assignedIds.has(p.id));
  }, [activeProfiles, assignedIds]);

  const uniqueDisplayNames = useMemo(() => {
    return getUniqueDisplayNames(activeProfiles);
  }, [activeProfiles]);

  const displaySections = useMemo(() => {
    const order = sectionOrder && sectionOrder.length > 0
      ? sectionOrder
      : (isVoicePartLayout ? voiceParts.map(vp => vp.label) : sections.map(s => s.code));

    if (isVoicePartLayout) {
      return order.map(laneKey => {
        const vpDef = voiceParts.find(vp => vp.label === laneKey);
        return {
          key: laneKey,
          label: vpDef ? vpDef.label : laneKey,
          color: (() => {
            if (vpDef) {
              if (vpDef.color) return vpDef.color;
              const parentSec = sections.find(s => s.code === vpDef.sectionCode);
              return parentSec?.color || parentSec?.colorBg || '';
            }
            return '';
          })()
        };
      });
    } else {
      return order.map(laneKey => {
        const sectionDef = sections.find(s => s.code === laneKey);
        return {
          key: laneKey,
          label: sectionDef?.name || laneKey,
          color: sectionDef?.color || sectionDef?.colorBg || ''
        };
      });
    }
  }, [isVoicePartLayout, sectionOrder, sections, voiceParts]);

  const groupedSingers = useMemo(() => {
    const groups: Record<string, Profile[]> = {};
    displaySections.forEach(ds => {
      groups[ds.key] = [];
    });

    const hasOtherLane = displaySections.some(ds => ds.key === 'Other');

    unassigned.forEach(p => {
      let matchedLaneKey: string | null = null;

      if (isVoicePartLayout) {
        for (const ds of displaySections) {
          if (ds.key === 'Other') continue;
          const vpDef = voiceParts.find(vp => vp.label === ds.key);
          const part = (p.voicePart || '').trim().toLowerCase();
          if (
            part === ds.key.toLowerCase() ||
            (vpDef && part === vpDef.fullName.toLowerCase())
          ) {
            matchedLaneKey = ds.key;
            break;
          }
        }
      } else {
        const vpDef = voiceParts.find(vp => 
          vp.label === p.voicePart || 
          vp.fullName === p.voicePart || 
          vp.label.toLowerCase() === p.voicePart.toLowerCase() ||
          vp.fullName.toLowerCase() === p.voicePart.toLowerCase()
        );
        let sectionCode = vpDef?.sectionCode;
        if (!sectionCode) {
          const part = p.voicePart ? p.voicePart.trim() : '';
          if (/^(soprano|s)(\s*\d+)?$/i.test(part)) sectionCode = 'S';
          else if (/^(alto|a)(\s*\d+)?$/i.test(part)) sectionCode = 'A';
          else if (/^(tenor|t)(\s*\d+)?$/i.test(part)) sectionCode = 'T';
          else if (/^(bass|b|baritone|bar)(\s*\d+)?$/i.test(part)) sectionCode = 'B';
        }

        if (sectionCode && groups[sectionCode] !== undefined) {
          matchedLaneKey = sectionCode;
        }
      }

      if (matchedLaneKey) {
        groups[matchedLaneKey].push(p);
      } else if (hasOtherLane) {
        if (!groups.Other) groups.Other = [];
        groups.Other.push(p);
      }
    });

    return groups;
  }, [unassigned, isVoicePartLayout, displaySections, voiceParts]);

  return (
    <div className="no-print mt-4 rounded-xl border border-border bg-primary-light p-2">
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
            console.error('Failed to parse bottom dock drop data', err);
          }
        }}
        className="flex-col gap-2"
      >
        <div className="flex w-full flex-row items-center justify-between">
          <div className="flex-col gap-0.5">
            <h3 className="text-headline m-0 text-[1.05rem] text-primary-deep">📥 Unassigned Singers Shelf</h3>
            <span className="text-muted text-[11px]">Drag up to assign, or drop here to clear a seat assignment.</span>
          </div>
          <div className="no-print flex-row gap-1">
            {onLookupSinger && (
              <button
                type="button"
                onClick={onLookupSinger}
                className="flex h-8 min-h-[32px] items-center gap-1.5 whitespace-nowrap rounded-md bg-primary-light px-3 text-xs font-label text-primary-deep"
              >
                🔍 Lookup Singer
              </button>
            )}
            {onAddSinger && (
              <button
                type="button"
                onClick={onAddSinger}
                className="flex h-8 min-h-[32px] items-center gap-1.5 whitespace-nowrap rounded-md bg-primary-light px-3 text-xs font-label text-primary-deep"
              >
                + Add New Singer
              </button>
            )}
          </div>
        </div>
        <div 
          className="grid h-[220px] gap-2" 
          // @allow-inline-style - dynamic grid columns based on section count
          style={{ gridTemplateColumns: `repeat(${displaySections.length}, 1fr)` }}
        >
          {displaySections.map(({ key, label, color }) => {
            const list = groupedSingers[key] || [];
            const secColor = color;
            const badgeStyle = secColor ? {
              // @allow-inline-style - dynamic badge color matching section
              backgroundColor: secColor,
              color: getContrastColor(secColor),
              border: `1px solid ${secColor}`
            } : undefined;
            const labelStyle = secColor ? {
              // @allow-inline-style - dynamic text color matching section
              color: secColor
            } : undefined;

            return (
              <div key={key} className="flex h-full flex-col gap-1 overflow-hidden rounded-lg border border-border bg-surface p-1.5">
                <div className="flex-row items-center justify-between border-b border-border pb-1">
                  <span className="text-label font-bold" style={labelStyle}>
                    {label}
                  </span>
                  <span className="inline-flex items-center rounded bg-primary-light px-2 py-0.5 text-xs font-semibold tracking-wider text-primary-deep uppercase" style={badgeStyle}>
                    {list.length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-[3px] overflow-y-auto pr-0.5 mt-0.5">
                  {list.map(p => (
                    <div 
                      key={p.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ profileId: p.id }))}
                      className="flex h-[26px] min-h-[26px] cursor-grab flex-row items-center justify-between gap-1 rounded-lg border border-border bg-bg px-1.5 text-xs shadow-sm leading-[1.2]"
                    >
                      <span className="min-w-0 flex-1 truncate" title={p.name}>
                        {uniqueDisplayNames[p.id] || p.name.split(' ').pop()}
                      </span>
                      <span className="inline-flex items-center rounded bg-primary-light px-2 py-0.5 text-xs font-semibold tracking-wider text-primary-deep uppercase">
                        {p.voicePart}
                      </span>
                      {onRemoveRsvp && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRsvp(p.id, p.name);
                          }}
                          className="no-print ml-1.5 flex size-[18px] min-h-[18px] shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-xs font-bold text-text-muted transition-all duration-200 hover:bg-red-500/15 hover:text-red-700"
                          title="Mark as Not Attending"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="flex flex-1 items-center justify-center opacity-40 text-[10px]">
                      <span>Empty</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
