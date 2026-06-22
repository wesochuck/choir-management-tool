import { getSetting, upsertSetting } from './core';

export interface AuditionSettings {
  enabled: boolean;
  slots: string[];
  confirmationMessage: string;
  defaultPerformanceId?: string;
  adminNotifyEnabled?: boolean;
  adminNotifyUsers?: string[];
}

export const DEFAULT_AUDITION_SETTINGS: AuditionSettings = {
  enabled: true,
  slots: [],
  confirmationMessage: 'Thank you. A choir administrator will follow up with details.',
  defaultPerformanceId: '',
  adminNotifyEnabled: false,
  adminNotifyUsers: [],
};

export async function getAuditionSettings(): Promise<AuditionSettings> {
  const setting = await getSetting<AuditionSettings>('auditions');
  const value = setting?.value;
  return {
    ...DEFAULT_AUDITION_SETTINGS,
    ...value,
    slots: value?.slots || DEFAULT_AUDITION_SETTINGS.slots,
  };
}

export async function saveAuditionSettings(value: AuditionSettings) {
  return await upsertSetting('auditions', value, true);
}
