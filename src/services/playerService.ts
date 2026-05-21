import { pb } from '../lib/pocketbase';
import type { MusicPiece } from './musicLibraryService';
import type { Event, SetListItem } from './eventService';
import type { VoicePartDef } from './settingsService';

export interface PlayerMediaFile {
  id: string;
  baseId?: string;
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
  /** All music library pieces (parents + movements) for voice part URL resolution. */
  allPieces: MusicPiece[];
}

/** Build PlayerMediaFile entries from a single piece (or its movements if it's a parent). */
function buildFilesFromPiece(
  itemId: string,
  itemTitle: string,
  itemComposer: string | undefined,
  itemDuration: string | undefined,
  piece: MusicPiece,
  allPieces: MusicPiece[]
): PlayerMediaFile[] {
  const mapping = piece.audioTrackMapping || {};
  const hasOwnTracks = Object.keys(mapping).length > 0;

  if (hasOwnTracks) {
    const defaultTrackKey = mapping['tutti'] ? 'tutti' : Object.keys(mapping)[0];
    const filename = mapping[defaultTrackKey];
    if (!filename) return [];
    return [{
      id: `${itemId}_${defaultTrackKey}`,
      baseId: itemId,
      name: itemTitle,
      composer: itemComposer || piece.composer,
      duration: itemDuration || piece.duration,
      pieceId: piece.id,
      trackKey: defaultTrackKey,
      availableTracks: mapping,
      streamUrl: pb.files.getURL(piece, filename),
      isFolder: false,
    }];
  }

  // No own tracks — look for child movements
  const movements = allPieces
    .filter(p => p.parentId === piece.id)
    .sort((a, b) => (a.created || '').localeCompare(b.created || ''));

  const result: PlayerMediaFile[] = [];
  for (const m of movements) {
    const mMapping = m.audioTrackMapping || {};
    const mDefaultKey = mMapping['tutti'] ? 'tutti' : Object.keys(mMapping)[0];
    const mFilename = mMapping[mDefaultKey];
    if (!mFilename) continue;
    result.push({
      id: `${itemId}_${m.id}_${mDefaultKey}`,
      baseId: `${itemId}_${m.id}`,
      name: m.title || `${itemTitle} — Movement`,
      composer: m.composer || piece.composer,
      duration: m.duration,
      pieceId: m.id,
      trackKey: mDefaultKey,
      availableTracks: mMapping,
      streamUrl: pb.files.getURL(m, mFilename),
      isFolder: false,
    });
  }
  return result;
}

export const playerService = {
  async fetchPlaylistByToken(token: string): Promise<PlayerPlaylist> {
    const response = await pb.send('/api/player-playlist', {
      query: { token }
    });

    const { event, setList, voiceParts, pieces } = response as {
      event: { id: string; title: string; date: string };
      setList: SetListItem[];
      voiceParts: VoicePartDef[];
      pieces: MusicPiece[];
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

      const entries = buildFilesFromPiece(
        item.id,
        item.title,
        item.composer,
        item.duration,
        piece,
        pieces // use pieces from the hook instead of fetching allPieces
      );
      files.push(...entries);
    }

    return { event, files, voiceParts, allPieces: pieces };
  },

  async fetchPlaylistByEventId(eventId: string): Promise<PlayerPlaylist> {
    const [event, allPieces, vpRecord] = await Promise.all([
      pb.collection('events').getOne<Event>(eventId),
      pb.collection('musicLibrary').getFullList<MusicPiece>(),
      pb.collection('appSettings').getFirstListItem<{ value: { voiceParts: VoicePartDef[] } }>('key = "voiceParts"').catch(() => null)
    ]);

    const setList = event.setList || [];
    const voiceParts = vpRecord?.value?.voiceParts || [];
    const piecesMap = allPieces.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, MusicPiece>);

    const files: PlayerMediaFile[] = [];

    for (const item of setList) {
      if (item.type === 'intermission') continue;
      const piece = item.pieceId ? piecesMap[item.pieceId] : null;
      if (!piece) continue;

      const entries = buildFilesFromPiece(
        item.id,
        item.title,
        item.composer,
        item.duration,
        piece,
        allPieces
      );
      files.push(...entries);
    }

    return { 
      event: { id: event.id, title: event.title, date: event.date }, 
      files, 
      voiceParts,
      allPieces
    };
  },

  generateToken(eventId: string): Promise<string> {
    return pb.send('/api/generate-player-token', {
      method: 'POST',
      body: { eventId }
    }).then(res => res.token);
  },

  /** 
   * Re-maps existing PlayerMediaFile entries to a new voice part.
   * Handles fallback to tutti and track ID regeneration.
   */
  applyVoicePartToFiles(
    files: PlayerMediaFile[],
    part: string,
    allPieces: MusicPiece[]
  ): PlayerMediaFile[] {
    const piecesMap = allPieces.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, MusicPiece>);

    return files.map(file => {
      if (!file.availableTracks || !file.pieceId) return file;

      // Case-insensitive lookup for requested part
      const matchedKey = Object.keys(file.availableTracks).find(
        k => k.toLowerCase() === part.toLowerCase()
      );

      // Fallback hierarchy:
      // 1. Requested part (case-insensitive)
      // 2. Tutti (case-insensitive)
      // 3. First available track key
      let trackKey = 'tutti';
      if (matchedKey && file.availableTracks[matchedKey]) {
        trackKey = matchedKey;
      } else {
        const tuttiKey = Object.keys(file.availableTracks).find(
          k => k.toLowerCase() === 'tutti'
        );
        if (tuttiKey && file.availableTracks[tuttiKey]) {
          trackKey = tuttiKey;
        } else if (Object.keys(file.availableTracks).length > 0) {
          trackKey = Object.keys(file.availableTracks)[0];
        }
      }

      const actualFilename = file.availableTracks[trackKey];
      if (!actualFilename) return file;

      const piece = piecesMap[file.pieceId];
      if (!piece) return file;

      // Regenerate ID using baseId or split parsing
      const baseId = file.baseId || file.id.split('_').slice(0, -1).join('_') || file.id;
      const newId = `${baseId}_${trackKey}`;

      return {
        ...file,
        id: newId,
        trackKey,
        streamUrl: pb.files.getURL(piece, actualFilename),
        isDownloaded: false,
        offlineUrl: undefined,
        downloadStatus: 'idle' as const
      };
    });
  },

  getStreamUrl(piece: MusicPiece, filename: string): string {
    return pb.files.getURL(piece, filename);
  }
};
