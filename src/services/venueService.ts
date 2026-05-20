import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Venue extends RecordModel {
  name: string;
  rowCounts: number[];
  address?: string;
  isOpenSeating?: boolean;
}

export const venueService = {
  async getVenues() {
    return await pb.collection('pbc_venues_001').getFullList<Venue>({
      sort: 'name',
    });
  },

  async createVenue(data: Partial<Venue>) {
    return await pb.collection('pbc_venues_001').create<Venue>(data);
  },

  async updateVenue(id: string, data: Partial<Venue>) {
    return await pb.collection('pbc_venues_001').update<Venue>(id, data);
  },

  async deleteVenue(id: string) {
    return await pb.collection('pbc_venues_001').delete(id);
  },
};

export async function checkVenueDependencies(venueId: string): Promise<boolean> {
  const result = await pb.collection('events').getList(1, 1, {
    filter: pb.filter('venue={:venueId}', { venueId }),
  });
  return result.totalItems > 0;
}

