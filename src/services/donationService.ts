import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { AppSetting } from './settingsService';

export interface DonationLevel {
  id: string;
  label: string;
  amount: number;
  benefit?: string;
}

export interface DonationRecord extends RecordModel {
  amountPaidCents: number;
  donorName: string;
  donorEmail: string;
  profile?: string;
  tributeType: 'none' | 'memory' | 'honor';
  tributeName?: string;
  isAnonymous: boolean;
  status: 'paid' | 'pending' | 'refunded' | 'expired';
  stripeSessionId: string;
  stripePaymentIntentId: string;
  expiredAt?: string;
  created: string;
  expand?: {
    profile?: import('./profileService').Profile;
  };
}

export interface DonationSettings {
  buttonText: string;
  description: string;
  levels: DonationLevel[];
}

export const DEFAULT_DONATION_SETTINGS: DonationSettings = {
  buttonText: 'Support our Music',
  description:
    'Your contribution helps us keep the music playing and supports our mission in the community.',
  levels: [
    { id: 'level-1', label: 'Friend', amount: 25, benefit: 'Mention in program' },
    { id: 'level-2', label: 'Supporter', amount: 50, benefit: 'Mention in program' },
    { id: 'level-3', label: 'Patron', amount: 100, benefit: 'Priority seating' },
    { id: 'level-4', label: 'Benefactor', amount: 250, benefit: 'Invitation to VIP reception' },
  ],
};

export const donationService = {
  async getDonationSettings(): Promise<DonationSettings> {
    try {
      const setting = await pb
        .collection('appSettings')
        .getFirstListItem<
          AppSetting<DonationSettings>
        >(pb.filter('key = {:key}', { key: 'donation_settings' }));
      return { ...DEFAULT_DONATION_SETTINGS, ...setting.value };
    } catch (err: unknown) {
      // 404 means it's not set yet, return default
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
        return DEFAULT_DONATION_SETTINGS;
      }
      throw err;
    }
  },

  async saveDonationSettings(value: DonationSettings): Promise<AppSetting<DonationSettings>> {
    const key = 'donation_settings';
    let existing: AppSetting<DonationSettings> | null = null;

    try {
      existing = await pb
        .collection('appSettings')
        .getFirstListItem<AppSetting<DonationSettings>>(pb.filter('key = {:key}', { key }));
    } catch (err: unknown) {
      if (!(err && typeof err === 'object' && 'status' in err && err.status === 404)) {
        throw err;
      }
    }

    const payload = {
      key,
      value,
      isPublic: true,
    };

    if (existing) {
      return await pb
        .collection('appSettings')
        .update<AppSetting<DonationSettings>>(existing.id, payload);
    }

    return await pb.collection('appSettings').create<AppSetting<DonationSettings>>(payload);
  },

  async createDonationSession(data: {
    amountCents: number;
    email: string;
    name: string;
    tributeType: string;
    tributeName: string;
    isAnonymous: boolean;
  }): Promise<{ url: string; sessionId: string }> {
    return await pb.send<{ url: string; sessionId: string }>(
      '/api/checkout/create-donation-session',
      {
        method: 'POST',
        body: data,
      }
    );
  },

  async getDonations(filter?: string): Promise<DonationRecord[]> {
    return await pb.collection('donations').getFullList<DonationRecord>({
      filter: filter || '',
      sort: '-created',
    });
  },

  async adminRefundDonation(donationId: string): Promise<{ success: boolean }> {
    return await pb.send<{ success: boolean }>('/api/admin/refund-donation', {
      method: 'POST',
      body: { donationId },
    });
  },

  async pollForDonationRecord(
    sessionId: string,
    retries = 5,
    delay = 1000
  ): Promise<DonationRecord | null> {
    // @allow-sequential-await - Sequential polling checks for Stripe fulfillment status.
    for (let i = 0; i < retries; i++) {
      try {
        const record = await pb
          .collection('donations')
          .getFirstListItem<DonationRecord>(
            pb.filter('stripeSessionId = {:sessionId}', { sessionId })
          );
        if (record) return record;
      } catch {
        // ignore and retry
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return null;
  },
};
