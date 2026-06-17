import type { MusicPiece } from '../../types/musicLibrary';

export function findDuplicates(pieces: MusicPiece[]): MusicPiece[] {
  const seen = new Map<string, MusicPiece[]>();
  for (const piece of pieces) {
    const key = `${piece.title?.toLowerCase()?.trim() || ''}|${piece.composer?.toLowerCase()?.trim() || ''}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(piece);
  }

  const duplicates: MusicPiece[] = [];
  for (const group of seen.values()) {
    if (group.length > 1) {
      duplicates.push(...group);
    }
  }
  return duplicates;
}
