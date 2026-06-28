import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Venue } from './venueService';
import { zonedInputValueToUtc } from '../lib/timezone';
import { settingsService } from './settingsService';

const BATCH_CHUNK_SIZE = 50;

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
  durationMinutes?: number;
  announcementGapSeconds?: number;
  details: string;
  callTime?: string;
  parentPerformanceId: string;
  venue?: string;
  isOpenForRSVP?: boolean;
  setListApproved?: boolean;
  setList?: SetListItem[];
  isTicketingEnabled?: boolean;
  advancePriceCents?: number;
  dayOfPriceCents?: number;
  ticketCapacity?: number;
  doorsOpenTime?: string;
  publicDetails?: string;
  eventGraphic?: string;
  isArchived?: boolean;
  enableAutomatedReminder?: boolean;
  reminderLeadTimeHours?: number;
  reminderSentAt?: string;
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

let inFlightEvents: Promise<Event[]> | null = null;
let inFlightPublicEvents: Promise<Event[]> | null = null;

export const eventService = {
  async getEvents() {
    if (inFlightEvents) return inFlightEvents;

    const promise = pb.collection('events').getFullList<Event>({
      filter: 'isArchived != true',
      sort: '-date',
      expand: 'parentPerformanceId,venue',
    });

    inFlightEvents = promise;
    promise.finally(() => {
      inFlightEvents = null;
    });

    return promise;
  },

  async getTicketingEnabledEvents() {
    return await pb.collection('events').getFullList<Event>({
      filter: 'isTicketingEnabled = true',
      sort: '-date',
    });
  },

  async getPublicEvents() {
    if (inFlightPublicEvents) return inFlightPublicEvents;

    const promise = pb.collection('events').getFullList<Event>({
      filter: 'isArchived != true && isTicketingEnabled = true && date >= @now',
      sort: 'date',
      fields:
        'id,collectionId,collectionName,title,date,type,venue,publicDetails,advancePriceCents,dayOfPriceCents,ticketCapacity,doorsOpenTime,eventGraphic,isTicketingEnabled,expand.venue',
      expand: 'venue',
    });

    inFlightPublicEvents = promise;
    promise.finally(() => {
      inFlightPublicEvents = null;
    });

    return promise;
  },

  async getEventById(id: string) {
    return await pb.collection('events').getOne<Event>(id, {
      expand: 'parentPerformanceId,venue',
    });
  },

  async getPublicEventById(id: string) {
    return await pb.collection('events').getFirstListItem<Event>(
      pb.filter('id = {:id} && isArchived != true && isTicketingEnabled = true && date >= @now', {
        id,
      }),
      {
        fields:
          'id,collectionId,collectionName,title,date,type,venue,publicDetails,advancePriceCents,dayOfPriceCents,ticketCapacity,doorsOpenTime,eventGraphic,isTicketingEnabled,expand.venue',
        expand: 'venue',
      }
    );
  },

  async getRecentPerformances(limit: number): Promise<Event[]> {
    const result = await pb.collection('events').getList<Event>(1, limit, {
      filter: 'type = "Performance" && date < @now && isArchived != true',
      sort: '-date',
      fields:
        'id,collectionId,collectionName,title,date,venue,publicDetails,eventGraphic,expand.venue',
      expand: 'venue',
    });
    return result.items;
  },

  async getPastPerformancesPaginated(
    page: number,
    perPage: number
  ): Promise<{ items: Event[]; totalPages: number; totalItems: number }> {
    const result = await pb.collection('events').getList<Event>(page, perPage, {
      filter: 'type = "Performance" && date < @now && isArchived != true',
      sort: '-date',
      fields:
        'id,collectionId,collectionName,title,date,venue,publicDetails,eventGraphic,expand.venue',
      expand: 'venue',
    });
    return {
      items: result.items,
      totalPages: result.totalPages,
      totalItems: result.totalItems,
    };
  },

  async getRehearsalsForPerformance(performanceId: string) {
    return await pb.collection('events').getFullList<Event>({
      filter: pb.filter('parentPerformanceId = {:performanceId} && type = "Rehearsal"', {
        performanceId,
      }),
      sort: 'date',
      expand: 'venue',
    });
  },

  async getPublicRehearsalsForPerformance(performanceId: string) {
    return await pb.collection('events').getFullList<Event>({
      filter: pb.filter('parentPerformanceId = {:performanceId} && type = "Rehearsal"', {
        performanceId,
      }),
      sort: 'date',
      fields: 'id,collectionId,collectionName,title,date,venue,expand.venue',
      expand: 'venue',
    });
  },

  async createEvent(data: Partial<Event> | FormData) {
    if (data instanceof FormData) {
      if (data.get('parentPerformanceId') === '') {
        data.set('parentPerformanceId', '');
      }
      if (data.get('venue') === '') {
        data.set('venue', '');
      }
      return await pb.collection('events').create<Event>(data);
    }
    // Ensure date is in a format PocketBase likes (ISO string)
    const payload = {
      setListApproved: true,
      ...data,
    };
    if (payload.parentPerformanceId === '') {
      payload.parentPerformanceId = null as unknown as string;
    }
    if (payload.venue === '') {
      payload.venue = null as unknown as string;
    }
    return await pb.collection('events').create<Event>(payload);
  },

  async updateEvent(id: string, data: Partial<Event> | FormData) {
    if (data instanceof FormData) {
      if (data.get('parentPerformanceId') === '') {
        data.set('parentPerformanceId', '');
      }
      if (data.get('venue') === '') {
        data.set('venue', '');
      }
      return await pb.collection('events').update<Event>(id, data);
    }
    const payload = { ...data };
    if (payload.parentPerformanceId === '') {
      payload.parentPerformanceId = null as unknown as string;
    }
    if (payload.venue === '') {
      payload.venue = null as unknown as string;
    }
    return await pb.collection('events').update<Event>(id, payload);
  },

  async deleteEvent(id: string) {
    try {
      // 1. Check if the event has any ticket purchases
      const purchases = await pb.collection('ticketPurchases').getFullList({
        filter: pb.filter('event = {:eventId}', { eventId: id }),
      });

      // 2. Fetch and physically delete all associated rehearsals
      const rehearsals = await pb.collection('events').getFullList<Event>({
        filter: pb.filter('parentPerformanceId = {:id}', { id }),
      });

      if (rehearsals.length > 0) {
        const batch = pb.createBatch();
        for (const r of rehearsals) {
          batch.collection('events').delete(r.id);
        }
        await batch.send();
      }

      // 3. Clear public audition target if applicable
      try {
        const auditionSettings = await settingsService.getAuditionSettings();
        if (auditionSettings.defaultPerformanceId === id) {
          await settingsService.saveAuditionSettings({
            ...auditionSettings,
            defaultPerformanceId: '',
            enabled: false,
          });
        }
      } catch (auditionErr: unknown) {
        console.warn('Failed to update audition settings during event deletion:', auditionErr);
      }

      // 4. Archive or physically delete
      if (purchases.length > 0) {
        await pb.collection('events').update(id, {
          isArchived: true,
          isTicketingEnabled: false,
          isOpenForRSVP: false,
        });
        return true;
      }
    } catch (err: unknown) {
      console.warn('Failed to cascade delete rehearsals or archive event client-side:', err);
    }
    return await pb.collection('events').delete(id);
  },

  async bulkCreateRehearsals(parentPerformance: Event, config: BulkRehearsalConfig) {
    const { count, dayOfWeek, time, venue } = config;
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error('Invalid day of week selected.');
    }

    if (!parentPerformance.date || isNaN(new Date(parentPerformance.date).getTime())) {
      throw new Error('Invalid performance date.');
    }

    const timezone = await settingsService.getTimezone();

    // 1. Get local performance date representation in the choir timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(parentPerformance.date));
    const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value || '0');

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');

    // Construct a safe, timezone-agnostic Date object representing the performance day
    const localPerfDate = new Date(year, month - 1, day);

    // Roll back to the first rehearsal date (using the local Date object)
    const current = new Date(localPerfDate);

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

    const rehearsals = [];

    // Loop backwards to create scheduled dates
    for (let i = 0; i < count; i++) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');

      // Local input value in the target timezone
      const localString = `${y}-${m}-${d}T${time}`;
      // Safely convert this to the correct UTC timestamp accounting for DST at that date
      const utcString = zonedInputValueToUtc(localString, timezone);

      rehearsals.push({
        title: `Rehearsal ${count - i}`,
        date: utcString,
        type: 'Rehearsal' as const,
        durationMinutes: 120,
        parentPerformanceId: parentPerformance.id,
        venue: venue || parentPerformance.venue || null,
        details: `Bulk generated rehearsal leading to ${parentPerformance.title || 'Performance'}`,
      });

      // Move back one week
      current.setDate(current.getDate() - 7);
    }

    const orderedRehearsals = rehearsals.reverse();
    const created: Event[] = [];

    // @allow-sequential-await - Chunked batch sends avoid oversized Batch API payloads.
    for (let i = 0; i < orderedRehearsals.length; i += BATCH_CHUNK_SIZE) {
      const batch = pb.createBatch();
      const chunk = orderedRehearsals.slice(i, i + BATCH_CHUNK_SIZE);
      for (const rehearsal of chunk) {
        batch.collection('events').create(rehearsal);
      }
      const results = await batch.send();
      created.push(...results.map((result) => result.body as Event));
    }

    return created;
  },

  async createEventWithRehearsals(
    data: Partial<Event> | FormData,
    bulkConfig?: BulkRehearsalConfig
  ) {
    const createdEvent = await this.createEvent(data);
    if (bulkConfig) {
      try {
        await this.bulkCreateRehearsals(createdEvent, bulkConfig);
      } catch (err: unknown) {
        // Rollback created event
        await this.deleteEvent(createdEvent.id);
        throw err;
      }
    }
    return createdEvent;
  },
};
