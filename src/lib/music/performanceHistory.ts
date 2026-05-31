import type { MusicPiece } from '../../types/musicLibrary';
import type { Event } from '../../services/eventService';

export type PerformanceRecencyFilter =
  | 'all'
  | 'within-1-year'
  | 'within-2-years'
  | 'within-3-years'
  | 'not-within-3-years'
  | 'not-within-5-years'
  | 'never';

export type MusicPieceWithPerformanceHistory = MusicPiece & {
  expand?: {
    performances?: Event[];
  };
};

/**
 * Gets the most recent performance date as YYYY-MM-DD or null.
 */
export function getMostRecentPerformanceDate(
  piece: MusicPieceWithPerformanceHistory
): string | null {
  if (!piece || !piece.expand || !piece.expand.performances || !Array.isArray(piece.expand.performances)) {
    return null;
  }

  let newestDate: Date | null = null;
  let newestStr: string | null = null;

  for (const perf of piece.expand.performances) {
    if (!perf.date) continue;
    const parsed = new Date(perf.date);
    // Ignore invalid dates
    if (isNaN(parsed.getTime())) continue;

    if (!newestDate || parsed > newestDate) {
      newestDate = parsed;
      // Get the YYYY-MM-DD part cleanly
      try {
        newestStr = parsed.toISOString().split('T')[0];
      } catch {
        // Fallback in case of parsing edge cases
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        newestStr = `${y}-${m}-${d}`;
      }
    }
  }

  return newestStr;
}

/**
 * Formats the most recent performance date or returns '-' if null.
 */
export function formatMostRecentPerformanceDate(piece: MusicPieceWithPerformanceHistory): string {
  return getMostRecentPerformanceDate(piece) || '-';
}

/**
 * Formats the performance history of a music piece.
 * @param piece The music piece object.
 * @returns An array of formatted performance string titles with dates.
 */
export function formatPerformanceHistory(piece: MusicPieceWithPerformanceHistory): string[] {
  if (!piece || !piece.expand || !piece.expand.performances || !Array.isArray(piece.expand.performances)) {
    return [];
  }
  return piece.expand.performances.map((perf) => {
    const dateStr = perf.date ? new Date(perf.date).toISOString().split('T')[0] : '';
    return `${perf.title}${dateStr ? ` (${dateStr})` : ''}`;
  });
}
