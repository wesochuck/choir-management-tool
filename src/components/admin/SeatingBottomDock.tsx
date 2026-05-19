import { useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import { groupSingersBySection } from '../../lib/seatingSync';
import { getUniqueDisplayNames } from '../../lib/stringUtils';

interface SeatingBottomDockProps {
  activeProfiles: Profile[];
  assignments: Record<string, string>;
  assignSinger: (seatKey: string, profileId: string, fromSeatKey?: string) => Promise<void>;
}

export function SeatingBottomDock({
  activeProfiles,
  assignments,
  assignSinger
}: SeatingBottomDockProps) {
  const assignedIds = useMemo(() => new Set(Object.values(assignments)), [assignments]);
  const grouped = useMemo(() => groupSingersBySection(activeProfiles, assignedIds), [activeProfiles, assignedIds]);

  const uniqueDisplayNames = useMemo(() => {
    return getUniqueDisplayNames(activeProfiles);
  }, [activeProfiles]);

  const sections: { key: 'S' | 'A' | 'T' | 'B' | 'Other'; label: string }[] = [
    { key: 'S', label: 'Sopranos' },
    { key: 'A', label: 'Altos' },
    { key: 'T', label: 'Tenors' },
    { key: 'B', label: 'Basses' },
    { key: 'Other', label: 'Other' },
  ];

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
        <div className="flex-row bottom-dock-header">
          <h3 className="text-headline bottom-dock-title">📥 Unassigned Singers Shelf</h3>
          <span className="text-muted bottom-dock-subtitle">Drag up to assign, or drop here to clear a seat assignment.</span>
        </div>

        <div className="bottom-dock-grid">
          {sections.map(({ key, label }) => {
            const list = grouped[key];
            return (
              <div key={key} className="flex-col bottom-dock-lane">
                <div className="flex-row bottom-dock-lane-header">
                  <span className="text-label lane-label">
                    {label}
                  </span>
                  <span className="badge badge-rehearsal lane-badge">
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
