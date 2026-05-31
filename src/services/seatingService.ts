import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import { calculateAutoPaint } from '../lib/seatingAlgorithm';
import { type FormationStrategyType } from './settingsService';

export interface SeatingChart extends RecordModel {
  performance: string;
  venue: string;
  name: string;
  layoutOverride: number[] | null;
  formationId: string; // Replaces text-based sectionOrder field
  assignments: Record<string, string>; // Seat index string -> Profile id string
  sortOrder?: number;
}

export interface SeatingSingerProfile {
  id: string;
  name: string;
  voicePart: string;
}

export const seatingService = {
  async getChartsForPerformance(performanceId: string, venueId: string | null) {
    try {
      const filterStr = venueId
        ? pb.filter('performance = {:performanceId} && venue = {:venueId}', { performanceId, venueId })
        : pb.filter('performance = {:performanceId}', { performanceId });
      return await pb.collection('pbc_seating_001').getFullList<SeatingChart>({
        filter: filterStr,
        sort: 'sortOrder,name',
        expand: 'venue'
      });
    } catch {
      return [];
    }
  },

  async getChartForPerformance(performanceId: string, venueId: string | null, chartIdOrName?: string) {
    try {
      let filterStr = '';
      if (chartIdOrName) {
        filterStr = venueId
          ? pb.filter('performance = {:performanceId} && venue = {:venueId} && (id = {:chartIdOrName} || name = {:chartIdOrName})', { performanceId, venueId, chartIdOrName })
          : pb.filter('performance = {:performanceId} && (id = {:chartIdOrName} || name = {:chartIdOrName})', { performanceId, chartIdOrName });
      } else {
        filterStr = venueId
          ? pb.filter('performance = {:performanceId} && venue = {:venueId}', { performanceId, venueId })
          : pb.filter('performance = {:performanceId}', { performanceId });
      }

      const list = await pb.collection('pbc_seating_001').getList<SeatingChart>(1, 1, {
        filter: filterStr,
        expand: 'venue',
        sort: 'created'
      });
      return list.items[0] || null;
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

  async deleteChart(id: string) {
    return await pb.collection('pbc_seating_001').delete(id);
  },

  async getSingerSeatingProfiles(performanceId: string, chartId: string): Promise<SeatingSingerProfile[]> {
    const response = await pb.send<{ profiles?: SeatingSingerProfile[] }>('/api/singer/seating-profiles', {
      method: 'GET',
      query: { eventId: performanceId, chartId },
    });
    return response.profiles ?? [];
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
