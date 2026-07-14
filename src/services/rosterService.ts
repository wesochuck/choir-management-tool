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
  return err instanceof ClientResponseError && err.status === 400;
};

async function updateRosterWithVerification(
  rosterId: string,
  data: { attendance?: AttendanceStatus; rsvp?: RsvpStatus },
  options: RosterRequestOptions = {}
) {
  try {
    return await retryOn429(
      () => pb.collection('eventRosters').update<EventRoster>(rosterId, data),
      options
    );
  } catch (err: unknown) {
    if (isPostCommitPocketBaseError(err)) {
      const saved = await retryOn429(
        () => pb.collection('eventRosters').getOne<EventRoster>(rosterId),
        options
      ).catch(() => null);
      if (
        saved &&
        (data.attendance === undefined || saved.attendance === data.attendance) &&
        (data.rsvp === undefined || saved.rsvp === data.rsvp)
      ) {
        return saved;
      }
    }
    throw err;
  }
}

async function createRosterWithVerification(
  eventId: string,
  profileId: string,
  data: { attendance: AttendanceStatus; rsvp?: RsvpStatus },
  options: RosterRequestOptions = {}
) {
  try {
    return await retryOn429(
      () =>
        pb.collection('eventRosters').create<EventRoster>({
          event: eventId,
          profile: profileId,
          rsvp: data.rsvp || 'Pending',
          attendance: data.attendance,
          folderReturned: false,
        }),
      options
    );
  } catch (err: unknown) {
    if (isPostCommitPocketBaseError(err)) {
      const list = await retryOn429(
        () =>
          pb.collection('eventRosters').getFullList<EventRoster>({
            filter: pb.filter('event = {:eventId} && profile = {:profileId}', {
              eventId,
              profileId,
            }),
            perPage: 1,
          }),
        options
      ).catch(() => null);
      const saved = list?.[0];
      if (
        saved &&
        saved.attendance === data.attendance &&
        (data.rsvp === undefined || saved.rsvp === data.rsvp)
      ) {
        return saved;
      }
    }
    throw err;
  }
}

