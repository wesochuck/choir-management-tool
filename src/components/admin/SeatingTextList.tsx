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

  return (
    <div className="seating-text-list flex-col text-list-container">
      {rows.map((row, i) => {
        const isFront = i === 0;
        const isBack = i === rows.length - 1;
        const label = `Row ${i + 1}${isFront ? ' (Front)' : isBack ? ' (Back)' : ''}`;

        const assignedSingers = row.filter((p): p is Profile => !!p);
        const namesString = assignedSingers.length > 0 
          ? assignedSingers.map(p => {
              const displayName = uniqueDisplayNames[p.id] || getLastName(p.name);
              return showVoiceParts ? `${displayName} (${p.voicePart})` : displayName;
            }).join(', ')
          : 'No singers assigned';

        return (
          <div key={i} className="flex-col row-text-entry">
            <h3 className="text-label row-text-header">
              {label}
            </h3>
            <div className="text-sm row-text-content">
              {namesString}
            </div>
          </div>
        );
      })}
    </div>
  );
}
