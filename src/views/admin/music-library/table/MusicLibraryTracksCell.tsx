import type { MusicPiece } from '../../../../types/musicLibrary';

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
    <td className="px-[10px] py-[6px] border border-[var(--border)] align-middle">
      {piece.audioTrackMapping && Object.keys(piece.audioTrackMapping).length > 0 ? (
        <button
          className="btn btn-secondary btn-sm !p-[2px_8px] !h-6 !min-h-6 !text-[11px] !inline-flex !items-center !gap-1 !m-0"
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
          className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-[rgb(27_77_62_/_8%)] text-[var(--primary)] text-[11px] font-medium border border-[rgb(27_77_62_/_15%)] whitespace-nowrap cursor-pointer hover-glow"
        >
          🎧 {totalMovementTracksCount} in mvts
        </span>
      ) : (
        <span className="text-xs text-muted">-</span>
      )}
    </td>
  );
}
