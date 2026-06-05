import React from 'react';
import type { MusicPiece } from '../../../../types/musicLibrary';
import type { MusicGenreDef } from '../../../../services/settingsService';
import { MultiMovementBadge, MovementBadge } from './MusicLibraryBadges';
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
            return (
              <span
                key={id}
                className="ml-genre-tag"
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
