import type { RecordModel } from 'pocketbase';

export interface MusicPiece extends RecordModel {
  title: string;
  composer?: string;
  arranger?: string;
  purchaseDate?: string;
  copies?: number;
  catalogId?: string;
  duration?: string;
  notes?: string;
  audioFiles?: string[];
  audioTrackMapping?: Record<string, string>;
  voicing?: string;
  sectionBuckets?: string[];
  genres?: string[];
  parentId?: string;
  expand?: {
    parentId?: MusicPiece;
  };
}

export type MusicPieceInput = Omit<
  MusicPiece,
  'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'
>;
