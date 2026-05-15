import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Event extends RecordModel {
  title: string;
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
    // Ensure date is in a format PocketBase likes (ISO string)
    const payload = { ...data };
    if (payload.date) {
      payload.date = new Date(payload.date).toISOString();
    }
    return await pb.collection('events').create<Event>(payload);
  },

  async updateEvent(id: string, data: Partial<Event>) {
    const payload = { ...data };
    if (payload.date) {
      payload.date = new Date(payload.date).toISOString();
    }
    return await pb.collection('events').update<Event>(id, payload);
  },

  async deleteEvent(id: string) {
    return await pb.collection('events').delete(id);
  },
};
