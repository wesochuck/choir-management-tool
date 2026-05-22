import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

import { type Event } from './eventService';
import type { Profile } from './profileService';

export interface Audition extends RecordModel {
  name: string;
  contact: string;
  timeSlot: string;
  voicePart?: string;
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

export type AuditionInput = Pick<Audition, 'name' | 'contact' | 'timeSlot'> & Partial<Pick<Audition, 'voicePart' | 'experience' | 'performance' | 'status' | 'notes'>>;
type ConvertibleAudition = Audition & Partial<{ email: string; phone: string }>;

const isEmailContact = (contact: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());

export const auditionService = {
  async getAuditions() {
    return await pb.collection('auditions').getFullList<Audition>({
      sort: '-created',
      expand: 'performance',
    });
  },

  async createAudition(data: AuditionInput) {
    return await pb.collection('auditions').create<Audition>({
      status: 'New',
      ...data,
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
    const newProfile = await convertAuditionToSinger(audition);

    // Automatically link to the performance roster if specified
    if (audition.performance) {
      try {
        // 1. Find all related events (the performance itself + rehearsals tied to it)
        const relatedEvents = await pb.collection('events').getFullList<Event>({
          filter: pb.filter('id = {:performanceId} || parentPerformanceId = {:performanceId}', { performanceId: audition.performance }),
        });

        // 2. Create roster entries for each using batch to avoid N+1 requests
        const batch = pb.createBatch();
        for (const event of relatedEvents) {
          batch.collection('eventRosters').create({
            profile: newProfile.id,
            event: event.id,
            rsvp: 'Pending',
            attendance: 'Pending',
            folderReturned: false,
          });
        }
        await batch.send();
      } catch (e) {
        console.error('Failed to link converted singer to performance rosters', e);
      }
    }

    return await pb.collection('auditions').update<Audition>(id, { status: 'Closed' });
  },
};

export async function convertAuditionToSinger(audition: ConvertibleAudition): Promise<Profile> {
  const email = isEmailContact(audition.contact || '') ? audition.contact.trim() : (audition.email || '');
  const phone = !email && audition.contact && /[\d+]/.test(audition.contact) ? audition.contact.trim() : (audition.phone || '');

  const profileData = {
    name: audition.name,
    email: email || '',
    phone: phone || '',
    voicePart: audition.voicePart || '',
    globalStatus: 'Active (Current)',
    notes: [
      audition.experience ? `Audition experience: ${audition.experience}` : '',
      audition.notes ? `Audition notes: ${audition.notes}` : '',
    ].filter(Boolean).join('\n\n'),
  };

  return await pb.collection('profiles').create<Profile>(profileData);
}
