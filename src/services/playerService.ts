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

function normalizeSetListTitle(title: string | undefined): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[♪♫♬♩𝄞]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolvePieceForSetListItem(
  item: SetListItem,
  piecesMap: Record<string, MusicPiece>,
  allPieces: MusicPiece[]
): MusicPiece | null {
  if (item.pieceId) {
    const linkedPiece = piecesMap[item.pieceId];
    if (linkedPiece) return linkedPiece;
  }

  const normalizedTitle = normalizeSetListTitle(item.title);
  if (!normalizedTitle) return null;

  const topLevelMatch = allPieces.find(
    p => !p.parentId && normalizeSetListTitle(p.title) === normalizedTitle
  );
  if (topLevelMatch) return topLevelMatch;

  return allPieces.find(p => normalizeSetListTitle(p.title) === normalizedTitle) || null;
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
  const rawMapping = piece.audioTrackMapping || {};
  const mapping: Record<string, string> = typeof rawMapping === 'string' ? JSON.parse(rawMapping) : rawMapping;
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
    const rawMMapping = m.audioTrackMapping || {};
    const mMapping: Record<string, string> = typeof rawMMapping === 'string' ? JSON.parse(rawMMapping) : rawMMapping;
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

function decodeGoBytes(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    if (val.length > 0 && typeof val[0] === 'number') {
      try {
        return val.map(b => String.fromCharCode(Number(b))).join('');
      } catch {
        return '';
      }
    }
  }
  return '';
}

function parseJsonField<T>(val: unknown): T | null {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) {
    return val as T;
  }
  const str = decodeGoBytes(val);
  if (!str) {
    if (Array.isArray(val)) {
      return val as unknown as T;
    }
    return null;
  }
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

export const playerService = {
  async fetchPlaylistByToken(token: string): Promise<PlayerPlaylist> {
    const response = await pb.send('/api/player-playlist', {
      query: { token }
    });

    const { event, setList: rawSetList, voiceParts: rawVoiceParts, pieces: rawPieces } = response as {
      event: { id: string; title: string; date: string };
      setList: unknown;
      voiceParts: unknown;
      pieces: unknown;
    };

    // Defensively parse/cast setList
    let setList: SetListItem[] = parseJsonField<SetListItem[]>(rawSetList) || [];
    if (!Array.isArray(setList)) {
      setList = [];
    }

    // Defensively parse/cast voiceParts
    let voiceParts: VoicePartDef[] = parseJsonField<VoicePartDef[]>(rawVoiceParts) || [];
    if (!Array.isArray(voiceParts)) {
      voiceParts = [];
    }

    // Defensively parse/cast pieces
    const rawPiecesList = parseJsonField<unknown[]>(rawPieces) || [];
    let pieces: MusicPiece[] = [];
    if (Array.isArray(rawPiecesList)) {
      pieces = rawPiecesList.map(item => {
        const p = item as Record<string, unknown>;
        let mapping: Record<string, string> = {};
        if (p.audioTrackMapping) {
          const parsedMapping = parseJsonField<Record<string, string>>(p.audioTrackMapping);
          if (parsedMapping && typeof parsedMapping === 'object') {
            mapping = parsedMapping;
          }
        }
        return {
          id: String(p.id || ''),
          parentId: typeof p.parentId === 'string' ? p.parentId : undefined,
          title: String(p.title || ''),
          composer: typeof p.composer === 'string' ? p.composer : undefined,
          duration: typeof p.duration === 'string' ? p.duration : undefined,
          created: typeof p.created === 'string' ? p.created : undefined,
          updated: typeof p.updated === 'string' ? p.updated : undefined,
          audioTrackMapping: mapping,
          collectionId: typeof p.collectionId === 'string' ? p.collectionId : undefined,
          collectionName: typeof p.collectionName === 'string' ? p.collectionName : undefined,
        } as MusicPiece;
      });
    }

    const piecesMap = pieces.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, MusicPiece>);

    const files: PlayerMediaFile[] = [];

    for (const item of setList) {
      if (item.type === 'intermission') continue;
      const piece = resolvePieceForSetListItem(item, piecesMap, pieces);
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
      const piece = resolvePieceForSetListItem(item, piecesMap, allPieces);
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
