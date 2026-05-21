import type { MusicPiece } from '../../types/musicLibrary';
import type { Event } from '../../services/eventService';

export type MusicPieceWithPerformanceHistory = MusicPiece & {
  expand?: {
    performances?: Event[];
  };
};

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
