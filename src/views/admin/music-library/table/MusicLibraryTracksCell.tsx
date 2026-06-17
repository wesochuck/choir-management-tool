import type { MusicPiece } from '../../../../types/musicLibrary';
import { Button } from '../../../../components/ui';

interface MusicLibraryTracksCellProps {
  piece: MusicPiece;
  isParent: boolean;
  totalMovementTracksCount: number;
  onPlayTrack: (piece: MusicPiece) => void;
  onEditPiece?: (
    piece: MusicPiece,
    tab?: 'details' | 'tracks' | 'performances' | 'movements'
  ) => void;
}

export function MusicLibraryTracksCell({
  piece,
  isParent,
  totalMovementTracksCount,
  onPlayTrack,
  onEditPiece,
}: MusicLibraryTracksCellProps) {
  return (
    <td className="border-border border px-[10px] py-[6px] align-middle">
      {piece.audioTrackMapping && Object.keys(piece.audioTrackMapping).length > 0 ? (
        <Button
          variant="secondary"
          size="tiny"
          className="!m-0"
          onClick={(e) => {
            e.stopPropagation();
            onPlayTrack(piece);
          }}
        >
          🎵 Play
        </Button>
      ) : isParent && totalMovementTracksCount > 0 ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onEditPiece?.(piece, 'tracks');
          }}
          className="text-primary inline-flex cursor-pointer items-center gap-1 rounded-full border border-[rgb(27_77_62_/_15%)] bg-[rgb(27_77_62_/_8%)] px-2 py-[2px] text-[11px] font-medium whitespace-nowrap transition-colors hover:bg-[rgb(27_77_62_/_12%)]"
        >
          🎧 {totalMovementTracksCount} in mvts
        </span>
      ) : (
        <span className="text-muted text-xs">-</span>
      )}
    </td>
  );
}
