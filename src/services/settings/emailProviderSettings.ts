import { getSetting, upsertSetting } from './core';

export interface EmailProviderSettings {
  provider: 'smtp' | 'brevo';
  brevoApiKey: string;
}

export const DEFAULT_EMAIL_PROVIDER_SETTINGS: EmailProviderSettings = {
  provider: 'smtp',
  brevoApiKey: '',
};

export async function getEmailProviderSettings(): Promise<EmailProviderSettings> {
  const setting = await getSetting<EmailProviderSettings>('email_provider');
  return setting?.value || DEFAULT_EMAIL_PROVIDER_SETTINGS;
}

export async function saveEmailProviderSettings(settings: EmailProviderSettings) {
  return await upsertSetting('email_provider', settings, true);
}
