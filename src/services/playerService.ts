import { pb } from '../lib/pocketbase';
import type { MusicPiece } from './musicLibraryService';
import type { Event, SetListItem } from './eventService';
import type { VoicePartDef } from './settingsService';

export interface PlayerMediaFile {
  id: string;
  name: string;
  streamUrl: string;
  composer?: string;
  duration?: string;
  pieceId?: string;
  trackKey?: string;
  availableTracks?: Record<string, string>; // label -> filename
  isFolder: boolean;
  offlineUrl?: string;
  isDownloaded?: boolean;
  downloadStatus?: 'idle' | 'downloading' | 'downloaded' | 'error';
}

export interface PlayerPlaylist {
  event: {
    id: string;
    title: string;
    date: string;
  };
  files: PlayerMediaFile[];
  voiceParts: VoicePartDef[];
}

export const playerService = {
  async fetchPlaylistByToken(token: string): Promise<PlayerPlaylist> {
    const response = await pb.send('/api/player-playlist', {
      query: { token }
    });

    const { event, setList, pieces, voiceParts } = response as {
      event: { id: string; title: string; date: string };
      setList: SetListItem[];
      pieces: MusicPiece[];
      voiceParts: VoicePartDef[];
    };

    const piecesMap = pieces.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, MusicPiece>);

    const files: PlayerMediaFile[] = [];

    for (const item of setList) {
      if (item.type === 'intermission') continue;
      
      const piece = item.pieceId ? piecesMap[item.pieceId] : null;
      if (!piece) continue;

      // Map the piece to one or more files (if it has movements, we'd handle that here, 
      // but for now let's assume the set list items are the primary unit)
      
      // We store the mapping so the UI can switch tracks
      const mapping = piece.audioTrackMapping || {};
      
      // Use "tutti" or the first available track as default
      const defaultTrackKey = mapping['tutti'] ? 'tutti' : Object.keys(mapping)[0];
      const filename = mapping[defaultTrackKey];

      if (filename) {
        files.push({
          id: `${item.id}_${defaultTrackKey}`,
          name: item.title,
          composer: item.composer || piece.composer,
          duration: item.duration || piece.duration,
          pieceId: piece.id,
          trackKey: defaultTrackKey,
          availableTracks: mapping,
          streamUrl: pb.files.getURL(piece, filename),
          isFolder: false
        });
      }
    }

    return { event, files, voiceParts };
  },

  async generateToken(eventId: string): Promise<string> {
    const response = await pb.send('/api/generate-player-token', {
      method: 'POST',
      body: { eventId }
    });
    return response.token;
  },

  getStreamUrl(piece: MusicPiece, filename: string): string {
    return pb.files.getURL(piece, filename);
  }
};
