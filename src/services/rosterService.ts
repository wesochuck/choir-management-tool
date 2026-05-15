import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface EventRoster extends RecordModel {
  profile: string;
  event: string;
  rsvp: 'Yes' | 'No' | 'Pending';
  attendance: 'Present' | 'Absent' | 'Pending';
  seatId: string;
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
    } catch (err: any) {
      if (err.status === 404) {
        return await pb.collection('eventRosters').create<EventRoster>({
          event: eventId,
          profile: profileId,
          rsvp,
          attendance: 'Pending',
        });
      }
      throw err;
    }
  },

  async getEventRoster(eventId: string) {
    return await pb.collection('eventRosters').getFullList<EventRoster>({
      filter: `event = "${eventId}"`,
      expand: 'profile',
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
    } catch (err: any) {
      if (err.status === 404) {
        return await pb.collection('eventRosters').create<EventRoster>({
          event: eventId,
          profile: profileId,
          rsvp: 'Pending',
          attendance,
        });
      }
      throw err;
    }
  }
};
