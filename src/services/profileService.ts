import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Profile extends RecordModel {
  user: string;
  name: string;
  phone: string;
  voicePart: 'S1' | 'S2' | 'A1' | 'A2' | 'T1' | 'T2' | 'B1' | 'B2';
  globalStatus: 'Active (Current)' | 'Active (Future)' | 'Inactive';
  notes: string;
  doNotEmail?: boolean;
  statusIsManual?: boolean;
  statusLastChangedAt?: string;
  statusChangeReason?: string;
  expand?: {
    user?: UserAccount;
  };
}

export interface UserAccount extends RecordModel {
  email: string;
  name: string;
  role: 'admin' | 'singer';
}

export interface ProfileInput extends Partial<Profile> {
  email?: string;
  password?: string;
  doNotEmail?: boolean;
  statusIsManual?: boolean;
}

const splitProfileInput = (data: ProfileInput) => {
  const profile = { ...data };
  const email = profile.email?.trim();
  const password = profile.password;
  delete profile.email;
  delete profile.password;
  delete profile.expand;
  return { email: email?.trim(), password, profile };
};

const generateRandomPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const profileService = {
  async getProfiles() {
    return await pb.collection('profiles').getFullList<Profile>({
      sort: 'name',
      expand: 'user',
    });
  },

  async getActiveProfiles() {
    return await pb.collection('profiles').getFullList<Profile>({
      filter: 'globalStatus != "Inactive"',
      sort: 'name',
    });
  },

  async getMyProfile() {
    return await pb.collection('profiles').getFirstListItem<Profile>(
      `user = "${pb.authStore.model?.id}"`
    );
  },

  async createProfile(data: ProfileInput) {
    const { email, password: providedPassword, profile } = splitProfileInput(data);

    if (email) {
      const password = providedPassword || generateRandomPassword();
      
      if (password.length < 8) {
        throw new Error('Singer account passwords must be at least 8 characters.');
      }

      const user = await pb.collection('users').create<UserAccount>({
        email,
        password,
        passwordConfirm: password,
        role: 'singer',
        name: profile.name || email,
      });

      try {
        return await pb.collection('profiles').create<Profile>({ ...profile, user: user.id });
      } catch (err) {
        await pb.collection('users').delete(user.id).catch(() => undefined);
        throw err;
      }
    }

    return await pb.collection('profiles').create<Profile>(profile);
  },

  async updateProfile(id: string, data: ProfileInput) {
    const { email, password, profile } = splitProfileInput(data);
    const current = await pb.collection('profiles').getOne<Profile>(id, { expand: 'user' });
    let userId = current.user;

    if (email || password) {
      if (userId) {
        const userPayload: Partial<UserAccount> & { password?: string; passwordConfirm?: string } = {
          name: profile.name || current.name,
        };
        if (email) userPayload.email = email;
        if (password) {
          if (password.length < 8) {
            throw new Error('Singer account passwords must be at least 8 characters.');
          }
          userPayload.password = password;
          userPayload.passwordConfirm = password;
        }
        await pb.collection('users').update<UserAccount>(userId, userPayload);
      } else {
        if (!email || !password || password.length < 8) {
          throw new Error('Provide an email and a password of at least 8 characters to create a singer login.');
        }
        const user = await pb.collection('users').create<UserAccount>({
          email,
          password,
          passwordConfirm: password,
          role: 'singer',
          name: profile.name || current.name || email,
        });
        userId = user.id;
      }
    }

    return await pb.collection('profiles').update<Profile>(id, { ...profile, user: userId || null });
  },

  async deleteProfile(id: string) {
    const current = await pb.collection('profiles').getOne<Profile>(id);
    await pb.collection('profiles').delete(id);

    if (current.user) {
      await pb.collection('users').delete(current.user).catch(() => undefined);
    }
  },
};

export function exportToCSV(profiles: any[]): string {
  const header = ['Name', 'Email', 'Phone', 'Voice Part', 'Status'].join(',');
  const rows = profiles.map(p => {
    const email = p.email || p.expand?.user?.email || '';
    return [
      `"${p.name || ''}"`,
      `"${email}"`,
      `"${p.phone || ''}"`,
      `"${p.voicePart || ''}"`,
      `"${p.globalStatus || ''}"`
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

