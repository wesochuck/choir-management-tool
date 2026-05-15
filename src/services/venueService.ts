import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Venue extends RecordModel {
  name: string;
  rowCounts: number[];
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
