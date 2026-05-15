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

  async bulkCreateRehearsals(parentPerformance: Event, config: { count: number, dayOfWeek: number, time: string }) {
    const { count, dayOfWeek, time } = config;
    const performanceDate = new Date(parentPerformance.date);
    const rehearsals = [];

    // Find the nearest previous day of week
    let current = new Date(performanceDate);
    current.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0, 0);

    // If performance is on the same day of week, start from one week prior
    if (current.getDay() === dayOfWeek) {
       current.setDate(current.getDate() - 7);
    } else {
      // Roll back to the target weekday
      while (current.getDay() !== dayOfWeek) {
        current.setDate(current.getDate() - 1);
      }
    }

    for (let i = 0; i < count; i++) {
      rehearsals.push({
        title: `Rehearsal ${count - i}`,
        date: current.toISOString(),
        location: parentPerformance.location,
        type: 'Rehearsal',
        parentPerformanceId: parentPerformance.id,
        details: `Bulk generated rehearsal leading to ${parentPerformance.title || 'Performance'}`
      });
      // Move back one week
      current.setDate(current.getDate() - 7);
    }

    // Create them all
    return await Promise.all(rehearsals.map(r => pb.collection('events').create<Event>(r)));
  }
};
