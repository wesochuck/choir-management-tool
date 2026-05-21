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
  reminderEnabled: boolean;
  reminderHoursBefore: number;
  reminderSubjectTemplate: string;
  reminderBodyTemplate: string;
  reportEnabled: boolean;
  reportHoursAfter: number;
  reportSubjectTemplate: string;
  reportBodyTemplate: string;
}

export interface AttendanceSettings {
  defaultSort: 'lastName' | 'voicePart';
}

export interface RosterSettings {
  defaultStatus: string;
  defaultSort: 'lastName' | 'voicePart';
  defaultRsvpSort?: 'lastName' | 'voicePart';
  currentSeason?: string;
}

export interface MusicLibrarySettings {
  catalogLookupUrlTemplate: string;
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
  reminderEnabled: false,
  reminderHoursBefore: 24,
  reminderSubjectTemplate: 'Choir Event Reminder: {eventTitle}',
  reminderBodyTemplate: [
    'Hello {singerName},',
    '',
    'This is an automatic reminder for the upcoming choir event:',
    '**{eventTitle}** ({eventType})',
    '',
    '**When:** {eventDate}',
    '**Where:** {eventLocation}',
    '',
    'Details: {eventDetails}',
    '',
    'Please make sure your RSVP is up to date: {rsvpLinks}',
    '',
    'See you there!',
    'Choir Management'
  ].join('\n'),
  reportEnabled: true,
  reportHoursAfter: 12,
  reportSubjectTemplate: 'Attendance Report: {eventTitle} ({eventDate})',
  reportBodyTemplate: [
    '<h2>Attendance Summary</h2>',
    '<p><strong>Event:</strong> {eventTitle}</p>',
    '<p><strong>Date:</strong> {eventDate}</p>',
    '<div style="background-color: #f8faf9; padding: 15px; border-radius: 6px; margin: 20px 0;">',
    '    <p style="margin: 0; font-size: 18px;"><strong>Attendance Rate:</strong> <span style="color: #1b4d3e;">{attendanceRate}%</span></p>',
    '    <p style="margin: 5px 0 0 0; color: #64748b;">{presentCount} present / {totalCount} total participants</p>',
    '</div>',
    '',
    '<h3 style="border-bottom: 2px solid #e9f0eb; padding-bottom: 8px;">Absentees</h3>',
    '<ul style="padding-left: 20px;">',
    '    {absenteesList}',
    '</ul>',
    '',
    '{thresholdWarningsSection}',
  ].join('\n'),
};

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  defaultSort: 'lastName',
};

export const DEFAULT_ROSTER_SETTINGS: RosterSettings = {
  defaultStatus: '',
  defaultSort: 'lastName',
  defaultRsvpSort: 'lastName',
  currentSeason: '',
};

export const DEFAULT_MUSIC_LIBRARY_SETTINGS: MusicLibrarySettings = {
  catalogLookupUrlTemplate: '',
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
    const setting = await pb.collection('appSettings').getFirstListItem<AppSetting<T>>(pb.filter('key = {:key}', { key }));
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

  async getRosterSettings() {
    const setting = await getSetting<RosterSettings>('roster');
    return { ...DEFAULT_ROSTER_SETTINGS, ...setting?.value };
  },

  async saveRosterSettings(value: RosterSettings) {
    return await upsertSetting('roster', value, false);
  },

  async getMusicLibrarySettings() {
    const setting = await getSetting<MusicLibrarySettings>('music_library');
    return { ...DEFAULT_MUSIC_LIBRARY_SETTINGS, ...setting?.value };
  },

  async saveMusicLibrarySettings(value: MusicLibrarySettings) {
    return await upsertSetting('music_library', value, true);
  },

  async getChoirName(): Promise<string> {
    const setting = await getSetting<string>('choir_name');
    return setting?.value || '';
  },

  async saveChoirName(name: string) {
    return await upsertSetting('choir_name', name, true);
  },
};

export interface SectionDef {
  code: string;
  name: string;
}

export interface VoicePartDef {
  label: string;
  fullName: string;
  sectionCode: string;
}

export interface VoicePartSettings {
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
}

export const DEFAULT_SECTIONS: SectionDef[] = [
  { code: 'S', name: 'Sopranos' },
  { code: 'A', name: 'Altos' },
  { code: 'T', name: 'Tenors' },
  { code: 'B', name: 'Basses' },
];

export const DEFAULT_VOICE_PARTS: VoicePartDef[] = [
  { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
  { label: 'S2', fullName: 'Soprano 2', sectionCode: 'S' },
  { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' },
  { label: 'A2', fullName: 'Alto 2', sectionCode: 'A' },
  { label: 'T1', fullName: 'Tenor 1', sectionCode: 'T' },
  { label: 'T2', fullName: 'Tenor 2', sectionCode: 'T' },
  { label: 'B1', fullName: 'Bass 1', sectionCode: 'B' },
  { label: 'B2', fullName: 'Bass 2', sectionCode: 'B' },
];

export async function getVoicePartsAndSections(): Promise<VoicePartSettings> {
  try {
    const setting = await getSetting<VoicePartSettings>('voiceParts');
    if (setting && setting.value) {
      let sections = setting.value.sections || [];
      let voiceParts = setting.value.voiceParts || [];

      // Auto-migrate old format to new format
      if (sections.length === 0 && voiceParts.length > 0) {
        const detectedCodes = new Set<string>();
        voiceParts = voiceParts.map(vp => {
          let code = vp.sectionCode;
          if (!code) {
            const label = vp.label || '';
            if (/^(soprano|s)(\s*\d+)?$/i.test(label)) code = 'S';
            else if (/^(alto|a)(\s*\d+)?$/i.test(label)) code = 'A';
            else if (/^(tenor|t)(\s*\d+)?$/i.test(label)) code = 'T';
            else if (/^(bass|b|baritone|bar)(\s*\d+)?$/i.test(label)) code = 'B';
            else code = 'Other';
          }
          detectedCodes.add(code);
          return { ...vp, sectionCode: code };
        });

        sections = [];
        if (detectedCodes.has('S')) sections.push({ code: 'S', name: 'Sopranos' });
        if (detectedCodes.has('A')) sections.push({ code: 'A', name: 'Altos' });
        if (detectedCodes.has('T')) sections.push({ code: 'T', name: 'Tenors' });
        if (detectedCodes.has('B')) sections.push({ code: 'B', name: 'Basses' });
        if (detectedCodes.has('Other')) sections.push({ code: 'Other', name: 'Other' });
        
        if (sections.length === 0) {
          sections = [...DEFAULT_SECTIONS];
        }
      }

      if (sections.length > 0 && voiceParts.length > 0) {
        return { sections, voiceParts };
      }
    }
    return { sections: DEFAULT_SECTIONS, voiceParts: DEFAULT_VOICE_PARTS };
  } catch {
    return { sections: DEFAULT_SECTIONS, voiceParts: DEFAULT_VOICE_PARTS };
  }
}

export async function saveVoicePartsAndSections(voiceParts: VoicePartDef[], sections: SectionDef[]): Promise<AppSetting<VoicePartSettings>> {
  return await upsertSetting<VoicePartSettings>('voiceParts', { voiceParts, sections }, true);
}

export async function getVoiceParts(): Promise<VoicePartDef[]> {
  const settings = await getVoicePartsAndSections();
  return settings.voiceParts;
}

export async function saveVoiceParts(voiceParts: VoicePartDef[]): Promise<AppSetting<VoicePartSettings>> {
  const current = await getVoicePartsAndSections();
  return await saveVoicePartsAndSections(voiceParts, current.sections);
}




