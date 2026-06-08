import { pb } from '../lib/pocketbase';
import { retryOn429, type Retry429Options } from '../lib/networkSafety';
import { ClientResponseError, type RecordModel } from 'pocketbase';
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

export interface RosterRequestOptions {
  onRetry?: Retry429Options['onRetry'];
}

type AttendanceStatus = EventRoster['attendance'];
type RsvpStatus = EventRoster['rsvp'];

const isPostCommitPocketBaseError = (err: unknown) => {
  return Boolean(
    err instanceof ClientResponseError &&
      err.status === 400
  );
};

async function updateAttendanceWithVerification(
  rosterId: string, 
  attendance: AttendanceStatus, 
  options: RosterRequestOptions = {}
) {
  try {
    return await retryOn429(() => 
      pb.collection('eventRosters').update<EventRoster>(rosterId, { attendance }),
      options
    );
  } catch (err: unknown) {
    if (isPostCommitPocketBaseError(err)) {
      const saved = await retryOn429(() => 
        pb.collection('eventRosters').getOne<EventRoster>(rosterId),
        options
      ).catch(() => null);
      if (saved?.attendance === attendance) {
        return saved;
      }
    }
    throw err;
  }
}

async function createAttendanceWithVerification(
  eventId: string, 
  profileId: string, 
  attendance: AttendanceStatus,
  options: RosterRequestOptions = {}
) {
  try {
    return await retryOn429(() => 
      pb.collection('eventRosters').create<EventRoster>({
        event: eventId,
        profile: profileId,
        rsvp: 'Pending',
        attendance,
        folderReturned: false,
      }),
      options
    );
  } catch (err: unknown) {
    if (isPostCommitPocketBaseError(err)) {
      const saved = await retryOn429(() => 
        pb.collection('eventRosters').getFirstListItem<EventRoster>(
          pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId })
        ),
        options
      ).catch(() => null);
      if (saved?.attendance === attendance) {
        return saved;
      }
    }
    throw err;
  }
}

