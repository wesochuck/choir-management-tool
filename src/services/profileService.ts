import { pb } from '../lib/pocketbase';
import { retryOn429, type Retry429Options } from '../lib/networkSafety';
import type { RecordModel } from 'pocketbase';

export interface Profile extends RecordModel {
  user: string | null;
  name: string;
  phone: string;
  photo: string;
  voicePart: string;
  globalStatus: 'Active' | 'Idle' | 'Inactive';
  notes: string;
  doNotEmail?: boolean;
  receiveAttendanceReports?: boolean;
  receiveRsvpDeclineNotices?: boolean;
  receiveAdminNotifications?: boolean;
  isSectionLeader?: boolean;
  statusIsManual?: boolean;
  statusLastChangedAt?: string;
  statusChangeReason?: string;
  calendarSalt?: string;
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
  receiveAttendanceReports?: boolean;
  receiveRsvpDeclineNotices?: boolean;
  receiveAdminNotifications?: boolean;
  isSectionLeader?: boolean;
  statusIsManual?: boolean;
  role?: 'admin' | 'singer';
}

interface ProfileFetchOptions {
  onRetry?: Retry429Options['onRetry'];
}

const splitProfileInput = (data: ProfileInput) => {
  const profile = { ...data };
  const email = profile.email?.trim();
  const role = profile.role;
  delete profile.email;
  delete profile.role;
  delete profile.expand;
  delete profile.photo;
  return { email: email?.trim(), role, profile };
};

/**
 * Generates a cryptographically secure random password of a given length.
 * Uses Web Crypto API when available, throwing an error if unavailable to prevent insecure fallbacks.
 */
export const generateRandomPassword = (length = 12): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const array = new Uint32Array(length);
    cryptoObj.getRandomValues(array);
    return Array.from(array, (num) => chars[num % chars.length]).join('');
  }
  
  throw new Error('Secure random number generation is not supported in this environment');
};

let inFlightActiveProfiles: Promise<Profile[]> | null = null;

