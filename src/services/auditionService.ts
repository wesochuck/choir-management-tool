import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import { profileService } from './profileService';

export interface Audition extends RecordModel {
  name: string;
  contact: string;
  timeSlot: string;
  voicePart?: 'S1' | 'S2' | 'A1' | 'A2' | 'T1' | 'T2' | 'B1' | 'B2';
  experience?: string;
  status: 'New' | 'Contacted' | 'Scheduled' | 'Closed';
  notes: string;
  created?: string;
  updated?: string;
}

const isEmailContact = (contact: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());

export const auditionService = {
  async getAuditions() {
    return await pb.collection('auditions').getFullList<Audition>({
      sort: '-created',
    });
  },

  async createAudition(data: Pick<Audition, 'name' | 'contact' | 'timeSlot'> & Partial<Pick<Audition, 'voicePart' | 'experience'>>) {
    return await pb.collection('auditions').create<Audition>({
      ...data,
      status: 'New',
    });
  },

  async updateAudition(id: string, data: Partial<Audition>) {
    return await pb.collection('auditions').update<Audition>(id, data);
  },

  async deleteAudition(id: string) {
    return await pb.collection('auditions').delete(id);
  },

  async convertAuditionToSinger(id: string) {
    const audition = await pb.collection('auditions').getOne<Audition>(id);
    const email = isEmailContact(audition.contact) ? audition.contact.trim() : undefined;
    const phone = !email && audition.contact && /[\d+]/.test(audition.contact) ? audition.contact.trim() : undefined;

    await profileService.createProfile({
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

    return await pb.collection('auditions').update<Audition>(id, { status: 'Closed' });
  },
};
