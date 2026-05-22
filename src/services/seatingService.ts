import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import { calculateAutoPaint } from '../lib/seatingAlgorithm';
import { type FormationStrategyType } from './settingsService';

export interface SeatingChart extends RecordModel {
  performance: string;
  venue: string;
  layoutOverride: number[] | null;
  formationId: string; // Replaces text-based sectionOrder field
  assignments: Record<string, string>; // Seat index string -> Profile id string
  formationType?: 'Column' | 'Row';
  sectionOrder?: string | null;
}

export const seatingService = {
  async getChartForPerformance(performanceId: string, venueId: string | null) {
    try {
      const filterStr = venueId
        ? pb.filter('performance = {:performanceId} && venue = {:venueId}', { performanceId, venueId })
        : pb.filter('performance = {:performanceId}', { performanceId });
      return await pb.collection('pbc_seating_001').getFirstListItem<SeatingChart>(
        filterStr,
        { expand: 'venue' }
      );
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) return null;
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
   * Proportional Seating Algorithm
   */
  calculateAutoPaint(
    rowCounts: number[], 
    sectionCounts: Record<string, number>, 
    sectionOrder: string[],
    strategy: FormationStrategyType
  ): Record<string, string> {
    return calculateAutoPaint(rowCounts, sectionCounts, sectionOrder, strategy);
  }
};

