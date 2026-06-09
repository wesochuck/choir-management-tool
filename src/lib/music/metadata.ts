import type { MusicPiece } from '../../types/musicLibrary';

/**
 * Resolves metadata for a music piece, inheriting fields from a parent piece if the child's fields are blank.
 * @param piece The music piece to resolve.
 * @param parent Optional parent music piece to inherit from.
 * @returns A new music piece object with inherited values.
 */
export function resolvePieceMetadata(
  piece: Partial<MusicPiece>,
  parent?: Partial<MusicPiece>
): Partial<MusicPiece> {
  if (!parent) return piece;
  return {
    ...piece,
    composer: piece.composer?.trim() ? piece.composer : (parent.composer || ''),
    voicing: piece.voicing?.trim() ? piece.voicing : (parent.voicing || ''),
    copies: piece.copies !== undefined && piece.copies !== null ? piece.copies : parent.copies,
    catalogId: piece.catalogId?.trim() ? piece.catalogId : (parent.catalogId || ''),
  };
}

/**
 * Validates whether a set list item has the minimum information required to be converted/created
 * as a music library piece.
 * @param title The title of the piece.
 * @returns true if valid, false otherwise.
 */
export function validatePieceForLibrary(title: unknown): boolean {
  return typeof title === 'string' && title.trim().length > 0;
}

/**
 * Searches the music library for a specific piece by its unique ID.
 * @param pieceId The ID of the music piece to look up.
 * @param library The list of music pieces in the library.
 * @returns The matching MusicPiece object, or null if not found or parameters are invalid.
 */
export function findPieceDetails(
  pieceId: string | undefined,
  library: MusicPiece[] | undefined
): MusicPiece | null {
  if (!pieceId || !library || library.length === 0) {
    return null;
  }
  return library.find((piece) => piece.id === pieceId) || null;
}