export const rosterService = {
  async getMyRosters(options: RosterRequestOptions = {}) {
    // Note: This assumes we have a way to find the profile for the current user.
    // We'll filter by profile.user = pb.authStore.model.id
    return await retryOn429(() => 
      pb.collection('eventRosters').getFullList<EventRoster>({
        filter: pb.filter('profile.user = {:userId}', { userId: pb.authStore.model?.id }),
        expand: 'event',
      }),
      options
    );
  },

  async getSingerRosters(profileId: string, options: RosterRequestOptions = {}) {
    return await retryOn429(() => 
      pb.collection('eventRosters').getFullList<EventRoster>({
        filter: pb.filter('profile = {:profileId}', { profileId }),
        expand: 'event,event.venue',
      }),
      options
    );
  },

  async updateMyRSVP(eventId: string, rsvp: RsvpStatus, rsvpNote = '', options: RosterRequestOptions = {}) {
    return await retryOn429(() => 
      pb.send<EventRoster>('/api/singer/rsvp', {
        method: 'POST',
        body: { eventId, rsvp, rsvpNote },
      }),
      options
    );
  },

  async updateRSVP(eventId: string, profileId: string, rsvp: RsvpStatus, rsvpNote = '', options: RosterRequestOptions = {}) {
    try {
      const existing = await retryOn429(() => 
        pb.collection('eventRosters').getFirstListItem<EventRoster>(
          pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId })
        ),
        options
      );
      if (rsvp === 'Pending') {
        const attendance = existing.attendance || 'Pending';
        const folderNumber = (existing.folderNumber || '').trim();
        const folderReturned = existing.folderReturned;
        const seatId = (existing.seatId || '').trim();

        const hasOtherData = attendance !== 'Pending' ||
                             folderNumber !== '' ||
                             folderReturned ||
                             seatId !== '';
        if (!hasOtherData) {
          await retryOn429(() => pb.collection('eventRosters').delete(existing.id), options);
          return {
            id: '',
            event: eventId,
            profile: profileId,
            rsvp: 'Pending',
            attendance: 'Pending',
            folderReturned: false,
          } as EventRoster;
        } else {
          return await retryOn429(() => 
            pb.collection('eventRosters').update<EventRoster>(existing.id, {
              rsvp: 'Pending',
              rsvpNote: '',
            }),
            options
          );
        }
      } else {
        return await retryOn429(() => 
          pb.collection('eventRosters').update<EventRoster>(existing.id, {
            rsvp,
            rsvpNote: rsvp === 'No' ? rsvpNote : '',
          }),
          options
        );
      }
    } catch (err: unknown) {
      if (err instanceof ClientResponseError && err.status === 404) {
        if (rsvp === 'Pending') {
          return {
            id: '',
            event: eventId,
            profile: profileId,
            rsvp: 'Pending',
            attendance: 'Pending',
            folderReturned: false,
          } as EventRoster;
        }
        return await retryOn429(() => 
          pb.collection('eventRosters').create<EventRoster>({
            event: eventId,
            profile: profileId,
            rsvp,
            rsvpNote: rsvp === 'No' ? rsvpNote : '',
            attendance: 'Pending',
            folderReturned: false,
          }),
          options
        );
      }
      throw err;
    }
  },

  async getEventRoster(eventId: string, options: RosterRequestOptions = {}) {
    return await retryOn429(() => 
      pb.collection('eventRosters').getFullList<EventRoster>({
        filter: pb.filter('event = {:eventId}', { eventId }),
        expand: 'profile,profile.user',
      }),
      options
    );
  },

  async bulkUpdateRSVP(
    eventId: string, 
    updates: { profileId: string; rsvp: RsvpStatus }[],
    onProgress?: (current: number, total: number) => void,
    options: RosterRequestOptions = {}
  ) {
    if (updates.length === 0) {
      if (onProgress) onProgress(0, 0);
      return [];
    }

    if (onProgress) {
      onProgress(0, updates.length);
    }

    await retryOn429(() => 
      pb.send('/api/admin/bulk-update-rsvps', {
        method: 'POST',
        body: {
          eventId,
          updates
        }
      }),
      options
    );

    if (onProgress) {
      onProgress(updates.length, updates.length);
    }

    return [];
  },
  
  async updateAttendance(rosterId: string, attendance: AttendanceStatus, options: RosterRequestOptions = {}) {
    return await updateAttendanceWithVerification(rosterId, attendance, options);
  },

  async upsertAttendance(eventId: string, profileId: string, attendance: AttendanceStatus, options: RosterRequestOptions = {}) {
    try {
      const existing = await retryOn429(() => 
        pb.collection('eventRosters').getFirstListItem<EventRoster>(
          pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId })
        ),
        options
      );
      return await updateAttendanceWithVerification(existing.id, attendance, options);
    } catch (err: unknown) {
      if (err instanceof ClientResponseError && err.status === 404) {
        return await createAttendanceWithVerification(eventId, profileId, attendance, options);
      }
      throw err;
    }
  },

  async bulkUpsertAttendance(eventId: string, updates: { profileId: string, attendance: AttendanceStatus }[], options: RosterRequestOptions = {}) {
    const response = await retryOn429(() => 
      pb.send<{ rosters: EventRoster[] }>('/api/admin/bulk-upsert-attendance', {
        method: 'POST',
        body: {
          eventId,
          updates
        }
      }),
      options
    );

    return response.rosters ?? [];
  },

  async updateFolder(rosterId: string, data: { folderNumber?: string, folderReturned?: boolean }, options: RosterRequestOptions = {}) {
    return await retryOn429(() => 
      pb.collection('eventRosters').update<EventRoster>(rosterId, data),
      options
    );
  },

  async upsertFolder(eventId: string, profileId: string, data: { folderNumber?: string, folderReturned?: boolean }, options: RosterRequestOptions = {}) {
    try {
      const existing = await retryOn429(() => 
        pb.collection('eventRosters').getFirstListItem<EventRoster>(
          pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId })
        ),
        options
      );
      return await retryOn429(() => 
        pb.collection('eventRosters').update<EventRoster>(existing.id, data),
        options
      );
    } catch (err: unknown) {
      if (err instanceof ClientResponseError && err.status === 404) {
        return await retryOn429(() => 
          pb.collection('eventRosters').create<EventRoster>({
            event: eventId,
            profile: profileId,
            rsvp: 'Pending',
            attendance: 'Pending',
            folderNumber: data.folderNumber || '',
            folderReturned: data.folderReturned || false,
          }),
          options
        );
      }
      throw err;
    }
  }
};
