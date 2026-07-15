import { getSetting, upsertSetting } from './core';

export interface DirectorySettings {
  enabled: boolean;
}

const DIRECTORY_SETTINGS_KEY = 'directorySettings';

const DEFAULT_DIRECTORY_SETTINGS: DirectorySettings = {
  enabled: true,
};

export async function getDirectorySettings(): Promise<DirectorySettings> {
  const setting = await getSetting<DirectorySettings>(DIRECTORY_SETTINGS_KEY);
  return { ...DEFAULT_DIRECTORY_SETTINGS, ...setting?.value };
}

export async function saveDirectorySettings(value: DirectorySettings) {
  return await upsertSetting(DIRECTORY_SETTINGS_KEY, { enabled: value.enabled }, true);
}
