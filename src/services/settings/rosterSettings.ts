import { getSetting, upsertSetting } from './core';

export interface RosterSettings {
  defaultStatus: string;
  defaultSort: 'lastName' | 'voicePart';
  defaultRsvpSort?: 'lastName' | 'voicePart';
  currentSeason?: string;
  statusAutomationEnabled?: boolean;
  statusAutomationMissThreshold?: number;
  statusAutomationRecoveryEnabled?: boolean;
  maxRehearsalMisses?: number;
}

const DEFAULT_ROSTER_SETTINGS: RosterSettings = {
  defaultStatus: '',
  defaultSort: 'lastName',
  defaultRsvpSort: 'lastName',
  currentSeason: '',
  statusAutomationEnabled: true,
  statusAutomationMissThreshold: 3,
  statusAutomationRecoveryEnabled: true,
  maxRehearsalMisses: 3,
};

export async function getRosterSettings(): Promise<RosterSettings> {
  const setting = await getSetting<RosterSettings>('roster');
  return { ...DEFAULT_ROSTER_SETTINGS, ...setting?.value };
}

export async function saveRosterSettings(value: RosterSettings) {
  return await upsertSetting('roster', value, false);
}
