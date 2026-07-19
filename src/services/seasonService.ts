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

const MAX_BATCH_REQUESTS = 100;

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
    const activeSeasons = await pb
      .collection('seasons')
      .getFullList<Season>({ filter: 'isActive = true' });

    const updates = activeSeasons
      .filter((season) => season.id !== seasonId)
      .map((season) => ({ id: season.id, isActive: false }));
    updates.push({ id: seasonId, isActive: true });

    // PocketBase limits each batch to the configured maximum (100 in this project).
    // Keep the target activation last so every previous active season is disabled first.
    // @allow-sequential-await
    for (let offset = 0; offset < updates.length; offset += MAX_BATCH_REQUESTS) {
      const batch = pb.createBatch();
      for (const update of updates.slice(offset, offset + MAX_BATCH_REQUESTS)) {
        batch.collection('seasons').update(update.id, { isActive: update.isActive });
      }
      await batch.send();
    }
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
