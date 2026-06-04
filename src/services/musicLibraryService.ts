import { pb } from '../lib/pocketbase';
import type { MusicPiece, MusicPieceInput } from '../types/musicLibrary';


export type { MusicPiece, MusicPieceInput } from '../types/musicLibrary';

type PocketBaseRecordBody = Record<string, unknown> | FormData;

const toRecordBody = (data: Partial<MusicPieceInput> | FormData): PocketBaseRecordBody => {
  return data instanceof FormData ? data : data as Record<string, unknown>;
};

const BATCH_CHUNK_SIZE = 50;

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

  async bulkUpdate(updates: { id: string; data: Partial<MusicPieceInput> }[]) {
    const results: MusicPiece[] = [];

    // @allow-sequential-await - Chunked batch sends avoid oversized Batch API payloads.
    for (let i = 0; i < updates.length; i += BATCH_CHUNK_SIZE) {
      const chunk = updates.slice(i, i + BATCH_CHUNK_SIZE);
      const batch = pb.createBatch();
      for (const update of chunk) {
        batch.collection('musicLibrary').update(update.id, update.data);
      }
      const batchResults = await batch.send();
      results.push(...batchResults.map((result) => result.body as MusicPiece));
    }

    return results;
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
    const results: MusicPiece[] = [];
    
    // @allow-sequential-await - Chunked loop is intentional to limit batch request rate.
    for (let i = 0; i < pieces.length; i += BATCH_CHUNK_SIZE) {
      const chunk = pieces.slice(i, i + BATCH_CHUNK_SIZE);
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
    // @allow-sequential-await - Chunked loop is intentional to limit batch request rate.
    for (let i = 0; i < ids.length; i += BATCH_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + BATCH_CHUNK_SIZE);
      const batch = pb.createBatch();
      for (const id of chunk) {
        batch.collection('musicLibrary').delete(id);
      }
      await batch.send();
    }
  }
};
