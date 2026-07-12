import { pb } from '../lib/pocketbase';
import type { PublicSetupStatus } from '../../pocketbase/pb_hooks_src/setup/setupTypes';

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
};
