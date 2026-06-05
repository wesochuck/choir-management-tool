import React from 'react';
import type { MusicPiece } from '../../../../types/musicLibrary';
import type { MusicGenreDef } from '../../../../services/settingsService';
import {
  formatSecondsToDuration,
  parseDurationToSeconds,
  formatPerformanceHistory,
} from '../../../../lib/musicPieceUtils';
import { getEffectiveMostRecentPerformanceDate } from '../../../../lib/music/performanceHistory';
import { MusicLibraryTitleCell } from './MusicLibraryTitleCell';
import { MusicLibraryCatalogCell } from './MusicLibraryCatalogCell';
import { MusicLibraryTracksCell } from './MusicLibraryTracksCell';
import {
  getMovementTrackCount,
  isParentPiece,
} from './musicLibraryTableUtils';
import '../MusicLibrary.css';

interface MusicLibraryRowProps {
  piece: MusicPiece;
  allPieces: MusicPiece[];
  isChildMovement: boolean;
  isExpanded: boolean;
  duplicateIds: Set<string>;
  selectedIds: Set<string>;
  genres: MusicGenreDef[];
  catalogLookupTemplate: string;
  onToggleSelection: (id: string) => void;
  onToggleExpansion: (id: string, event: React.MouseEvent) => void;
  onEditPiece: (piece: MusicPiece, tab?: 'details' | 'tracks' | 'performances' | 'movements') => void;
  onPlayTrack: (piece: MusicPiece) => void;
}

export function MusicLibraryRow({
  piece,
  allPieces,
  isChildMovement,
  isExpanded,
  duplicateIds,
  selectedIds,
  genres,
  catalogLookupTemplate,
  onToggleSelection,
  onToggleExpansion,
  onEditPiece,
  onPlayTrack,
}: MusicLibraryRowProps) {
  const isDuplicate = duplicateIds.has(piece.id);
  const isParent = isParentPiece(piece, allPieces);
  const isChild = isChildMovement;
  const totalMovementTracksCount = getMovementTrackCount(piece, allPieces);
  const hasTracks = totalMovementTracksCount > 0 || (piece.audioTrackMapping && Object.keys(piece.audioTrackMapping).length > 0);
  const lastPerformedDate = getEffectiveMostRecentPerformanceDate(piece, allPieces);

  return (
    <tr
      className={`relative-row ml-table-row ${isDuplicate ? 'ml-table-row-duplicate' : ''} ${isChild ? 'ml-table-row-child' : ''}`}
      onClick={() => onEditPiece(piece)}
      data-has-tracks={hasTracks}
    >
      {/* Column 1: Checkbox Selection */}
      <td className="ml-table-cell ml-table-cell-center">
        <input
          type="checkbox"
          checked={selectedIds.has(piece.id)}
          onChange={() => onToggleSelection(piece.id)}
          onClick={(event) => event.stopPropagation()}
          className="ml-checkbox"
        />
      </td>

      {/* Column 2: Title and Metadata badging */}
      <MusicLibraryTitleCell
        piece={piece}
        isChildMovement={isChild}
        isDuplicate={isDuplicate}
        isParent={isParent}
        isExpanded={isExpanded}
        genres={genres}
        onToggleExpansion={(event) => onToggleExpansion(piece.id, event)}
      />

      {/* Column 3: Composer/Arranger */}
      <td className="ml-table-cell">
        {piece.composer && piece.arranger
          ? `${piece.composer} / arr. ${piece.arranger}`
          : (piece.composer || piece.arranger || '-')}
      </td>

      {/* Column 4: Duration */}
      <td className="ml-table-cell">
        {piece.duration
          ? formatSecondsToDuration(parseDurationToSeconds(piece.duration))
          : '-'}
      </td>

      {/* Column 5: Performance Count */}
      <td className="ml-table-cell ml-table-cell-center ml-perf-count">
        {piece.performances && piece.performances.length > 0 ? (
          <span title={formatPerformanceHistory(piece).join('\n')}>
            {piece.performances.length}
          </span>
        ) : '-'}
      </td>


      {/* Column 7: Last Performed */}
      <td className="ml-table-cell">
        {lastPerformedDate || '-'}
      </td>

      {/* Column 8: Audio Tracks Control Status */}
      <MusicLibraryTracksCell
        piece={piece}
        isParent={isParent}
        totalMovementTracksCount={totalMovementTracksCount}
        onPlayTrack={onPlayTrack}
        onEditPiece={onEditPiece}
      />

      {/* Column 6: Catalog Lookup Link */}
      <MusicLibraryCatalogCell
        catalogId={piece.catalogId}
        catalogLookupTemplate={catalogLookupTemplate}
      />

      {/* Column 9: Actions */}
      <td className="ml-table-cell">
        <div className="flex-row ml-table-cell-center ml-actions-cell-content">
          <button
            className="btn btn-ghost btn-sm ml-edit-btn"
            onClick={(event) => {
              event.stopPropagation();
              onEditPiece(piece);
            }}
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}
