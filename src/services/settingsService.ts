import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
export { renderCommunicationTemplate } from '../lib/messageTemplates';

export interface AppSetting<T> extends RecordModel {
  key: string;
  value: T;
  isPublic: boolean;
}

export interface AuditionSettings {
  enabled: boolean;
  slots: string[];
  confirmationMessage: string;
  defaultPerformanceId?: string;
}

export interface CommunicationSettings {
  emailSubject: string;
  emailBody: string;
  smsBody: string;
}

export interface AttendanceSettings {
  defaultSort: 'lastName' | 'voicePart';
}

export interface CommunicationConfig {
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  twilio: {
    sid: string;
    token: string;
    from: string;
    enabled: boolean;
  };
}

export const DEFAULT_AUDITION_SETTINGS: AuditionSettings = {
  enabled: true,
  slots: [
    'Saturday, May 23, 10:00 AM',
    'Saturday, May 23, 11:00 AM',
    'Saturday, May 30, 10:00 AM',
    'Saturday, May 30, 11:00 AM',
  ],
  confirmationMessage: 'Thank you. A choir administrator will follow up with details.',
  defaultPerformanceId: '',
};

export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettings = {
  emailSubject: 'Choir reminder: {eventTitle}',
  emailBody: [
    'Reminder for {eventTitle}',
    '',
    'When: {eventDate}',
    'Where: {eventLocation}',
    '',
    '{eventDetails}',
  ].join('\n'),
  smsBody: 'Choir reminder: {eventTitle} on {eventDate} at {eventLocation}.',
};

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  defaultSort: 'lastName',
};

export const DEFAULT_COMMUNICATION_CONFIG: CommunicationConfig = {
  smtp: {
    host: '',
    port: 587,
    user: '',
    pass: '',
    from: '',
  },
  twilio: {
    sid: '',
    token: '',
    from: '',
    enabled: false,
  },
};

const getSetting = async <T>(key: string) => {
  try {
    const setting = await pb.collection('appSettings').getFirstListItem<AppSetting<T>>(`key = "${key}"`);
    return setting;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) return null;
    throw err;
  }
};

const upsertSetting = async <T>(key: string, value: T, isPublic: boolean) => {
  const existing = await getSetting<T>(key);
  const payload = { key, value, isPublic };

  if (existing) {
    return await pb.collection('appSettings').update<AppSetting<T>>(existing.id, payload);
  }

  return await pb.collection('appSettings').create<AppSetting<T>>(payload);
};

export const settingsService = {
  async getAuditionSettings() {
    const setting = await getSetting<AuditionSettings>('auditions');
    const value = setting?.value;
    return {
      ...DEFAULT_AUDITION_SETTINGS,
      ...value,
      slots: value?.slots || DEFAULT_AUDITION_SETTINGS.slots,
    };
  },

  async saveAuditionSettings(value: AuditionSettings) {
    return await upsertSetting('auditions', value, true);
  },

  async getCommunicationSettings() {
    const setting = await getSetting<CommunicationSettings>('communications');
    return { ...DEFAULT_COMMUNICATION_SETTINGS, ...setting?.value };
  },

  async saveCommunicationSettings(value: CommunicationSettings) {
    return await upsertSetting('communications', value, false);
  },

  async getCommunicationConfig() {
    const setting = await getSetting<CommunicationConfig>('communications_config');
    return { ...DEFAULT_COMMUNICATION_CONFIG, ...setting?.value };
  },

  async saveCommunicationConfig(value: CommunicationConfig) {
    return await upsertSetting('communications_config', value, false);
  },

  async getAttendanceSettings() {
    const setting = await getSetting<AttendanceSettings>('attendance');
    return { ...DEFAULT_ATTENDANCE_SETTINGS, ...setting?.value };
  },

  async saveAttendanceSettings(value: AttendanceSettings) {
    return await upsertSetting('attendance', value, false);
  },
};

export interface VoicePartDef {
  label: string;
  fullName: string;
}

export async function getVoiceParts(): Promise<VoicePartDef[]> {
  try {
    const settings = await pb.collection('app_settings').getFirstListItem('');
    return settings.voiceParts || [];
  } catch (error) {
    return [];
  }
}

