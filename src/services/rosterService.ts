import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Profile } from './profileService';

export interface EventRoster extends RecordModel {
  profile: string;
  event: string;
  rsvp: 'Yes' | 'No' | 'Pending';
  attendance: 'Present' | 'Absent' | 'Pending';
  seatId: string;
  folderNumber: string;
  folderReturned: boolean;
  expand?: {
    profile?: Profile;
  };
}

type AttendanceStatus = EventRoster['attendance'];
type RsvpStatus = EventRoster['rsvp'];

const isPostCommitPocketBaseError = (err: unknown) => {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'status' in err &&
      err.status === 400
  );
};

async function updateAttendanceWithVerification(rosterId: string, attendance: AttendanceStatus) {
  try {
    return await pb.collection('eventRosters').update<EventRoster>(rosterId, { attendance });
  } catch (err) {
    if (isPostCommitPocketBaseError(err)) {
      const saved = await pb.collection('eventRosters').getOne<EventRoster>(rosterId).catch(() => null);
      if (saved?.attendance === attendance) {
        return saved;
      }
    }
    throw err;
  }
}

async function createAttendanceWithVerification(eventId: string, profileId: string, attendance: AttendanceStatus) {
  try {
    return await pb.collection('eventRosters').create<EventRoster>({
      event: eventId,
      profile: profileId,
      rsvp: 'Pending',
      attendance,
      folderReturned: false,
    });
  } catch (err) {
    if (isPostCommitPocketBaseError(err)) {
      const saved = await pb.collection('eventRosters').getFirstListItem<EventRoster>(
        pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId })
      ).catch(() => null);
      if (saved?.attendance === attendance) {
        return saved;
      }
    }
    throw err;
  }
}

async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 250): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'status' in err &&
      (err as { status?: unknown }).status === 429 &&
      retries > 0
    ) {
      await pause(delay);
      return executeWithRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

function pause(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export const rosterService = {
  async getMyRosters() {
    // Note: This assumes we have a way to find the profile for the current user.
    // We'll filter by profile.user = pb.authStore.model.id
    return await pb.collection('eventRosters').getFullList<EventRoster>({
      filter: pb.filter('profile.user = {:userId}', { userId: pb.authStore.model?.id }),
      expand: 'event',
    });
  },

  async getSingerRosters(profileId: string) {
    return await pb.collection('eventRosters').getFullList<EventRoster>({
      filter: pb.filter('profile = {:profileId}', { profileId }),
      expand: 'event,event.venue',
    });
  },

  async updateRSVP(eventId: string, profileId: string, rsvp: RsvpStatus) {
    // Find existing or create new
    try {
      const existing = await pb.collection('eventRosters').getFirstListItem<EventRoster>(
        pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId })
      );

      // If we are resetting the RSVP to 'Pending', check if there is other useful data.
      // If not, we can safely delete the record to keep the DB clean and avoid stale entries.
      const hasOtherData = existing.attendance !== 'Pending' ||
                           Boolean(existing.folderNumber && existing.folderNumber.trim() !== '') ||
                           existing.folderReturned ||
                           Boolean(existing.seatId && existing.seatId.trim() !== '');

      if (rsvp === 'Pending' && !hasOtherData) {
        await pb.collection('eventRosters').delete(existing.id);
        return {
          ...existing,
          rsvp: 'Pending',
        } as EventRoster;
      }

      return await pb.collection('eventRosters').update<EventRoster>(existing.id, { rsvp });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
        // If it doesn't exist and we want to set it to Pending, no need to create a database record
        if (rsvp === 'Pending') {
          return {
            id: '',
            event: eventId,
            profile: profileId,
            rsvp: 'Pending',
            attendance: 'Pending',
            folderNumber: '',
            folderReturned: false,
            seatId: '',
          } as unknown as EventRoster;
        }
        return await pb.collection('eventRosters').create<EventRoster>({
          event: eventId,
          profile: profileId,
          rsvp,
          attendance: 'Pending',
          folderReturned: false,
        });
      }
      throw err;
    }
  },

  async getEventRoster(eventId: string) {
    return await pb.collection('eventRosters').getFullList<EventRoster>({
      filter: pb.filter('event = {:eventId}', { eventId }),
      expand: 'profile,profile.user',
    });
  },

  async bulkUpdateRSVP(eventId: string, updates: { profileId: string, rsvp: RsvpStatus }[]) {
    const results: EventRoster[] = [];
    const chunkSize = 2;

    for (let i = 0; i < updates.length; i += chunkSize) {
      if (i > 0) {
        await pause(100);
      }
      const chunk = updates.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(update => executeWithRetry(() => rosterService.updateRSVP(eventId, update.profileId, update.rsvp)))
      );
      results.push(...chunkResults);
    }

    return results;
  },
  
  async updateAttendance(rosterId: string, attendance: AttendanceStatus) {
    return await updateAttendanceWithVerification(rosterId, attendance);
  },

  async upsertAttendance(eventId: string, profileId: string, attendance: AttendanceStatus) {
    try {
      const existing = await pb.collection('eventRosters').getFirstListItem<EventRoster>(
        pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId })
      );
      return await updateAttendanceWithVerification(existing.id, attendance);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
        return await createAttendanceWithVerification(eventId, profileId, attendance);
      }
      throw err;
    }
  },

  async bulkUpsertAttendance(eventId: string, updates: { profileId: string, attendance: AttendanceStatus }[]) {
    const existing = await pb.collection('eventRosters').getFullList<EventRoster>({
      filter: pb.filter('event = {:eventId}', { eventId }),
    });
    const existingMap = new Map(existing.map(r => [r.profile, r]));

    const operations = updates.map(update => {
      const existingRoster = existingMap.get(update.profileId);
      if (existingRoster) {
        return () => executeWithRetry(() => updateAttendanceWithVerification(existingRoster.id, update.attendance));
      } else {
        return () => executeWithRetry(() => createAttendanceWithVerification(eventId, update.profileId, update.attendance));
      }
    });

    const results: EventRoster[] = [];
    const chunkSize = 2;
    for (let i = 0; i < operations.length; i += chunkSize) {
      if (i > 0) {
        await pause(100);
      }
      const chunk = operations.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map(op => op()));
      results.push(...chunkResults);
    }

    return results;
  },

  async updateFolder(rosterId: string, data: { folderNumber?: string, folderReturned?: boolean }) {
    return await pb.collection('eventRosters').update<EventRoster>(rosterId, data);
  },

  async upsertFolder(eventId: string, profileId: string, data: { folderNumber?: string, folderReturned?: boolean }) {
    try {
      const existing = await pb.collection('eventRosters').getFirstListItem<EventRoster>(
        pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId })
      );
      return await pb.collection('eventRosters').update<EventRoster>(existing.id, data);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
        return await pb.collection('eventRosters').create<EventRoster>({
          event: eventId,
          profile: profileId,
          rsvp: 'Pending',
          attendance: 'Pending',
          folderNumber: data.folderNumber || '',
          folderReturned: data.folderReturned || false,
        });
      }
      throw err;
    }
  }
};
