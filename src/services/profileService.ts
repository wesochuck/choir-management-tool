import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Profile extends RecordModel {
  user: string;
  name: string;
  phone: string;
  voicePart: 'S1' | 'S2' | 'A1' | 'A2' | 'T1' | 'T2' | 'B1' | 'B2';
  globalStatus: 'Active (Current)' | 'Active (Future)' | 'Inactive';
  notes: string;
}

export const profileService = {
  async getProfiles() {
    return await pb.collection('profiles').getFullList<Profile>({
      sort: 'name',
    });
  },

  async getMyProfile() {
    return await pb.collection('profiles').getFirstListItem<Profile>(
      `user = "${pb.authStore.model?.id}"`
    );
  },

  async createProfile(data: Partial<Profile>) {
    return await pb.collection('profiles').create<Profile>(data);
  },

  async updateProfile(id: string, data: Partial<Profile>) {
    return await pb.collection('profiles').update<Profile>(id, data);
  },

  async deleteProfile(id: string) {
    return await pb.collection('profiles').delete(id);
  },
};
