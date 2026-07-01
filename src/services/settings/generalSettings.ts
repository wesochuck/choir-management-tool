import { getSetting, upsertSetting } from './core';

export async function getChoirName(): Promise<string> {
  const setting = await getSetting<string>('choir_name');
  return setting?.value || '';
}

export async function saveChoirName(name: string) {
  return await upsertSetting('choir_name', name, true);
}

export async function getTimezone(): Promise<string> {
  const setting = await getSetting<string>('timezone');
  return setting?.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
}

export async function saveTimezone(timezone: string) {
  return await upsertSetting('timezone', timezone, true);
}

export async function getHomepageUrl(): Promise<string> {
  const setting = await getSetting<string>('homepage_url');
  return setting?.value || '';
}

export async function saveHomepageUrl(url: string) {
  return await upsertSetting('homepage_url', url, true);
}

const DEFAULT_PERFORMER_LABEL = 'Performer';

export async function getPerformerLabel(): Promise<string> {
  const setting = await getSetting<string>('performer_label');
  return setting?.value || DEFAULT_PERFORMER_LABEL;
}

export async function savePerformerLabel(label: string) {
  return await upsertSetting('performer_label', label, true);
}
