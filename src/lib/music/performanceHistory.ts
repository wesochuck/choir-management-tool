import type { MusicPiece } from '../../types/musicLibrary';
import type { PiecePerformanceEntry } from '../../hooks/usePiecePerformanceMap';
import type { Event } from '../../services/eventService';

export type PerformanceRecencyFilter =
  | 'all'
  | 'within-1-year'
  | 'within-2-years'
  | 'within-3-years'
  | 'not-within-3-years'
  | 'not-within-5-years'
  | 'never';

/**
 * Gets the most recent performance date as YYYY-MM-DD or null.
 * Reads from the precomputed performance map instead of expand.performances.
 */
export function getMostRecentPerformanceDate(
  piece: MusicPiece,
  perfMap: Map<string, PiecePerformanceEntry>
): string | null {
  const entry = perfMap.get(piece.id);
  return entry?.mostRecentDate ?? null;
}

/**
 * Resolves the effective most recent performance date, inheriting from parent if needed.
 */
export function getEffectiveMostRecentPerformanceDate(
  piece: MusicPiece,
  perfMap: Map<string, PiecePerformanceEntry>,
  allPieces: MusicPiece[] = []
): string | null {
  const ownDate = getMostRecentPerformanceDate(piece, perfMap);
  if (ownDate) return ownDate;

  if (!piece.parentId) return null;

  const parent = allPieces.find((candidate) => candidate.id === piece.parentId);
  return parent ? getMostRecentPerformanceDate(parent, perfMap) : null;
}

/**
 * Formats the performance history of a music piece.
 * Reads from set list scanning instead of expand.performances.
 */
export function formatPerformanceHistory(piece: MusicPiece, events: Event[]): string[] {
  const results: string[] = [];
  for (const event of events) {
    if (!event.setList || !Array.isArray(event.setList)) continue;
    if (!event.setList.some((item) => item.pieceId === piece.id)) continue;
    const dateStr = event.date ? new Date(event.date).toISOString().split('T')[0] : '';
    results.push(`${event.title}${dateStr ? ` (${dateStr})` : ''}`);
  }
  return results;
}
