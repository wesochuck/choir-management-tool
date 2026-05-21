import type { MusicPiece } from '../../types/musicLibrary';
import type { MusicGenreDef } from '../../services/settingsService';

/**
 * Returns true if the piece contains the target genreId inside its genres array.
 */
export function pieceHasGenre(piece: Partial<MusicPiece>, genreId: string): boolean {
  if (!piece.genres || !Array.isArray(piece.genres)) return false;
  return piece.genres.includes(genreId);
}

/**
 * Filters pieces matching the specified genre ID.
 * Returns all pieces unchanged if selectedGenreId is an empty string.
 */
export function filterPiecesByGenre(pieces: MusicPiece[], selectedGenreId: string): MusicPiece[] {
  if (!selectedGenreId) return pieces;
  return pieces.filter(p => pieceHasGenre(p, selectedGenreId));
}

/**
 * Maps stored genre IDs to human-readable labels.
 */
export function getGenreLabelsForPiece(piece: Partial<MusicPiece>, genres: MusicGenreDef[]): string[] {
  if (!piece.genres || !Array.isArray(piece.genres)) return [];
  
  return piece.genres.map(id => {
    const found = genres.find(g => g.id === id);
    return found ? found.label : `Unknown (${id})`;
  });
}

/**
 * Trims leading and trailing whitespace from the label text.
 */
export function normalizeGenreLabel(label: string): string {
  return label.trim();
}

/**
 * Converts the label to a lowercase, URL-safe string slug.
 * Appends an integer suffix if an existing entry shares the same generated identifier.
 */
export function createGenreId(label: string, existingGenres: MusicGenreDef[]): string {
  const normalized = normalizeGenreLabel(label);
  const baseId = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  if (!baseId) return 'genre'; // fallback

  let finalId = baseId;
  let counter = 2;
  const currentIds = existingGenres.map(g => g.id);

  while (currentIds.includes(finalId)) {
    finalId = `${baseId}-${counter}`;
    counter++;
  }

  return finalId;
}
