import { pb } from '../lib/pocketbase';
import { ClientResponseError, type RecordModel } from 'pocketbase';
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

export const rosterService = {
  async getMyRosters() {
    // Note: This assumes we have a way to find the profile for the current user.
    // We'll filter by profile.user = pb.authStore.model.id
    return await pb.collection('eventRosters').getFullList<EventRoster>({
      filter: `profile.user = "${pb.authStore.model?.id}"`,
      expand: 'event',
    });
  },

  async updateRSVP(eventId: string, profileId: string, rsvp: 'Yes' | 'No') {
    // Find existing or create new
    try {
      const existing = await pb.collection('eventRosters').getFirstListItem<EventRoster>(
        `event = "${eventId}" && profile = "${profileId}"`
      );
      return await pb.collection('eventRosters').update<EventRoster>(existing.id, { rsvp });
    } catch (err: unknown) {
      if (err instanceof ClientResponseError && err.status === 404) {
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
      filter: `event = "${eventId}"`,
      expand: 'profile,profile.user',
    });
  },
  
  async updateAttendance(rosterId: string, attendance: 'Present' | 'Absent' | 'Pending') {
    return await pb.collection('eventRosters').update<EventRoster>(rosterId, { attendance });
  },

  async upsertAttendance(eventId: string, profileId: string, attendance: 'Present' | 'Absent' | 'Pending') {
    try {
      const existing = await pb.collection('eventRosters').getFirstListItem<EventRoster>(
        `event = "${eventId}" && profile = "${profileId}"`
      );
      return await pb.collection('eventRosters').update<EventRoster>(existing.id, { attendance });
    } catch (err: unknown) {
      if (err instanceof ClientResponseError && err.status === 404) {
        return await pb.collection('eventRosters').create<EventRoster>({
          event: eventId,
          profile: profileId,
          rsvp: 'Pending',
          attendance,
          folderReturned: false,
        });
      }
      throw err;
    }
  },

  async updateFolder(rosterId: string, data: { folderNumber?: string, folderReturned?: boolean }) {
    return await pb.collection('eventRosters').update<EventRoster>(rosterId, data);
  },

  async upsertFolder(eventId: string, profileId: string, data: { folderNumber?: string, folderReturned?: boolean }) {
    try {
      const existing = await pb.collection('eventRosters').getFirstListItem<EventRoster>(
        `event = "${eventId}" && profile = "${profileId}"`
      );
      return await pb.collection('eventRosters').update<EventRoster>(existing.id, data);
    } catch (err: unknown) {
      if (err instanceof ClientResponseError && err.status === 404) {
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
