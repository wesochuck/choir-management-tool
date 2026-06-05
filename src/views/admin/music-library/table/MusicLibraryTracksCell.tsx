import type { MusicPiece } from '../../../../types/musicLibrary';
import '../MusicLibrary.css';

interface MusicLibraryTracksCellProps {
  piece: MusicPiece;
  isParent: boolean;
  totalMovementTracksCount: number;
  onPlayTrack: (piece: MusicPiece) => void;
  onEditPiece?: (piece: MusicPiece, tab?: 'details' | 'tracks' | 'performances' | 'movements') => void;
}

export function MusicLibraryTracksCell({
  piece,
  isParent,
  totalMovementTracksCount,
  onPlayTrack,
  onEditPiece,
}: MusicLibraryTracksCellProps) {
  return (
    <td className="ml-table-cell">
      {piece.audioTrackMapping && Object.keys(piece.audioTrackMapping).length > 0 ? (
        <button
          className="btn btn-secondary btn-sm ml-play-btn"
          onClick={(e) => {
            e.stopPropagation();
            onPlayTrack(piece);
          }}
        >
          🎵 Play
        </button>
      ) : isParent && totalMovementTracksCount > 0 ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onEditPiece?.(piece, 'tracks');
          }}
          className="ml-track-in-mvts hover-glow"
        >
          🎧 {totalMovementTracksCount} in mvts
        </span>
      ) : (
        <span className="text-xs text-muted">-</span>
      )}
    </td>
  );
}
