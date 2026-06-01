import React from 'react';
import type { MusicPiece } from '../../../../types/musicLibrary';
import type { SectionDef, MusicGenreDef } from '../../../../services/settingsService';
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
  hasAnyTracks,
  isParentPiece,
} from './musicLibraryTableUtils';

interface MusicLibraryRowProps {
  piece: MusicPiece;
  allPieces: MusicPiece[];
  isChildMovement: boolean;
  isExpanded: boolean;
  duplicateIds: Set<string>;
  selectedIds: Set<string>;
  sections: SectionDef[];
  genres: MusicGenreDef[];
  catalogLookupTemplate: string;
  onToggleSelection: (id: string) => void;
  onToggleExpansion: (id: string, event: React.MouseEvent) => void;
  onEditPiece: (piece: MusicPiece) => void;
  onPlayTrack: (piece: MusicPiece) => void;
}

export function MusicLibraryRow({
  piece,
  allPieces,
  isChildMovement,
  isExpanded,
  duplicateIds,
  selectedIds,
  sections,
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
  const hasTracks = hasAnyTracks(piece, allPieces);
  const lastPerformedDate = getEffectiveMostRecentPerformanceDate(piece, allPieces);

  return (
    <tr
      className="relative-row"
      onClick={() => onEditPiece(piece)}
      style={{
        backgroundColor: isDuplicate
          ? 'rgba(255, 138, 101, 0.05)'
          : isChild
            ? 'rgba(248, 250, 252, 0.4)'
            : undefined,
        cursor: 'pointer',
      }}
    >
      {/* Column 1: Checkbox Selection */}
      <td
        style={{
          textAlign: 'center',
          padding: '6px 10px',
          border: '1px solid var(--border)',
        }}
      >
        <input
          type="checkbox"
          checked={selectedIds.has(piece.id)}
          onChange={() => onToggleSelection(piece.id)}
          onClick={(event) => event.stopPropagation()}
          style={{
            minHeight: 'auto',
            width: '14px',
            height: '14px',
            margin: 0,
            verticalAlign: 'middle',
            cursor: 'pointer',
          }}
        />
      </td>

      {/* Column 2: Title and Metadata badging */}
      <MusicLibraryTitleCell
        piece={piece}
        isChildMovement={isChild}
        isDuplicate={isDuplicate}
        isParent={isParent}
        isExpanded={isExpanded}
        hasTracks={hasTracks}
        sections={sections}
        genres={genres}
        onToggleExpansion={(event) => onToggleExpansion(piece.id, event)}
      />

      {/* Column 3: Composer/Arranger */}
      <td
        style={{
          padding: '6px 10px',
          border: '1px solid var(--border)',
          verticalAlign: 'middle',
        }}
      >
        {piece.composer && piece.arranger
          ? `${piece.composer} / arr. ${piece.arranger}`
          : (piece.composer || piece.arranger || '-')}
      </td>

      {/* Column 4: Duration */}
      <td
        style={{
          padding: '6px 10px',
          border: '1px solid var(--border)',
          verticalAlign: 'middle',
        }}
      >
        {piece.duration
          ? formatSecondsToDuration(parseDurationToSeconds(piece.duration))
          : '-'}
      </td>

      {/* Column 5: Copies */}
      <td
        style={{
          padding: '6px 10px',
          border: '1px solid var(--border)',
          verticalAlign: 'middle',
        }}
      >
        {piece.copies !== undefined ? piece.copies : '-'}
      </td>

      {/* Column 6: Catalog Lookup Link */}
      <MusicLibraryCatalogCell
        catalogId={piece.catalogId}
        catalogLookupTemplate={catalogLookupTemplate}
      />

      {/* Column 7: Last Performed */}
      <td
        style={{
          padding: '6px 10px',
          border: '1px solid var(--border)',
          verticalAlign: 'middle',
        }}
      >
        {lastPerformedDate || '-'}
      </td>

      {/* Column 8: Audio Tracks Control Status */}
      <MusicLibraryTracksCell
        piece={piece}
        isParent={isParent}
        totalMovementTracksCount={totalMovementTracksCount}
        onPlayTrack={onPlayTrack}
      />

      {/* Column 9: Actions */}
      <td
        style={{
          padding: '6px 10px',
          border: '1px solid var(--border)',
          verticalAlign: 'middle',
        }}
      >
        <div
          className="flex-row"
          style={{
            gap: 'var(--space-xs)',
            justifyContent: 'center',
          }}
        >
          <button
            className="btn btn-ghost btn-sm"
            onClick={(event) => {
              event.stopPropagation();
              onEditPiece(piece);
            }}
            style={{
              minHeight: 'auto',
              height: '24px',
              padding: '0 8px',
              fontSize: '0.75rem',
              margin: 0,
            }}
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}
