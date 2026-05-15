import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Venue extends RecordModel {
  name: string;
  rowCounts: number[];
}

export const venueService = {
  async getVenues() {
    return await pb.collection('venues').getFullList<Venue>({
      sort: 'name',
    });
  },

  async createVenue(data: Partial<Venue>) {
    return await pb.collection('venues').create<Venue>(data);
  },

  async updateVenue(id: string, data: Partial<Venue>) {
    return await pb.collection('venues').update<Venue>(id, data);
  },

  async deleteVenue(id: string) {
    return await pb.collection('venues').delete(id);
  },
};
