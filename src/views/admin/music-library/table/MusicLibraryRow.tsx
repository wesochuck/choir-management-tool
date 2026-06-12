import React from 'react';
import type { MusicPiece } from '../../../../types/musicLibrary';
import type { MusicGenreDef } from '../../../../services/settingsService';
import {
  formatSecondsToDuration,
  parseDurationToSeconds,
} from '../../../../lib/musicPieceUtils';
import { getEffectiveMostRecentPerformanceDate } from '../../../../lib/music/performanceHistory';
import { MusicLibraryTitleCell } from './MusicLibraryTitleCell';
import { MusicLibraryCatalogCell } from './MusicLibraryCatalogCell';
import { MusicLibraryTracksCell } from './MusicLibraryTracksCell';
import {
  getMovementTrackCount,
  isParentPiece,
} from './musicLibraryTableUtils';
import { Button } from '../../../../components/ui';

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
      className={`cursor-pointer ${isDuplicate ? 'bg-[rgb(255_138_101_/_5%)]' : ''} ${isChild ? 'bg-[rgb(248_250_252_/_40%)]' : ''}`}
      onClick={() => onEditPiece(piece)}
      data-has-tracks={hasTracks}
    >
      <td className="border border-[var(--border)] px-[10px] py-[6px] text-center align-middle">
        <input
          type="checkbox"
          checked={selectedIds.has(piece.id)}
          onChange={() => onToggleSelection(piece.id)}
          onClick={(event) => event.stopPropagation()}
          className="!m-0 !h-[14px] !min-h-auto !w-[14px] cursor-pointer align-middle"
        />
      </td>

      <MusicLibraryTitleCell
        piece={piece}
        isChildMovement={isChild}
        isDuplicate={isDuplicate}
        isParent={isParent}
        isExpanded={isExpanded}
        genres={genres}
        onToggleExpansion={(event) => onToggleExpansion(piece.id, event)}
      />

      <td className="border border-[var(--border)] px-[10px] py-[6px] align-middle">
        {piece.composer && piece.arranger
          ? `${piece.composer} / arr. ${piece.arranger}`
          : (piece.composer || piece.arranger || '-')}
      </td>

      <td className="border border-[var(--border)] px-[10px] py-[6px] align-middle">
        {piece.duration
          ? formatSecondsToDuration(parseDurationToSeconds(piece.duration))
          : '-'}
      </td>

      <td className="border border-[var(--border)] px-[10px] py-[6px] text-center align-middle font-semibold">
        {piece.performances && piece.performances.length > 0 ? (
          <span>
            {piece.performances.length}
          </span>
        ) : '-'}
      </td>

      <td className="border border-[var(--border)] px-[10px] py-[6px] align-middle">
        {lastPerformedDate || '-'}
      </td>

      <MusicLibraryTracksCell
        piece={piece}
        isParent={isParent}
        totalMovementTracksCount={totalMovementTracksCount}
        onPlayTrack={onPlayTrack}
        onEditPiece={onEditPiece}
      />

      <MusicLibraryCatalogCell
        catalogId={piece.catalogId}
        catalogLookupTemplate={catalogLookupTemplate}
      />

      <td className="border border-[var(--border)] px-[10px] py-[6px] align-middle">
        <div className="flex items-center justify-center gap-[var(--space-xs)]">
          <Button
            variant="outline"
            size="tiny"
            className="!m-0"
            onClick={(event) => {
              event.stopPropagation();
              onEditPiece(piece);
            }}
          >
            Edit
          </Button>
        </div>
      </td>
    </tr>
  );
}
