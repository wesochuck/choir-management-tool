import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface MusicPiece extends RecordModel {
  title: string;
  composer?: string;
  copies?: number;
  catalogId?: string;
  duration?: string;
  performances?: string[];
  notes?: string;
  audioFiles?: string[];
  audioTrackMapping?: Record<string, string>;
}

export type MusicPieceInput = Omit<MusicPiece, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>;

export const musicLibraryService = {
  async getLibrary() {
    return await pb.collection('musicLibrary').getFullList<MusicPiece>({
      sort: 'title',
      expand: 'performances',
    });
  },

  async createPiece(data: Partial<MusicPieceInput> | FormData) {
    return await pb.collection('musicLibrary').create<MusicPiece>(data as any);
  },

  async updatePiece(id: string, data: Partial<MusicPieceInput> | FormData) {
    return await pb.collection('musicLibrary').update<MusicPiece>(id, data as any);
  },

  async deletePiece(id: string) {
    return await pb.collection('musicLibrary').delete(id);
  },

  async bulkCreate(pieces: Partial<MusicPieceInput>[]) {
    // For bulk imports, since we might have many records, we'll loop and create.
    // In a real production app with thousands of rows, you'd want to chunk this
    // or use a custom endpoint, but for now we'll rely on Promise.all with some chunking to avoid overloading.
    const chunkSize = 50;
    const results: MusicPiece[] = [];
    
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
      for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          await Promise.all(chunk.map(id => pb.collection('musicLibrary').delete(id)));
      }
  }
};