export const rosterService = {
  async getMyRosters(userId: string, options: RosterRequestOptions = {}) {
    return await retryOn429(
      () =>
        pb.collection('eventRosters').getFullList<EventRoster>({
          filter: pb.filter('profile.user = {:userId}', { userId }),
          expand: 'event',
        }),
      options
    );
  },

  async getSingerRosters(profileId: string, options: RosterRequestOptions = {}) {
    return await retryOn429(
      () =>
        pb.collection('eventRosters').getFullList<EventRoster>({
          filter: pb.filter('profile = {:profileId}', { profileId }),
          expand: 'event,event.venue',
        }),
      options
    );
  },

  async updateMyRSVP(
    eventId: string,
    rsvp: RsvpStatus,
    rsvpNote = '',
    options: RosterRequestOptions = {}
  ) {
    return await retryOn429(
      () =>
        pb.send<EventRoster>('/api/singer/rsvp', {
          method: 'POST',
          body: { eventId, rsvp, rsvpNote },
        }),
      options
    );
  },

  async updateRSVP(
    eventId: string,
    profileId: string,
    rsvp: RsvpStatus,
    rsvpNote = '',
    options: RosterRequestOptions = {}
  ) {
    const list = await retryOn429(
      () =>
        pb.collection('eventRosters').getFullList<EventRoster>({
          filter: pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId }),
          perPage: 1,
        }),
      options
    );
    const existing = list[0];
    if (existing) {
      if (rsvp === 'Pending') {
        const attendance = existing.attendance || 'Pending';
        const folderNumber = (existing.folderNumber || '').trim();
        const folderReturned = existing.folderReturned;
        const seatId = (existing.seatId || '').trim();

        const hasOtherData =
          attendance !== 'Pending' || folderNumber !== '' || folderReturned || seatId !== '';
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
          return await retryOn429(
            () =>
              pb.collection('eventRosters').update<EventRoster>(existing.id, {
                rsvp: 'Pending',
                rsvpNote: '',
              }),
            options
          );
        }
      } else {
        return await retryOn429(
          () =>
            pb.collection('eventRosters').update<EventRoster>(existing.id, {
              rsvp,
              rsvpNote: rsvp === 'No' ? rsvpNote : '',
            }),
          options
        );
      }
    } else {
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
      return await retryOn429(
        () =>
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
  },

  async getEventRoster(eventId: string, options: RosterRequestOptions = {}) {
    return await retryOn429(
      () =>
        pb.collection('eventRosters').getFullList<EventRoster>({
          filter: pb.filter('event = {:eventId}', { eventId }),
          expand: 'profile,profile.user',
        }),
      options
    );
  },

  async getEventRostersBatch(eventIds: string[], options: RosterRequestOptions = {}) {
    if (eventIds.length === 0) return [];
    if (eventIds.length === 1) {
      return await this.getEventRoster(eventIds[0], options);
    }
    const filterParts = eventIds.map((_, i) => `event = {:id${i}}`).join(' || ');
    const params = eventIds.reduce<Record<string, string>>((acc, id, i) => {
      acc[`id${i}`] = id;
      return acc;
    }, {});
    return await retryOn429(
      () =>
        pb.collection('eventRosters').getFullList<EventRoster>({
          filter: pb.filter(filterParts, params),
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

    await retryOn429(
      () =>
        pb.send('/api/admin/bulk-update-rsvps', {
          method: 'POST',
          body: {
            eventId,
            updates,
          },
        }),
      options
    );

    if (onProgress) {
      onProgress(updates.length, updates.length);
    }

    return [];
  },

  async updateAttendance(
    rosterId: string,
    attendance: AttendanceStatus,
    options: RosterRequestOptions = {}
  ) {
    return await updateRosterWithVerification(rosterId, { attendance }, options);
  },

  async upsertAttendance(
    eventId: string,
    profileId: string,
    attendance: AttendanceStatus,
    options: RosterRequestOptions & { rosterId?: string; rsvp?: RsvpStatus } = {}
  ) {
    const { rosterId, rsvp, ...retryOpts } = options;
    const updateData: { attendance: AttendanceStatus; rsvp?: RsvpStatus } = { attendance };
    if (rsvp) {
      updateData.rsvp = rsvp;
    }

    if (rosterId) {
      return await updateRosterWithVerification(rosterId, updateData, retryOpts);
    }

    const list = await retryOn429(
      () =>
        pb.collection('eventRosters').getFullList<EventRoster>({
          filter: pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId }),
          perPage: 1,
        }),
      retryOpts
    );
    const existing = list[0];
    if (existing) {
      return await updateRosterWithVerification(existing.id, updateData, retryOpts);
    } else {
      return await createRosterWithVerification(eventId, profileId, updateData, retryOpts);
    }
  },

  async bulkUpsertAttendance(
    eventId: string,
    updates: { profileId: string; attendance: AttendanceStatus }[],
    options: RosterRequestOptions = {}
  ) {
    const response = await retryOn429(
      () =>
        pb.send<{ rosters: EventRoster[] }>('/api/admin/bulk-upsert-attendance', {
          method: 'POST',
          body: {
            eventId,
            updates,
          },
        }),
      options
    );

    return response.rosters ?? [];
  },

  async updateFolder(
    rosterId: string,
    data: { folderNumber?: string; folderReturned?: boolean },
    options: RosterRequestOptions = {}
  ) {
    return await retryOn429(
      () => pb.collection('eventRosters').update<EventRoster>(rosterId, data),
      options
    );
  },

  async upsertFolder(
    eventId: string,
    profileId: string,
    data: { folderNumber?: string; folderReturned?: boolean },
    options: RosterRequestOptions = {}
  ) {
    const list = await retryOn429(
      () =>
        pb.collection('eventRosters').getFullList<EventRoster>({
          filter: pb.filter('event = {:eventId} && profile = {:profileId}', { eventId, profileId }),
          perPage: 1,
        }),
      options
    );
    const existing = list[0];
    if (existing) {
      return await retryOn429(
        () => pb.collection('eventRosters').update<EventRoster>(existing.id, data),
        options
      );
    } else {
      return await retryOn429(
        () =>
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
  },

  async getAcceptedRostersForEvent(eventId: string, options: RosterRequestOptions = {}) {
    return await retryOn429(
      () =>
        pb.collection('eventRosters').getFullList<EventRoster>({
          filter: pb.filter('event = {:eventId} && rsvp = "Yes"', { eventId }),
        }),
      options
    );
  },

  async getRostersForEvents(eventIds: string[], options: RosterRequestOptions = {}) {
    if (eventIds.length === 0) return [];
    const { filterStr, params } = eventIds.reduce(
      (acc, id, i) => {
        acc.filterStr += (i === 0 ? '' : ' || ') + `event = {:eventId${i}}`;
        acc.params[`eventId${i}`] = id;
        return acc;
      },
      { filterStr: '', params: {} as Record<string, string> }
    );
    return await retryOn429(
      () =>
        pb.collection('eventRosters').getFullList<EventRoster>({
          filter: pb.filter(filterStr, params),
        }),
      options
    );
  },
};
