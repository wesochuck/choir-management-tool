import { getSetting, upsertSetting } from './core';

export interface MusicGenreDef {
  id: string;
  label: string;
}

export interface MusicLibrarySettings {
  catalogLookupUrlTemplate: string;
  genres: MusicGenreDef[];
}

const DEFAULT_MUSIC_LIBRARY_SETTINGS: MusicLibrarySettings = {
  catalogLookupUrlTemplate: '',
  genres: [
    { id: 'christmas', label: 'Christmas' },
    { id: 'patriotic', label: 'Patriotic' },
  ],
};

export { DEFAULT_MUSIC_LIBRARY_SETTINGS };

export async function getMusicLibrarySettings(): Promise<MusicLibrarySettings> {
  const setting = await getSetting<MusicLibrarySettings>('music_library');
  const value = setting?.value;
  return {
    ...DEFAULT_MUSIC_LIBRARY_SETTINGS,
    ...value,
    genres: value?.genres || DEFAULT_MUSIC_LIBRARY_SETTINGS.genres,
  };
}

export async function saveMusicLibrarySettings(value: MusicLibrarySettings) {
  return await upsertSetting('music_library', value, true);
}
