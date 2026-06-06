import React, { useMemo } from 'react';
import type { MusicPiece } from '../../../../types/musicLibrary';
import type { MusicGenreDef } from '../../../../services/settingsService';
import { MultiMovementBadge, MovementBadge } from './MusicLibraryBadges';
import { CHIP_COLORS, getChipColor } from '../../../../lib/chipColorUtils';
import '../MusicLibrary.css';

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

  // Build a stable color map based on sorted genre labels, same as MultiSelectDropdown
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
      className={`ml-table-cell ml-title-cell ${isChild ? 'ml-title-cell-child' : ''}`}
    >
      <div className="ml-title-stack">
        <div className="ml-title-row">
          {isParent && (
            <button
              type="button"
              onClick={onToggleExpansion}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} movements for ${piece.title}`}
              title={`${isExpanded ? 'Collapse' : 'Expand'} movements`}
              className="ml-expand-btn"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {isChild && (
            <span className="ml-child-indicator text-xs text-muted">
              └─
            </span>
          )}
          <strong className={`ml-title-text ${isDuplicate ? 'ml-title-text-duplicate' : ''}`}>
            {piece.title}
          </strong>
          {isParent && <MultiMovementBadge />}
          {isChild && <MovementBadge />}
        </div>
        <div className="ml-title-row ml-genre-row">
          {piece.genres?.map((id) => {
            const found = genres.find((g) => g.id === id);
            const color = chipColorMap.get(id) || CHIP_COLORS[0];
            return (
              <span
                key={id}
                className="ml-genre-tag"
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

