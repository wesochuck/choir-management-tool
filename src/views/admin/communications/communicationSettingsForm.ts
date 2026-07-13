import type { CommunicationSettings } from '../../../services/settings/communicationSettings';
import type { EmailProviderSettings } from '../../../services/settings/emailProviderSettings';

export interface CommunicationConfig {
  physicalAddress: string;
  baseUrl: string;
  defaultSmsCountryCode: string;
  emailProvider: 'smtp' | 'brevo';
  brevoApiKey: string;
  testEmail: string;
  testPhone: string;
}

export function parseConfigBaseline(
  commSettings: CommunicationSettings,
  emailSettings: EmailProviderSettings,
  testEmail = '',
  testPhone = ''
): CommunicationConfig {
  return {
    physicalAddress: commSettings.mailingAddress || '',
    baseUrl: commSettings.frontendUrl || '',
    defaultSmsCountryCode: commSettings.defaultCountryCode || '1',
    emailProvider: emailSettings.provider || 'smtp',
    brevoApiKey: emailSettings.brevoApiKey || '',
    testEmail,
    testPhone,
  };
}

export function isConfigEqual(a: CommunicationConfig, b: CommunicationConfig): boolean {
  return (
    a.physicalAddress === b.physicalAddress &&
    a.baseUrl === b.baseUrl &&
    a.defaultSmsCountryCode === b.defaultSmsCountryCode &&
    a.emailProvider === b.emailProvider &&
    a.brevoApiKey === b.brevoApiKey &&
    a.testEmail === b.testEmail &&
    a.testPhone === b.testPhone
  );
}
