import { useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import { getLastName, getUniqueDisplayNames } from '../../lib/stringUtils';

interface SeatingTextListProps {
  rows: (Profile | null)[][];
  showVoiceParts?: boolean;
}

export function SeatingTextList({ 
  rows, 
  showVoiceParts = true 
}: SeatingTextListProps) {
  const allAssigned = useMemo(() => {
    const list: Profile[] = [];
    rows.forEach(row => {
      row.forEach(p => {
        if (p) list.push(p);
      });
    });
    return list;
  }, [rows]);

  const uniqueDisplayNames = useMemo(() => {
    return getUniqueDisplayNames(allAssigned);
  }, [allAssigned]);

  const reversedRows = useMemo(() => {
    return [...rows].reverse();
  }, [rows]);

  return (
    <div className="flex-col gap-4 p-4" data-seating-text-list>
      {reversedRows.map((row, index) => {
        const originalIndex = rows.length - 1 - index;
        const isFront = originalIndex === 0;
        const isBack = originalIndex === rows.length - 1;
        const label = `Row ${originalIndex + 1}${isFront ? ' (Front)' : isBack ? ' (Back)' : ''}`;

        const assignedSingers = row.filter((p): p is Profile => !!p);
        const namesString = assignedSingers.length > 0 
          ? assignedSingers.map(p => {
              const rawDisplayName = uniqueDisplayNames[p.id] || getLastName(p.name);
              const displayName = rawDisplayName.replace(', ', ' ');
              return showVoiceParts ? `${displayName} (${p.voicePart})` : displayName;
            }).join(', ')
          : 'No singers assigned';

        return (
          <div key={originalIndex} className="flex-col gap-[var(--space-xs)]">
            <h3 className="text-label m-0 border-b-2 border-[var(--primary)] pb-1 text-[var(--primary-deep)]" title={`${assignedSingers.length} of ${row.length} seats occupied`}>
              {label} {assignedSingers.length}/{row.length}
            </h3>
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-[var(--space-sm)] text-sm leading-relaxed">
              {namesString}
            </div>
          </div>
        );
      })}
    </div>
  );
}
