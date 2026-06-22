import type { PublicFontChoice } from '../../lib/publicFonts';
import { getSetting, upsertSetting } from './core';

export interface LandingPageSettings {
  heroHeadline: string;
  heroSubtitle: string;
  aboutUsText: string;
  historyText: string;
  contactEmail: string;
  showBrandingHeaderFooter?: boolean;
  headerFont?: PublicFontChoice;
  bodyFont?: PublicFontChoice;
}

export const DEFAULT_LANDING_SETTINGS: LandingPageSettings = {
  heroHeadline: 'Welcome to Our Choir',
  heroSubtitle: 'Voices united in harmony.',
  aboutUsText: '',
  historyText: '',
  contactEmail: '',
  showBrandingHeaderFooter: false,
  headerFont: 'system',
  bodyFont: 'system',
};

export async function getLandingSettings(): Promise<LandingPageSettings> {
  const stored = await getSetting<LandingPageSettings>('landingSettings');
  return { ...DEFAULT_LANDING_SETTINGS, ...stored?.value };
}

export async function saveLandingSettings(value: LandingPageSettings): Promise<void> {
  await upsertSetting('landingSettings', value, true);
}
