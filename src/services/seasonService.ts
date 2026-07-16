import { pb } from '../lib/pocketbase';

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  duesAmountCents: number;
  isActive: boolean;
  created: string;
  updated: string;
}

export const seasonService = {
  async getActiveSeason(): Promise<Season | null> {
    try {
      const record = await pb
        .collection('seasons')
        .getFirstListItem<Season>('isActive = true', { requestKey: null });
      return record;
    } catch {
      return null;
    }
  },

  async getAllSeasons(): Promise<Season[]> {
    return await pb.collection('seasons').getFullList<Season>({
      sort: '-startDate',
    });
  },

  async toggleActiveSeason(seasonId: string): Promise<void> {
    // PocketBase SDK doesn't have a bulk update, so we fetch all active and disable them
    const activeSeasons = await pb
      .collection('seasons')
      .getFullList<Season>({ filter: 'isActive = true' });

    for (const s of activeSeasons) {
      if (s.id !== seasonId) {
        await pb.collection('seasons').update(s.id, { isActive: false });
      }
    }
    await pb.collection('seasons').update(seasonId, { isActive: true });
  },

  async createSeason(data: Partial<Season>): Promise<Season> {
    return await pb.collection('seasons').create<Season>(data);
  },

  async updateSeason(id: string, data: Partial<Season>): Promise<Season> {
    return await pb.collection('seasons').update<Season>(id, data);
  },

  async deleteSeason(id: string): Promise<void> {
    await pb.collection('seasons').delete(id);
  },
};
