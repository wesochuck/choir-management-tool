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
      await Promise.all(
        children.map(child =>
          pb.collection('musicLibrary').update(child.id, { parentId: '' })
        )
      );
    }
    return await pb.collection('musicLibrary').delete(id);
  },

  async bulkCreate(pieces: Partial<MusicPieceInput>[]) {
    // For bulk imports, since we might have many records, we'll loop and create.
    // In a real production app with thousands of rows, you'd want to chunk this
    // or use a custom endpoint, but for now we'll rely on Promise.all with some chunking to avoid overloading.
    const chunkSize = 50;
    const results: MusicPiece[] = [];
    
    // @allow-sequential-await - Chunked loop is intentional to limit batch request rate.
    for (let i = 0; i < pieces.length; i += chunkSize) {
      const chunk = pieces.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(piece => pb.collection('musicLibrary').create<MusicPiece>(piece))
      );
      results.push(...chunkResults);
    }
    
    return results;
  },

  async bulkDelete(ids: string[]) {
      const chunkSize = 50;
      // @allow-sequential-await - Chunked loop is intentional to limit batch request rate.
      for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          await Promise.all(chunk.map(id => pb.collection('musicLibrary').delete(id)));
      }
  }
};
