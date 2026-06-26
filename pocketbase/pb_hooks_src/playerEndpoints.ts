import { parseJsonField } from './email/hookJson';
import {
  getHmacSecret,
  generateSignedPlayerToken,
  getPlayerPayload,
  parseSignedToken,
} from './hmacTokens';
import type { PocketBaseApp, PocketBaseRequestEvent } from './email/emailTypes';

declare const $app: PocketBaseApp;
declare const $security: {
  hs256(payload: string, secret: string): string;
  equal(a: string, b: string): boolean;
};

interface MusicLibraryPayload {
  id: string;
  parentId: unknown;
  title: unknown;
  composer: unknown;
  arranger: unknown;
  duration: unknown;
  created: unknown;
  updated: unknown;
  audioTrackMapping: unknown;
  collectionId: string;
  collectionName: string;
}

interface VoicePartsSetting {
  voiceParts?: unknown[];
}

/**
 * Endpoint: POST /api/generate-player-token
 * Admins only.
 */
export function handleGeneratePlayerToken(e: PocketBaseRequestEvent): void {
  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden: Admins only' });
  }

  const data = e.requestInfo().body;
  const eventId = data.eventId;

  if (!eventId) {
    return e.json(400, { error: 'Missing eventId' });
  }

  const secret = getHmacSecret();
  if (!secret) {
    return e.json(500, { error: 'HMAC_SECRET not configured' });
  }

  const token = generateSignedPlayerToken(eventId as string);

  return e.json(200, { token });
}

/**
 * Endpoint: GET /api/singer/player-playlist
 * Authenticated singer-safe event playlist.
 */
export function handleSingerPlayerPlaylist(e: PocketBaseRequestEvent): void {
  const authRecord = e.auth;
  if (!authRecord) {
    return e.json(401, { error: 'Authentication required' });
  }

  const eventId = e.requestInfo().query.eventId as string;
  if (!eventId) {
    return e.json(400, { error: 'Missing eventId' });
  }

  try {
    const event = $app.findRecordById('events', eventId);

    // Check set list approval
    const setListApproved = event.get('setListApproved');
    if (setListApproved === false) {
      return e.json(403, { error: 'not_published: Practice tracks are not available yet.' });
    }

    const rawSetList = event.get('setList');
    const setList = parseJsonField(rawSetList);
    if (!Array.isArray(setList) || setList.length === 0) {
      return e.json(403, { error: 'empty_set_list: No practice tracks have been posted.' });
    }

    // Fetch pieces for the set list
    let pieces: MusicLibraryPayload[] = [];
    try {
      const allPieces = $app.findRecordsByFilter('musicLibrary', "id != ''", 'created', 1000);
      pieces = allPieces.map((p) => {
        const rawMapping = p.get('audioTrackMapping');
        let mapping = parseJsonField(rawMapping);
        if (!mapping || typeof mapping !== 'object') {
          mapping = {};
        }
        return {
          id: p.id,
          parentId: p.get('parentId'),
          title: p.get('title'),
          composer: p.get('composer'),
          arranger: p.get('arranger'),
          duration: p.get('duration'),
          created: p.get('created'),
          updated: p.get('updated'),
          audioTrackMapping: mapping,
          collectionId: 'pbc_music_library_001',
          collectionName: 'musicLibrary',
        };
      });
    } catch {
      // Fallback to empty
    }

    // Include voice parts configuration
    let voiceParts: unknown[] = [];
    try {
      const vpRecord = $app.findFirstRecordByFilter('appSettings', "key = 'voiceParts'");
      const rawVal = vpRecord.get('value');
      const parsedVal = parseJsonField<VoicePartsSetting>(rawVal);
      if (parsedVal && parsedVal.voiceParts) {
        voiceParts = parsedVal.voiceParts;
      }
    } catch {
      // Fallback
    }

    return e.json(200, {
      event: {
        id: event.id,
        title: event.get('title'),
        date: event.get('date'),
      },
      setList: setList,
      pieces: pieces,
      voiceParts: voiceParts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log('Error in /api/singer/player-playlist: ' + message);
    return e.json(404, { error: 'Event not found', details: message });
  }
}

/**
 * Endpoint: GET /api/player-playlist
 * Public with signed token.
 */
export function handlePlayerPlaylist(e: PocketBaseRequestEvent): void {
  let token = e.requestInfo().query.token as string;
  const sParam = e.requestInfo().query.s as string;
  if (token && sParam && !token.includes('s=')) {
    token = `${token}&s=${sParam}`;
  }

  if (!token) {
    return e.json(400, { error: 'Missing token' });
  }

  const parts = parseSignedToken(token, ['e', 's']);

  if (!parts) {
    return e.json(400, { error: 'Invalid token format' });
  }

  const secret = getHmacSecret();
  if (!secret) {
    return e.json(500, { error: 'HMAC_SECRET not configured' });
  }

  const payload = getPlayerPayload(parts.e);
  const expectedSignature = $security.hs256(payload, secret);

  if (!$security.equal(parts.s, expectedSignature)) {
    return e.json(401, { error: 'Invalid signature' });
  }

  try {
    const event = $app.findRecordById('events', parts.e);
    const rawSetList = event.get('setList');
    let setList = parseJsonField(rawSetList);
    if (!Array.isArray(setList)) {
      setList = [];
    }

    // Fetch all pieces from the music library to allow title-based fallback matching on the client side
    let pieces: MusicLibraryPayload[] = [];
    try {
      const allPieces = $app.findRecordsByFilter('musicLibrary', "id != ''", 'created', 1000);
      pieces = allPieces.map((p) => {
        const rawMapping = p.get('audioTrackMapping');
        let mapping = parseJsonField(rawMapping);
        if (!mapping || typeof mapping !== 'object') {
          mapping = {};
        }
        return {
          id: p.id,
          parentId: p.get('parentId'),
          title: p.get('title'),
          composer: p.get('composer'),
          arranger: p.get('arranger'),
          duration: p.get('duration'),
          created: p.get('created'),
          updated: p.get('updated'),
          audioTrackMapping: mapping,
          collectionId: 'pbc_music_library_001',
          collectionName: 'musicLibrary',
        };
      });
    } catch {
      // Fallback to empty list if querying fails
    }

    // Include voice parts configuration for the selector
    let voiceParts: unknown[] = [];
    try {
      const vpRecord = $app.findFirstRecordByFilter('appSettings', "key = 'voiceParts'");
      const rawVal = vpRecord.get('value');
      const parsedVal = parseJsonField<VoicePartsSetting>(rawVal);
      if (parsedVal && parsedVal.voiceParts) {
        voiceParts = parsedVal.voiceParts;
      }
    } catch {
      // Fallback to empty if not found
    }

    return e.json(200, {
      event: {
        id: event.id,
        title: event.get('title'),
        date: event.get('date'),
      },
      setList: setList,
      pieces: pieces,
      voiceParts: voiceParts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack ? '\n' + err.stack : '';
    console.log('Error in /api/player-playlist: ' + message + stack);
    return e.json(404, {
      error: 'Event or related pieces not found',
      details: message,
    });
  }
}
