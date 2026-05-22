import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Venue } from './venueService';

export interface SetListItem {
  id: string; // Used for dnd-kit key
  title: string;
  composer?: string;
  duration?: string;
  notes?: string;
  pieceId?: string; // Links to musicLibrary
  type?: 'song' | 'intermission';
  soloSmallGroup?: boolean;
}

export interface Event extends RecordModel {
  title: string;
  date: string;
  type: 'Performance' | 'Rehearsal';
  details: string;
  parentPerformanceId: string;
  venue?: string;
  isOpenForRSVP?: boolean;
  setListApproved?: boolean;
  setList?: SetListItem[];
  expand?: {
    venue?: Venue;
    parentPerformanceId?: Event;
  };
}

export interface BulkRehearsalConfig {
  count: number;
  dayOfWeek: number;
  time: string;
  venue?: string;
}

export const eventService = {
  async getEvents() {
    return await pb.collection('events').getFullList<Event>({
      sort: '-date',
      expand: 'parentPerformanceId,venue',
    });
  },

  async getEventById(id: string) {
    return await pb.collection('events').getOne<Event>(id, {
      expand: 'parentPerformanceId,venue',
    });
  },

  async getRehearsalsForPerformance(performanceId: string) {
    return await pb.collection('events').getFullList<Event>({
      filter: pb.filter('parentPerformanceId = {:performanceId} && type = "Rehearsal"', { performanceId }),
      sort: 'date',
      expand: 'venue',
    });
  },

  async createEvent(data: Partial<Event>) {
    // Ensure date is in a format PocketBase likes (ISO string)
    const payload = { 
      setListApproved: true,
      ...data 
    };
    if (payload.date) {
      payload.date = new Date(payload.date).toISOString();
    }
    if (payload.parentPerformanceId === '') {
      payload.parentPerformanceId = null as unknown as string;
    }
    if (payload.venue === '') {
      payload.venue = null as unknown as string;
    }
    return await pb.collection('events').create<Event>(payload);
  },

  async updateEvent(id: string, data: Partial<Event>) {
    const payload = { ...data };
    if (payload.date) {
      payload.date = new Date(payload.date).toISOString();
    }
    if (payload.parentPerformanceId === '') {
      payload.parentPerformanceId = null as unknown as string;
    }
    if (payload.venue === '') {
      payload.venue = null as unknown as string;
    }
    return await pb.collection('events').update<Event>(id, payload);
  },

  async deleteEvent(id: string) {
    return await pb.collection('events').delete(id);
  },

  async bulkCreateRehearsals(parentPerformance: Event, config: BulkRehearsalConfig) {
    const { count, dayOfWeek, time, venue } = config;
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error("Invalid day of week selected.");
    }

    const performanceDate = new Date(parentPerformance.date);
    if (isNaN(performanceDate.getTime())) {
      throw new Error("Invalid performance date.");
    }

    const [hours, minutes] = time.split(':').map(n => parseInt(n));
    const rehearsals = [];

    // Start from the performance date at the rehearsal time
    const current = new Date(performanceDate);
    current.setHours(hours || 19, minutes || 0, 0, 0);

    // Roll back to the first rehearsal date
    // If performance is on the same day, first rehearsal is 1 week before
    if (current.getDay() === dayOfWeek) {
      current.setDate(current.getDate() - 7);
    } else {
      let safety = 0;
      while (current.getDay() !== dayOfWeek && safety < 7) {
        current.setDate(current.getDate() - 1);
        safety++;
      }
    }

    for (let i = 0; i < count; i++) {
      const rehearsalDate = new Date(current);
      rehearsals.push({
        title: `Rehearsal ${count - i}`,
        date: rehearsalDate.toISOString(),
        type: 'Rehearsal' as const,
        parentPerformanceId: parentPerformance.id,
        venue: venue || parentPerformance.venue || null,
        details: `Bulk generated rehearsal leading to ${parentPerformance.title || 'Performance'}`
      });
      // Move back one week for the previous rehearsal
      current.setDate(current.getDate() - 7);
    }

    // Use Promise.all to avoid N+1 query issue.
    // For large numbers of rehearsals, this parallelizes the network requests.
    const createPromises = rehearsals.reverse().map(r =>
      pb.collection('events').create<Event>(r)
    );

    return await Promise.all(createPromises);
  }
};
