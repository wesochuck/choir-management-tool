import { getSetting, upsertSetting } from './core';

export interface StripeFeeSettings {
  percentage: number;
  fixedCents: number;
}

export const DEFAULT_STRIPE_FEE_SETTINGS: StripeFeeSettings = {
  percentage: 2.9,
  fixedCents: 30,
};

export async function getStripeFeeSettings(): Promise<StripeFeeSettings> {
  const result = await getSetting<StripeFeeSettings>('stripe_fees');
  return result ? result.value : DEFAULT_STRIPE_FEE_SETTINGS;
}

export async function saveStripeFeeSettings(settings: StripeFeeSettings): Promise<void> {
  await upsertSetting('stripe_fees', settings, true);
}
