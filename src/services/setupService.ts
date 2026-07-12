import { pb } from '../lib/pocketbase';
import type { PublicSetupStatus } from '../../pocketbase/pb_hooks_src/setup/setupTypes';
import { settingsService } from './settingsService';
import { getModuleState } from './moduleService';
import type { ModuleId } from '../lib/modules';
import type { ReadinessSnapshot } from '../lib/readiness';

export interface SetupClaimPayload {
  email: string;
  password?: string;
  passwordConfirm?: string;
  name: string;
  isPerformer: boolean;
}

export interface SetupRecoveryPayload {
  email: string;
  password?: string;
  passwordConfirm?: string;
  name: string;
}

export interface SetupHealthResult {
  environment: {
    appUrl: boolean;
    hmacSecret: boolean;
    maintenanceSecret: boolean;
    stripeSecretKey: boolean;
    stripeWebhookSecret: boolean;
  };
  stripeMode: string;
}

export const setupService = {
  async getStatus(): Promise<PublicSetupStatus> {
    return pb.send<PublicSetupStatus>('/api/setup/status', { method: 'GET' });
  },

  async claim(payload: SetupClaimPayload): Promise<{ success: boolean }> {
    return pb.send<{ success: boolean }>('/api/setup/claim', {
      method: 'POST',
      body: payload,
    });
  },

  async saveProgress(
    completedSections: string[],
    ownerIsPerformer?: boolean,
    ownerVoicePartSet?: boolean
  ): Promise<{ success: boolean }> {
    return pb.send<{ success: boolean }>('/api/setup/progress', {
      method: 'POST',
      body: { completedSections, ownerIsPerformer, ownerVoicePartSet },
    });
  },

  async complete(): Promise<{ success: boolean }> {
    return pb.send<{ success: boolean }>('/api/setup/complete', {
      method: 'POST',
    });
  },

  async recoverAdmin(payload: SetupRecoveryPayload): Promise<{ success: boolean }> {
    return pb.send<{ success: boolean }>('/api/setup/recover-admin', {
      method: 'POST',
      body: payload,
    });
  },

  async getHealth(): Promise<SetupHealthResult> {
    return pb.send<SetupHealthResult>('/api/setup/health', { method: 'GET' });
  },

  async getReadinessSnapshot(): Promise<ReadinessSnapshot> {
    const [
      choirName,
      seating,
      modules,
      health,
      commsConfig,
      landingSettings,
      auditionSettings,
      profilesList,
    ] = await Promise.all([
      settingsService.getChoirName().catch(() => ''),
      settingsService.getVoicePartsAndSections().catch(() => ({ voiceParts: [], sections: [] })),
      getModuleState().catch(() => ({ enabled: [] })),
      setupService.getHealth().catch(() => ({
        environment: {
          appUrl: false,
          hmacSecret: false,
          maintenanceSecret: false,
          stripeSecretKey: false,
          stripeWebhookSecret: false,
        },
        stripeMode: '',
      })),
      settingsService.getCommunicationConfig().catch(() => ({
        smtp: { host: '', port: 587, user: '', pass: '', from: '' },
      })),
      settingsService.getLandingSettings().catch(() => null),
      settingsService.getAuditionSettings().catch(() => null),
      pb
        .collection('profiles')
        .getList(1, 1)
        .catch(() => ({ totalItems: 0 })),
    ]);

    const enabledModules = new Set<ModuleId>((modules?.enabled || []) as ModuleId[]);
    const hasVoiceParts = seating.voiceParts.length > 0;
    const hasSections = seating.sections.length > 0;

    const emailVerified = !!(
      commsConfig.smtp.host &&
      commsConfig.smtp.user &&
      commsConfig.smtp.pass &&
      commsConfig.smtp.from
    );

    const stripeConfigured = !!health.environment.stripeSecretKey;
    const websiteConfigured = !!(landingSettings && landingSettings.heroHeadline);
    const auditionsConfigured = !!(
      auditionSettings &&
      auditionSettings.slots &&
      auditionSettings.slots.length > 0
    );
    const hasSingers = profilesList.totalItems > 0;

    return {
      hasAdmin: true,
      choirName,
      hasVoiceParts,
      hasSections,
      modulesSelected: enabledModules.size > 0,
      enabledModules,
      emailVerified,
      stripeConfigured,
      websiteConfigured,
      auditionsConfigured,
      hasSingers,
    };
  },
};
