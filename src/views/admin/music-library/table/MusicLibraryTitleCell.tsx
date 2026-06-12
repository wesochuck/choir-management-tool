import React, { useMemo } from 'react';
import type { MusicPiece } from '../../../../types/musicLibrary';
import type { MusicGenreDef } from '../../../../services/settingsService';
import { MultiMovementBadge, MovementBadge } from './MusicLibraryBadges';
import { CHIP_COLORS, getChipColor } from '../../../../lib/chipColorUtils';

interface MusicLibraryTitleCellProps {
  piece: MusicPiece;
  isChildMovement: boolean;
  isDuplicate: boolean;
  isParent: boolean;
  isExpanded: boolean;
  genres: MusicGenreDef[];
  onToggleExpansion: (event: React.MouseEvent) => void;
}

export function MusicLibraryTitleCell({
  piece,
  isChildMovement,
  isDuplicate,
  isParent,
  isExpanded,
  genres,
  onToggleExpansion,
}: MusicLibraryTitleCellProps) {
  const isChild = isChildMovement;

  const chipColorMap = useMemo(() => {
    const map = new Map<string, { bg: string; border: string; text: string }>();
    const sorted = [...genres].sort((a, b) => a.label.localeCompare(b.label));
    sorted.forEach((genre, idx) => {
      map.set(genre.id, getChipColor(idx));
    });
    return map;
  }, [genres]);

  return (
    <td
      className={`border border-border px-[10px] py-[6px] align-middle ${isChild ? '!pl-8' : ''}`}
    >
      <div className="flex flex-col gap-[2px]">
        <div className="flex flex-row flex-wrap items-center gap-[6px]">
          {isParent && (
            <button
              type="button"
              onClick={onToggleExpansion}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} movements for ${piece.title}`}
              title={`${isExpanded ? 'Collapse' : 'Expand'} movements`}
              className="text-muted inline-flex cursor-pointer items-center border-none bg-none p-0 px-[4px] text-[12px] select-none"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {isChild && (
            <span className="text-muted mr-[2px] font-mono text-xs select-none">
              └─
            </span>
          )}
          <strong className={`font-bold ${isDuplicate ? 'text-[#e64a19]' : ''}`}>
            {piece.title}
          </strong>
          {isParent && <MultiMovementBadge />}
          {isChild && <MovementBadge />}
        </div>
        <div className="mt-[2px] flex flex-row flex-wrap items-center gap-[6px]">
          {piece.genres?.map((id) => {
            const found = genres.find((g) => g.id === id);
            const color = chipColorMap.get(id) || CHIP_COLORS[0];
            return (
              <span
                key={id}
                className="inline-flex rounded-[4px] border px-[5px] py-[1px] text-[9px] font-medium"
                // @allow-inline-style - Genre tag colors match the modal's stable palette.
                style={{
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    color: color.text,
                }}
              >
                {found ? found.label : id}
              </span>
            );
          })}
        </div>
      </div>
    </td>
  );
}
