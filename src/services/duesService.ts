import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Profile } from './profileService';

export interface SeasonalDue extends RecordModel {
  profile: string;
  season: string;
  paid: boolean;
  expand?: {
    profile?: Profile;
  };
}

export const duesService = {
  async getDuesForSeason(season: string) {
    if (!season) return [];
    const safeSeason = season.replace(/"/g, '\\"');
    return await pb.collection('seasonalDues').getFullList<SeasonalDue>({
      filter: `season = "${safeSeason}"`,
    });
  },

  async updateDues(profileId: string, season: string, paid: boolean) {
    try {
      const safeSeason = season.replace(/"/g, '\\"');
      const existing = await pb
        .collection('seasonalDues')
        .getFirstListItem<SeasonalDue>(
          pb.filter('profile = {:profileId}', { profileId }) + ` && season = "${safeSeason}"`
        );
      return await pb.collection('seasonalDues').update<SeasonalDue>(existing.id, { paid });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
        return await pb.collection('seasonalDues').create<SeasonalDue>({
          profile: profileId,
          season,
          paid,
        });
      }
      throw err;
    }
  },
};
