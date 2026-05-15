import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Event extends RecordModel {
  date: string;
  location: string;
  type: 'Performance' | 'Rehearsal';
  details: string;
  parentPerformanceId: string;
}

export const eventService = {
  async getEvents() {
    return await pb.collection('events').getFullList<Event>({
      sort: '-date',
      expand: 'parentPerformanceId',
    });
  },

  async createEvent(data: Partial<Event>) {
    return await pb.collection('events').create<Event>(data);
  },

  async updateEvent(id: string, data: Partial<Event>) {
    return await pb.collection('events').update<Event>(id, data);
  },

  async deleteEvent(id: string) {
    return await pb.collection('events').delete(id);
  },
};
