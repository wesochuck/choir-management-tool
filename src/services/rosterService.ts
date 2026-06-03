import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Profile } from './profileService';

export interface EventRoster extends RecordModel {
  profile: string;
  event: string;
  rsvp: 'Yes' | 'No' | 'Pending';
  attendance: 'Present' | 'Absent' | 'Pending';
  rsvpNote?: string;
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

  async updateRSVP(eventId: string, profileId: string, rsvp: RsvpStatus, rsvpNote = '') {
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
          rsvpNote: '',
        } as EventRoster;
      }

      const updateData: Partial<EventRoster> = { rsvp };
      if (rsvp === 'No') {
        updateData.rsvpNote = rsvpNote;
      } else {
        updateData.rsvpNote = '';
      }

      return await pb.collection('eventRosters').update<EventRoster>(existing.id, updateData);
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
            rsvpNote: '',
            folderNumber: '',
            folderReturned: false,
            seatId: '',
          } as unknown as EventRoster;
        }
        return await pb.collection('eventRosters').create<EventRoster>({
          event: eventId,
          profile: profileId,
          rsvp,
          rsvpNote: rsvp === 'No' ? rsvpNote : '',
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

  async bulkUpdateRSVP(
    eventId: string, 
    updates: { profileId: string; rsvp: RsvpStatus }[],
    onProgress?: (current: number, total: number) => void
  ) {
    if (updates.length === 0) {
      if (onProgress) onProgress(0, 0);
      return [];
    }

    if (onProgress) {
      onProgress(0, updates.length);
    }

    await pb.send('/api/admin/bulk-update-rsvps', {
      method: 'POST',
      body: {
        eventId,
        updates
      }
    });

    if (onProgress) {
      onProgress(updates.length, updates.length);
    }

    return [];
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
    const response = await pb.send<{ rosters: EventRoster[] }>('/api/admin/bulk-upsert-attendance', {
      method: 'POST',
      body: {
        eventId,
        updates
      }
    });

    return response.rosters ?? [];
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
