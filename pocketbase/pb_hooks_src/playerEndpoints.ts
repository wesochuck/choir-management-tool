import { parseJsonField, decodeGoBytes } from './email/hookJson';
import { getHmacSecret, generateSignedPlayerToken } from './hmacTokens';
import type { PocketBaseApp, PocketBaseRequestEvent } from './email/emailTypes';

declare const $app: PocketBaseApp;
declare const $security: {
    hs256(payload: string, secret: string): string;
    equal(a: string, b: string): boolean;
};

/**
 * Endpoint: POST /api/generate-player-token
 * Admins only.
 */
export function handleGeneratePlayerToken(e: PocketBaseRequestEvent): void {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden: Admins only" });
    }

    const data = e.requestInfo().body;
    const eventId = data.eventId;

    if (!eventId) {
        return e.json(400, { error: "Missing eventId" });
    }

    const secret = getHmacSecret();
    if (!secret) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const token = generateSignedPlayerToken(eventId as string, secret);

    return e.json(200, { token });
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
        return e.json(400, { error: "Missing token" });
    }

    const parts: Record<string, string> = {};
    token.split('&').forEach(part => {
        const kv = part.split('=');
        if (kv.length === 2) {
            parts[kv[0]] = kv[1];
        }
    });

    if (!parts.e || !parts.s) {
        return e.json(400, { error: "Invalid token format" });
    }

    const secret = getHmacSecret();
    if (!secret) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = `e=${parts.e}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }

    try {
        const event = $app.findRecordById("events", parts.e);
        const rawSetList = event.get("setList");
        let setList = parseJsonField(rawSetList);
        if (!Array.isArray(setList)) {
            setList = [];
        }
        
        // Fetch all pieces from the music library to allow title-based fallback matching on the client side
        let pieces: any[] = [];
        try {
            const allPieces = $app.findRecordsByFilter("musicLibrary", "id != ''", "created", 1000);
            pieces = allPieces.map(p => {
                const rawMapping = p.get("audioTrackMapping");
                let mapping = parseJsonField(rawMapping);
                if (!mapping || typeof mapping !== 'object') {
                    mapping = {};
                }
                return {
                    id: p.id,
                    parentId: p.get("parentId"),
                    title: p.get("title"),
                    composer: p.get("composer"),
                    arranger: p.get("arranger"),
                    duration: p.get("duration"),
                    created: p.get("created"),
                    updated: p.get("updated"),
                    audioTrackMapping: mapping,
                    collectionId: "pbc_music_library_001",
                    collectionName: "musicLibrary"
                };
            });
        } catch (err) {
            // Fallback to empty list if querying fails
        }

        // Include voice parts configuration for the selector
        let voiceParts: any[] = [];
        try {
            const vpRecord = $app.findFirstRecordByFilter("appSettings", "key = 'voiceParts'");
            const rawVal = vpRecord.get("value");
            const parsedVal = parseJsonField<any>(rawVal);
            if (parsedVal && parsedVal.voiceParts) {
                voiceParts = parsedVal.voiceParts;
            }
        } catch (e) {
            // Fallback to empty if not found
        }

        return e.json(200, {
            event: {
                id: event.id,
                title: event.get("title"),
                date: event.get("date")
            },
            setList: setList,
            pieces: pieces,
            voiceParts: voiceParts
        });
    } catch (err) {
        // @ts-ignore
        console.log("Error in /api/player-playlist: " + err + (err.stack ? "\n" + err.stack : ""));
        return e.json(404, { 
            error: "Event or related pieces not found", 
            // @ts-ignore
            details: err.message || String(err)
        });
    }
}
