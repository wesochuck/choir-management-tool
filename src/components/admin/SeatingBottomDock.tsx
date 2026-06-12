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

  const groupsWithSingers = useMemo(() => {
    return displaySections
      .map(section => ({
        ...section,
        singers: groupedSingers[section.key] || []
      }))
      .filter(section => section.singers.length > 0);
  }, [displaySections, groupedSingers]);

  return (
    <div className="no-print mt-4 rounded-xl border border-border bg-primary-light/70 p-3">
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
        className="flex flex-col gap-3"
      >
        <div className="flex w-full flex-row flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex flex-col gap-0.5">
            <div className="flex flex-row flex-wrap items-center gap-2">
              <h3 className="m-0 text-base leading-tight font-bold text-primary-deep">Unassigned Singers</h3>
              <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-primary-deep shadow-xs">
                {unassigned.length}
              </span>
            </div>
            <span className="text-muted text-[11px]">Drag up to assign, or drop assigned seats here to clear.</span>
          </div>
          <div className="no-print flex flex-row flex-wrap justify-end gap-1">
            {onLookupSinger && (
              <button
                type="button"
                onClick={onLookupSinger}
                className="font-medium tracking-wide inline-flex h-8 min-h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs whitespace-nowrap text-primary-deep shadow-xs"
              >
                🔍 Lookup
              </button>
            )}
            {onAddSinger && (
              <button
                type="button"
                onClick={onAddSinger}
                className="font-medium tracking-wide inline-flex h-8 min-h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs whitespace-nowrap text-primary-deep shadow-xs"
              >
                + Add
              </button>
            )}
          </div>
        </div>
        <div className="flex max-h-[190px] flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-surface p-2">
          {groupsWithSingers.map(({ key, label, color, singers }) => {
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
              <section key={key} className="flex flex-col gap-1.5">
                <div className="flex flex-row items-center gap-2">
                  <span className="text-sm leading-tight font-bold" style={labelStyle}>
                    {label}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold tracking-wider text-primary-deep uppercase" style={badgeStyle}>
                    {list.length}
                  </span>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-1.5">
                  {singers.map(p => (
                    <div 
                      key={p.id}
                      data-unassigned-singer-chip
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ profileId: p.id }))}
                      className="group flex h-8 min-h-8 cursor-grab flex-row items-center justify-between gap-1 rounded-md border border-border bg-bg px-2 text-xs leading-[1.2] shadow-xs transition-colors hover:border-primary/60 hover:bg-primary-light/40"
                    >
                      <span className="min-w-0 flex-1 truncate" title={p.name}>
                        {uniqueDisplayNames[p.id] || p.name.split(' ').pop()}
                      </span>
                      {!isVoicePartLayout && (
                        <span className="inline-flex items-center rounded bg-primary-light px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary-deep uppercase">
                          {p.voicePart}
                        </span>
                      )}
                      {onRemoveRsvp && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRsvp(p.id, p.name);
                          }}
                          className="no-print flex size-[18px] min-h-[18px] shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-xs font-bold text-text-muted opacity-0 transition-all duration-200 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-700"
                          title="Mark as Not Attending"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
          {groupsWithSingers.length === 0 && (
            <div className="text-muted flex min-h-[72px] items-center justify-center rounded-md border border-dashed border-border bg-bg text-sm font-medium">
              All singers assigned
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
