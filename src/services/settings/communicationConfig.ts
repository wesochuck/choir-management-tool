import { getSetting, upsertSetting } from './core';

export interface CommunicationConfig {
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
}

export const DEFAULT_COMMUNICATION_CONFIG: CommunicationConfig = {
  smtp: {
    host: '',
    port: 587,
    user: '',
    pass: '',
    from: '',
  },
};

export async function getCommunicationConfig(): Promise<CommunicationConfig> {
  const setting = await getSetting<CommunicationConfig>('communications_config');
  return { ...DEFAULT_COMMUNICATION_CONFIG, ...setting?.value };
}

export async function saveCommunicationConfig(value: CommunicationConfig) {
  return await upsertSetting('communications_config', value, false);
}
