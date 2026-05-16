import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import { calculateAutoPaint, type VoicePart } from '../lib/seatingAlgorithm';

export type { VoicePart } from '../lib/seatingAlgorithm';

export interface SeatingChart extends RecordModel {
  performance: string;
  venue: string;
  layoutOverride: number[] | null;
  sectionOrder: string | null;
  assignments: Record<string, string>; // SeatIndex (e.g. "0-5") -> ProfileID
}

export const seatingService = {
  async getChartForPerformance(performanceId: string) {
    try {
      return await pb.collection('pbc_seating_001').getFirstListItem<SeatingChart>(
        `performance = "${performanceId}"`,
        { expand: 'venue' }
      );
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  async getAllCharts() {
    return await pb.collection('pbc_seating_001').getFullList<SeatingChart>({
      expand: 'performance,venue'
    });
  },

  async saveChart(data: Partial<SeatingChart>) {
    if (data.id) {
      return await pb.collection('pbc_seating_001').update<SeatingChart>(data.id, data);
    } else {
      return await pb.collection('pbc_seating_001').create<SeatingChart>(data);
    }
  },

  /**
   * Vertical Wedge Algorithm
   */
  calculateAutoPaint(rowCounts: number[], partCounts: Record<VoicePart, number>, sections: VoicePart[]): Record<string, VoicePart> {
    return calculateAutoPaint(rowCounts, partCounts, sections);
  }
};
