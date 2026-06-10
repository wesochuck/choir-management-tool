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
      className={`px-[10px] py-[6px] border border-[var(--border)] align-middle ${isChild ? '!pl-8' : ''}`}
    >
      <div className="flex flex-col gap-[2px]">
        <div className="flex flex-flow row wrap items-center gap-[6px]">
          {isParent && (
            <button
              type="button"
              onClick={onToggleExpansion}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} movements for ${piece.title}`}
              title={`${isExpanded ? 'Collapse' : 'Expand'} movements`}
              className="bg-none border-none cursor-pointer p-0 px-[4px] text-[12px] inline-flex items-center text-[var(--text-muted)] select-none"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {isChild && (
            <span className="font-mono mr-[2px] select-none text-xs text-muted">
              └─
            </span>
          )}
          <strong className={`font-bold ${isDuplicate ? 'text-[#e64a19]' : ''}`}>
            {piece.title}
          </strong>
          {isParent && <MultiMovementBadge />}
          {isChild && <MovementBadge />}
        </div>
        <div className="flex flex-flow row wrap items-center gap-[6px] mt-[2px]">
          {piece.genres?.map((id) => {
            const found = genres.find((g) => g.id === id);
            const color = chipColorMap.get(id) || CHIP_COLORS[0];
            return (
              <span
                key={id}
                className="inline-flex px-[5px] py-[1px] rounded-[4px] text-[9px] font-medium border"
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