export const profileService = {
  async getProfiles(options: ProfileFetchOptions = {}) {
    return await retryOn429(() =>
      pb.collection('profiles').getFullList<Profile>({
        sort: 'name',
        expand: 'user',
      }),
      { onRetry: options.onRetry },
    );
  },

  async getActiveProfiles(options: ProfileFetchOptions = {}) {
    if (inFlightActiveProfiles) return inFlightActiveProfiles;

    const promise = retryOn429(() =>
      pb.collection('profiles').getFullList<Profile>({
        filter: 'globalStatus != "Inactive"',
        sort: 'name',
      }),
      { onRetry: options.onRetry },
    );

    inFlightActiveProfiles = promise;
    promise.finally(() => { inFlightActiveProfiles = null; });

    return promise;
  },

  async getMyProfile() {
    return await pb.collection('profiles').getFirstListItem<Profile>(
      pb.filter('user = {:userId}', { userId: pb.authStore.model?.id || '' })
    );
  },

  async createProfile(data: ProfileInput) {
    const { email, role, profile } = splitProfileInput(data);

    if (email) {
      const password = generateRandomPassword();

      const user = await pb.collection('users').create<UserAccount>({
        email,
        password,
        passwordConfirm: password,
        role: role || 'singer',
        name: profile.name || email,
      });

      try {
        const newProfile = await pb.collection('profiles').create<Profile>({ ...profile, user: user.id });
        // Automatically send the password setup email
        await pb.collection('users').requestPasswordReset(email);
        return newProfile;
      } catch (err: unknown) {
        await pb.collection('users').delete(user.id).catch(() => undefined);
        throw err;
      }
    }

    return await pb.collection('profiles').create<Profile>(profile);
  },

  async updateProfile(id: string, data: ProfileInput) {
    const { email, role, profile } = splitProfileInput(data);
    const current = await pb.collection('profiles').getOne<Profile>(id, { expand: 'user' });

    const currentUserId = current.user || '';
    let nextUserId = currentUserId;
    let userIdToDeleteAfterProfileUpdate = '';
    let newlyCreatedUserId = '';

    try {
      if (email === '') {
        if (currentUserId) {
          nextUserId = '';
          userIdToDeleteAfterProfileUpdate = currentUserId;
        }
      } else if (email) {
        if (currentUserId) {
          await pb.collection('users').update<UserAccount>(currentUserId, {
            name: profile.name || current.name,
            email,
            role: role || 'singer',
          });
        } else {
          const password = generateRandomPassword();
          const user = await pb.collection('users').create<UserAccount>({
            email,
            password,
            passwordConfirm: password,
            role: role || 'singer',
            name: profile.name || current.name || email,
          });

          nextUserId = user.id;
          newlyCreatedUserId = user.id;

          // Keep this inside the rollback boundary. If it fails, remove the new auth user.
          await pb.collection('users').requestPasswordReset(email);
        }
      }

      // PocketBase reliably clears single relation fields with null.
      const updatedProfile = await pb.collection('profiles').update<Profile>(id, {
        ...profile,
        user: nextUserId || null,
      });

      // Delete the old login only after the profile successfully drops the relation.
      if (userIdToDeleteAfterProfileUpdate) {
        await pb.collection('users').delete(userIdToDeleteAfterProfileUpdate).catch(() => undefined);
      }

      return updatedProfile;
    } catch (err: unknown) {
      // Clean up newly created auth accounts if password reset or profile update fails.
      if (newlyCreatedUserId) {
        await pb.collection('users').delete(newlyCreatedUserId).catch(() => undefined);
      }

      throw err;
    }
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

  async getCalendarFeedUrls(): Promise<CalendarFeedUrls> {
    const response = await pb.send<{ token: string }>('/api/singer/calendar-feed-url', {
      method: 'GET',
    });

    return buildCalendarFeedUrls(pb.baseUrl || window.location.origin, response.token);
  },

  async getCalendarFeedUrl(): Promise<string> {
    const urls = await this.getCalendarFeedUrls();
    return urls.webcalUrl;
  },

  async resetCalendarFeedUrls(): Promise<CalendarFeedUrls> {
    const response = await pb.send<{ token: string }>('/api/singer/calendar-feed-url/reset', {
      method: 'POST',
    });

    return buildCalendarFeedUrls(pb.baseUrl || window.location.origin, response.token);
  },

  async resetCalendarFeedUrl(): Promise<string> {
    const urls = await this.resetCalendarFeedUrls();
    return urls.webcalUrl;
  },
};

export interface CalendarFeedUrls {
  httpsUrl: string;
  webcalUrl: string;
}

function buildCalendarFeedUrls(baseUrl: string, token: string): CalendarFeedUrls {
  const httpsBaseUrl = baseUrl.replace(/^webcal:/, 'https:');
  const httpsUrl = `${httpsBaseUrl}/api/calendar/feed?token=${encodeURIComponent(token)}`;
  const webcalUrl = httpsUrl.replace(/^https?:/, 'webcal:');

  return { httpsUrl, webcalUrl };
}

function escapeCsvField(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function getProfileEmail(profile: Profile): string {
  return profile.expand?.user?.email || '';
}

function profileToCsvRow(profile: Profile): string {
  const email = getProfileEmail(profile);
  return [
    escapeCsvField(profile.name),
    escapeCsvField(email),
    escapeCsvField(profile.phone),
    escapeCsvField(profile.voicePart),
    escapeCsvField(profile.globalStatus),
  ].join(',');
}

export function exportToCSV(profiles: Profile[]): string {
  const header = ['Name', 'Email', 'Phone', 'Voice Part', 'Status'].join(',');
  const rows = profiles.map(profileToCsvRow);
  const sectionLeaders = profiles.filter((profile) => profile.isSectionLeader === true);

  if (sectionLeaders.length === 0) {
    return [header, ...rows].join('\n');
  }

  return [
    header,
    ...rows,
    '',
    'Section Leaders',
    header,
    ...sectionLeaders.map(profileToCsvRow),
  ].join('\n');
}

export async function updateProfilePhoto(id: string, formData: FormData) {
  return await pb.collection('profiles').update<Profile>(id, formData);
}

export async function deleteProfilePhoto(id: string) {
  return await pb.collection('profiles').update<Profile>(id, { photo: null });
}
