import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import { profileService } from './profileService';

import { type Event } from './eventService';

export interface Audition extends RecordModel {
  name: string;
  contact: string;
  timeSlot: string;
  voicePart?: 'S1' | 'S2' | 'A1' | 'A2' | 'T1' | 'T2' | 'B1' | 'B2';
  experience?: string;
  status: 'New' | 'Contacted' | 'Scheduled' | 'Closed';
  notes: string;
  performance?: string;
  created?: string;
  updated?: string;
  expand?: {
    performance?: Event;
  };
}

const isEmailContact = (contact: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());

export const auditionService = {
  async getAuditions() {
    return await pb.collection('auditions').getFullList<Audition>({
      sort: '-created',
      expand: 'performance',
    });
  },

  async createAudition(data: Pick<Audition, 'name' | 'contact' | 'timeSlot'> & Partial<Pick<Audition, 'voicePart' | 'experience' | 'performance'>>) {
    return await pb.collection('auditions').create<Audition>({
      ...data,
      status: 'New',
    });
  },

  async updateAudition(id: string, data: Partial<Audition>) {
    return await pb.collection('auditions').update<Audition>(id, data, {
      expand: 'performance',
    });
  },

  async deleteAudition(id: string) {
    return await pb.collection('auditions').delete(id);
  },

  async convertAuditionToSinger(id: string) {
    const audition = await pb.collection('auditions').getOne<Audition>(id);
    const email = isEmailContact(audition.contact) ? audition.contact.trim() : undefined;
    const phone = !email && audition.contact && /[\d+]/.test(audition.contact) ? audition.contact.trim() : undefined;

    const newProfile = await profileService.createProfile({
      name: audition.name,
      phone: phone || '',
      voicePart: audition.voicePart || 'S1',
      globalStatus: 'Active (Future)',
      notes: [
        audition.experience ? `Audition experience: ${audition.experience}` : '',
        audition.notes ? `Audition notes: ${audition.notes}` : '',
      ].filter(Boolean).join('\n\n'),
      email,
    });

    // Automatically link to the performance roster if specified
    if (audition.performance) {
      try {
        // 1. Find all related events (the performance itself + rehearsals tied to it)
        const relatedEvents = await pb.collection('events').getFullList<Event>({
          filter: `id = "${audition.performance}" || parentPerformanceId = "${audition.performance}"`,
        });

        // 2. Create roster entries for each
        const rosterPromises = relatedEvents.map(event => 
          pb.collection('eventRosters').create({
            profile: newProfile.id,
            event: event.id,
            rsvp: 'Pending',
            attendance: 'Pending',
            folderReturned: false,
          }).catch(() => undefined) // Ignore duplicates or individual failures
        );

        await Promise.all(rosterPromises);
      } catch (e) {
        console.error('Failed to link converted singer to performance rosters', e);
      }
    }

    return await pb.collection('auditions').update<Audition>(id, { status: 'Closed' });
  },
};
