import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface SeatingChart extends RecordModel {
  performance: string;
  venue: string;
  layoutOverride: number[] | null;
  assignments: Record<string, string>; // SeatIndex (e.g. "0-5") -> ProfileID
}

export type VoicePart = 'S' | 'A' | 'T' | 'B';

export const seatingService = {
  async getChartForPerformance(performanceId: string) {
    try {
      return await pb.collection('seatingCharts').getFirstListItem<SeatingChart>(
        `performance = "${performanceId}"`,
        { expand: 'venue' }
      );
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  async saveChart(data: Partial<SeatingChart>) {
    if (data.id) {
      return await pb.collection('seatingCharts').update<SeatingChart>(data.id, data);
    } else {
      return await pb.collection('seatingCharts').create<SeatingChart>(data);
    }
  },

  /**
   * Vertical Wedge Algorithm
   * Distributes voice parts side-by-side from front to back rows.
   */
  calculateAutoPaint(rowCounts: number[], partCounts: Record<VoicePart, number>): Record<string, VoicePart> {
    const sections: VoicePart[] = ['S', 'A', 'T', 'B'];
    const totalSingers = Object.values(partCounts).reduce((a, b) => a + b, 0);
    if (totalSingers === 0) return {};

    // Calculate normalized cumulative boundaries (0 to 1)
    let cumulative = 0;
    const boundaries: number[] = [0];
    sections.forEach(part => {
      cumulative += partCounts[part] / totalSingers;
      boundaries.push(cumulative);
    });

    const suggestions: Record<string, VoicePart> = {};

    rowCounts.forEach((rowSize, rowIndex) => {
      for (let seatIndex = 0; seatIndex < rowSize; seatIndex++) {
        const positionInRow = (seatIndex + 0.5) / rowSize; // Center of seat
        
        // Find which boundary this seat falls into
        for (let i = 0; i < sections.length; i++) {
          if (positionInRow >= boundaries[i] && positionInRow <= boundaries[i+1]) {
            suggestions[`${rowIndex}-${seatIndex}`] = sections[i];
            break;
          }
        }
      }
    });

    return suggestions;
  }
};
