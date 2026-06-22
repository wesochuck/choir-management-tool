import { getSetting, upsertSetting } from './core';

export interface PollSettings {
  defaultAutoArchiveDays: number;
}

const DEFAULT_POLL_SETTINGS: PollSettings = {
  defaultAutoArchiveDays: 3,
};

export { DEFAULT_POLL_SETTINGS };

export async function getPollSettings(): Promise<PollSettings> {
  const setting = await getSetting<PollSettings>('poll_settings');
  return { ...DEFAULT_POLL_SETTINGS, ...setting?.value };
}

export async function savePollSettings(value: PollSettings) {
  return await upsertSetting('poll_settings', value, false);
}
