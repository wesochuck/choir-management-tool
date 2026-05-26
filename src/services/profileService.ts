import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Profile extends RecordModel {
  user: string;
  name: string;
  phone: string;
  photo: string;
  voicePart: string;
  globalStatus: 'Active' | 'Idle' | 'Inactive';
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
  doNotEmail?: boolean;
  statusIsManual?: boolean;
}

const splitProfileInput = (data: ProfileInput) => {
  const profile = { ...data };
  const email = profile.email?.trim();
  delete profile.email;
  delete profile.expand;
  delete profile.photo;
  return { email: email?.trim(), profile };
};

/**
 * Generates a cryptographically secure random password of a given length.
 * Uses Web Crypto API when available, falling back to Math.random only in legacy/unsupported environments.
 */
export const generateRandomPassword = (length = 12): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const array = new Uint32Array(length);
    cryptoObj.getRandomValues(array);
    return Array.from(array, (num) => chars[num % chars.length]).join('');
  }
  
  // Fallback to Math.random only if secure Web Crypto API is unavailable (e.g. testing environments)
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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
      pb.filter('user = {:userId}', { userId: pb.authStore.model?.id || '' })
    );
  },

  async createProfile(data: ProfileInput) {
    const { email, profile } = splitProfileInput(data);

    if (email) {
      const password = generateRandomPassword();

      const user = await pb.collection('users').create<UserAccount>({
        email,
        password,
        passwordConfirm: password,
        role: 'singer',
        name: profile.name || email,
      });

      try {
        const newProfile = await pb.collection('profiles').create<Profile>({ ...profile, user: user.id });
        // Automatically send the password setup email
        await pb.collection('users').requestPasswordReset(email);
        return newProfile;
      } catch (err) {
        await pb.collection('users').delete(user.id).catch(() => undefined);
        throw err;
      }
    }

    return await pb.collection('profiles').create<Profile>(profile);
  },

  async updateProfile(id: string, data: ProfileInput) {
    const { email, profile } = splitProfileInput(data);
    const current = await pb.collection('profiles').getOne<Profile>(id, { expand: 'user' });
    let userId = current.user;

    if (email === "") {
      if (userId) {
        await pb.collection('users').delete(userId).catch(() => undefined);
        userId = '';
      }
    } else if (email) {
      if (userId) {
        const userPayload: Partial<UserAccount> = {
          name: profile.name || current.name,
          email: email,
        };
        await pb.collection('users').update<UserAccount>(userId, userPayload);
      } else {
        const password = generateRandomPassword();
        const user = await pb.collection('users').create<UserAccount>({
          email,
          password,
          passwordConfirm: password,
          role: 'singer',
          name: profile.name || current.name || email,
        });
        userId = user.id;
        // Automatically send the password setup email for the new user account
        await pb.collection('users').requestPasswordReset(email);
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

  async requestPasswordReset(email: string) {
    return await pb.collection('users').requestPasswordReset(email);
  },
};

export function exportToCSV(profiles: Profile[]): string {
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

export async function updateProfilePhoto(id: string, formData: FormData) {
  return await pb.collection('profiles').update<Profile>(id, formData);
}

export async function deleteProfilePhoto(id: string) {
  return await pb.collection('profiles').update<Profile>(id, { photo: null });
}

