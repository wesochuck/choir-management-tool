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
    <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
      {piece.audioTrackMapping && Object.keys(piece.audioTrackMapping).length > 0 ? (
        <button
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onPlayTrack(piece);
          }}
          style={{
            padding: '2px 8px',
            height: '24px',
            minHeight: '24px',
            fontSize: '11px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            margin: 0,
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
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: 'rgba(27, 77, 62, 0.08)',
            color: 'var(--primary, #1b4d3e)',
            fontSize: '11px',
            fontWeight: 500,
            border: '1px solid rgba(27, 77, 62, 0.15)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'background-color 0.2s, opacity 0.2s',
          }}
          className="hover-glow"
        >
          🎧 {totalMovementTracksCount} in mvts
        </span>
      ) : (
        <span className="text-xs text-muted">-</span>
      )}
    </td>
  );
}
