import { parseJsonField } from '../email/hookJson';
import type { PocketBaseApp, PocketBaseRecord } from '../email/emailTypes';

declare const $app: PocketBaseApp & {
  findAuthRecordByEmail(collectionName: string, email: string): PocketBaseRecord;
};
declare const $security: {
  hs256(payload: string, secret: string): string;
  equal(a: string, b: string): boolean;
  randomString(length: number): string;
};

declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

/**
 * Finds or creates a Patron profile for a given email and name.
 */
export function getOrCreatePatronProfile(email: string, name: string): PocketBaseRecord {
  try {
    // Try finding by user email first
    return $app.findFirstRecordByFilter('profiles', 'user.email = {:email}', { email });
  } catch {
    // Try finding by name as a fallback
    try {
      return $app.findFirstRecordByFilter('profiles', 'name = {:name}', { name });
    } catch {
      // No profile found, create a new Patron profile.
      // We create a user account so they can be linked to this email in the future.
      let userId: string;
      try {
        const user = $app.findAuthRecordByEmail('users', email);
        userId = user.id;
      } catch {
        const usersCollection = $app.findCollectionByNameOrId('users');
        const password = $security.randomString(32);
        const newUser = new Record(usersCollection, {
          email: email,
          password: password,
          passwordConfirm: password,
          role: 'singer', // Patrons are singers with no voice part
          name: name || email,
        });
        $app.save(newUser);
        userId = newUser.id;
      }

      const profilesCollection = $app.findCollectionByNameOrId('profiles');
      const newProfile = new Record(profilesCollection, {
        user: userId,
        name: name || email,
        globalStatus: 'Active',
        voicePart: '',
      });
      $app.save(newProfile);
      return newProfile;
    }
  }
}

export function getTimezoneSetting(): string {
  try {
    const tzSetting = $app.findFirstRecordByFilter('appSettings', "key = 'timezone'");
    const valueStr = tzSetting.get('value');
    const tzP = parseJsonField<{ timezone?: string }>(valueStr);
    if (tzP?.timezone) return tzP.timezone;
  } catch {
    // use default
  }
  return 'America/New_York';
}

export function getChoirNameSetting(): string {
  try {
    const choirRecord = $app.findFirstRecordByFilter('appSettings', "key = 'choir_name'");
    const val = parseJsonField<string>(choirRecord.get('value'));
    if (val) return val;
  } catch {
    // use default
  }
  return 'Choir Management Tool';
}

export function getBaseUrl(): string {
  const meta = $app.settings()?.meta;
  const settingsAppUrl = meta?.appUrl || meta?.appURL || meta?.AppURL || '';
  return process.env.APP_URL || settingsAppUrl || 'http://localhost:5173';
}
