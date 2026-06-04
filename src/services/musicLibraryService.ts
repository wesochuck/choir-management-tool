import { pb } from '../lib/pocketbase';
import type { MusicPiece, MusicPieceInput } from '../types/musicLibrary';


export type { MusicPiece, MusicPieceInput } from '../types/musicLibrary';

type PocketBaseRecordBody = Record<string, unknown> | FormData;

const toRecordBody = (data: Partial<MusicPieceInput> | FormData): PocketBaseRecordBody => {
  return data instanceof FormData ? data : data as Record<string, unknown>;
};

export const musicLibraryService = {
  async getLibrary() {
    return await pb.collection('musicLibrary').getFullList<MusicPiece>({
      sort: 'title',
      expand: 'performances',
    });
  },

  async createPiece(data: Partial<MusicPieceInput> | FormData) {
    return await pb.collection('musicLibrary').create<MusicPiece>(toRecordBody(data));
  },

  async updatePiece(id: string, data: Partial<MusicPieceInput> | FormData) {
    return await pb.collection('musicLibrary').update<MusicPiece>(id, toRecordBody(data));
  },

  async deletePiece(id: string, options?: { unlinkChildren?: boolean }) {
    if (options?.unlinkChildren) {
      const children = await pb.collection('musicLibrary').getFullList<MusicPiece>({
        filter: pb.filter('parentId = {:id}', { id })
      });
      if (children.length > 0) {
        const batch = pb.createBatch();
        for (const child of children) {
          batch.collection('musicLibrary').update(child.id, { parentId: '' });
        }
        batch.collection('musicLibrary').delete(id);
        await batch.send();
        return true;
      }
    }
    return await pb.collection('musicLibrary').delete(id);
  },

  async bulkCreate(pieces: Partial<MusicPieceInput>[]) {
    // For bulk imports, we chunk operations to manage connection locking on SQLite.
    // Using PocketBase Batch API ensures each chunk is created within a single atomic transaction.
    const chunkSize = 50;
    const results: MusicPiece[] = [];
    
    // @allow-sequential-await - Chunked loop is intentional to limit batch request rate.
    for (let i = 0; i < pieces.length; i += chunkSize) {
      const chunk = pieces.slice(i, i + chunkSize);
      const batch = pb.createBatch();
      for (const piece of chunk) {
        batch.collection('musicLibrary').create(piece);
      }
      const batchResults = await batch.send();
      results.push(...batchResults.map(res => res.body as MusicPiece));
    }
    
    return results;
  },

  async bulkDelete(ids: string[]) {
    const chunkSize = 50;
    // @allow-sequential-await - Chunked loop is intentional to limit batch request rate.
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = pb.createBatch();
      for (const id of chunk) {
        batch.collection('musicLibrary').delete(id);
      }
      await batch.send();
    }
  }
};
