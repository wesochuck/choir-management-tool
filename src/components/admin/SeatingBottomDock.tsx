import { useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import { groupSingersBySection } from '../../lib/seatingSync';
import { getUniqueDisplayNames } from '../../lib/stringUtils';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';

function getContrastColor(hex: string): string {
  if (!hex || hex.length < 6) return '#000000';
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
}

interface SeatingBottomDockProps {
  activeProfiles: Profile[];
  assignments: Record<string, string>;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
  assignSinger: (seatKey: string, profileId: string, fromSeatKey?: string) => Promise<void>;
  onAddSinger?: () => void;
  onLookupSinger?: () => void;
  onRemoveRsvp?: (profileId: string, name: string) => void;
}

export function SeatingBottomDock({
  activeProfiles,
  assignments,
  sections,
  voiceParts,
  assignSinger,
  onAddSinger,
  onLookupSinger,
  onRemoveRsvp
}: SeatingBottomDockProps) {
  const assignedIds = useMemo(() => new Set(Object.values(assignments)), [assignments]);
  const grouped = useMemo(() => groupSingersBySection(activeProfiles, assignedIds, sections, voiceParts), [activeProfiles, assignedIds, sections, voiceParts]);

  const uniqueDisplayNames = useMemo(() => {
    return getUniqueDisplayNames(activeProfiles);
  }, [activeProfiles]);

  const displaySections = useMemo(() => {
    const list = sections.map(s => ({ key: s.code, label: s.name }));
    if (grouped.Other && grouped.Other.length > 0) {
      list.push({ key: 'Other', label: 'Other' });
    }
    return list;
  }, [sections, grouped.Other]);

  return (
    <div className="no-print seating-bottom-dock">
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
        className="flex-col bottom-dock-container"
      >
        <div className="flex-row bottom-dock-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="flex-col" style={{ gap: '2px' }}>
            <h3 className="text-headline bottom-dock-title">📥 Unassigned Singers Shelf</h3>
            <span className="text-muted bottom-dock-subtitle">Drag up to assign, or drop here to clear a seat assignment.</span>
          </div>
          <div className="flex-row no-print" style={{ gap: 'var(--space-xs)' }}>
            {onLookupSinger && (
              <button
                type="button"
                onClick={onLookupSinger}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '0 12px', height: '32px', minHeight: '32px' }}
              >
                🔍 Lookup Singer
              </button>
            )}
            {onAddSinger && (
              <button
                type="button"
                onClick={onAddSinger}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '0 12px', height: '32px', minHeight: '32px' }}
              >
                + Add New Singer
              </button>
            )}
          </div>
        </div>

        <div className="bottom-dock-grid" style={{ gridTemplateColumns: `repeat(${displaySections.length}, 1fr)` }}>
          {displaySections.map(({ key, label }) => {
            const list = grouped[key] || [];
            const sectionDef = sections.find(s => s.code === key);
            const secColor = sectionDef?.color || sectionDef?.colorBg;
            const badgeStyle = secColor ? {
              backgroundColor: secColor,
              color: getContrastColor(secColor),
              border: `1px solid ${secColor}`
            } : undefined;
            const labelStyle = secColor ? {
              color: secColor,
              fontWeight: 700
            } : undefined;

            return (
              <div key={key} className="flex-col bottom-dock-lane">
                <div className="flex-row bottom-dock-lane-header">
                  <span className="text-label lane-label" style={labelStyle}>
                    {label}
                  </span>
                  <span className="badge badge-rehearsal lane-badge" style={badgeStyle}>
                    {list.length}
                  </span>
                </div>

                <div className="flex-col bottom-dock-lane-list">
                  {list.map(p => (
                    <div 
                      key={p.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ profileId: p.id }))}
                      className="flex-row bottom-dock-singer-card"
                    >
                      <span className="singer-card-name" title={p.name}>
                        {uniqueDisplayNames[p.id] || p.name.split(' ').pop()}
                      </span>
                      <span className="badge badge-rehearsal singer-card-badge">
                        {p.voicePart}
                      </span>
                      {onRemoveRsvp && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRsvp(p.id, p.name);
                          }}
                          className="no-print bottom-dock-remove-btn"
                          title="Mark as Not Attending"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: 0,
                            marginLeft: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                            e.currentTarget.style.color = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="bottom-dock-empty-lane">
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
