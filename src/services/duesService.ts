import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Profile } from './profileService';

export interface SeasonalDue extends RecordModel {
  profile: string;
  season: string;
  paid: boolean;
  stripeSessionId?: string;
  amountPaidCents?: number;
  feeCents?: number;
  expand?: {
    profile?: Profile;
  };
}

export const duesService = {
  async getDuesForSeason(seasonId: string) {
    if (!seasonId) return [];
    return await pb.collection('seasonalDues').getFullList<SeasonalDue>({
      filter: `season = "${seasonId.replace(/"/g, '\\"')}"`,
    });
  },

  async updateDues(profileId: string, seasonId: string, paid: boolean) {
    try {
      const existing = await pb
        .collection('seasonalDues')
        .getFirstListItem<SeasonalDue>(
          `profile = "${profileId.replace(/"/g, '\\"')}" && season = "${seasonId.replace(/"/g, '\\"')}"`
        );
      return await pb.collection('seasonalDues').update<SeasonalDue>(existing.id, { paid });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
        return await pb.collection('seasonalDues').create<SeasonalDue>({
          profile: profileId,
          season: seasonId,
          paid,
        });
      }
      throw err;
    }
  },

  async createCheckoutSession(
    profileId: string,
    seasonId: string,
    cancelPath: string
  ): Promise<string> {
    const response = await pb.send('/api/checkout/create-dues-session', {
      method: 'POST',
      body: {
        profileId,
        seasonId,
        cancelPath,
      },
    });
    return response.url;
  },
};
