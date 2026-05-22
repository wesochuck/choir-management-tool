import type { RecordModel } from 'pocketbase';
import type { Event } from '../services/eventService';

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
  voicing?: string;
  sectionBuckets?: string[];
  genres?: string[];
  parentId?: string;
  expand?: {
    performances?: Event[];
    parentId?: MusicPiece;
  };
}

export type MusicPieceInput = Omit<MusicPiece, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>;
