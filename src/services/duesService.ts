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
    return await pb.collection('seasonalDues').getFullList<SeasonalDue>({
      filter: pb.filter('season = {:season}', { season }),
    });
  },

  async updateDues(profileId: string, season: string, paid: boolean) {
    try {
      const existing = await pb
        .collection('seasonalDues')
        .getFirstListItem<SeasonalDue>(
          pb.filter('profile = {:profileId} && season = {:season}', { profileId, season })
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
