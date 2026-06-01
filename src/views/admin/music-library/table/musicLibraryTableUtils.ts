import type { MusicPiece } from '../../../../types/musicLibrary';

export function isParentPiece(piece: MusicPiece, allPieces: MusicPiece[]): boolean {
  return allPieces.some((candidate) => candidate.parentId === piece.id);
}

export function getChildMovements(piece: MusicPiece, allPieces: MusicPiece[]): MusicPiece[] {
  return allPieces.filter((candidate) => candidate.parentId === piece.id);
}

export function hasOwnTracks(piece: MusicPiece): boolean {
  return !!(
    piece.audioTrackMapping &&
    Object.keys(piece.audioTrackMapping).some(
      (key) => piece.audioTrackMapping?.[key],
    )
  );
}

export function getMovementTrackCount(piece: MusicPiece, allPieces: MusicPiece[]): number {
  return getChildMovements(piece, allPieces).reduce((acc, movement) => {
    const mapping = movement.audioTrackMapping || {};
    return acc + Object.keys(mapping).filter((key) => mapping[key]).length;
  }, 0);
}

export function hasAnyTracks(piece: MusicPiece, allPieces: MusicPiece[]): boolean {
  return hasOwnTracks(piece) || getMovementTrackCount(piece, allPieces) > 0;
}
