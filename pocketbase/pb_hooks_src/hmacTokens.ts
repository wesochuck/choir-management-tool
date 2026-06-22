import { parseJsonField } from './email/hookJson';
import type { PocketBaseApp } from './email/emailTypes';

declare const $security: {
    hs256(payload: string, secret: string): string;
};

declare const $app: PocketBaseApp;

declare const $os: {
    getenv(key: string): string;
};

export function getHmacSecret(app?: PocketBaseApp): string {
    return $os.getenv("HMAC_SECRET") || "";
}

/**
 * Enforces strict payload property serialization order for Player links.
 */
export function getPlayerPayload(eventId: string): string {
    return `e=${eventId}`;
}

/**
 * Enforces strict payload property serialization order for Event+Recipient links (RSVP, Calendar).
 */
export function getEventRecipientPayload(eventId: string, recipientId: string): string {
    return `e=${eventId}&p=${recipientId}`;
}

/**
 * Enforces strict payload property serialization order for Audition calendar links.
 */
export function getAuditionPayload(auditionId: string): string {
    return `a=${auditionId}`;
}

/**
 * Enforces strict payload property serialization order for Ticket validation links.
 */
export function getTicketPayload(purchaseId: string): string {
    return `t=${purchaseId}`;
}

export function generateSignedTicketToken(app: PocketBaseApp, purchaseId: string, secretOverride?: string): string {
    const secret = secretOverride || getHmacSecret(app);
    const payload = getTicketPayload(purchaseId);
    const signature = $security.hs256(payload, secret);
    return `${payload}&s=${signature}`;
}

export function generateSignedPlayerToken(app: PocketBaseApp, eventId: string, secretOverride?: string): string {
    const secret = secretOverride || getHmacSecret(app);
    const payload = getPlayerPayload(eventId);
    const signature = $security.hs256(payload, secret);
    return `${payload}&s=${signature}`;
}

export function generateSignedEventRecipientToken(app: PocketBaseApp, eventId: string, recipientId: string, secretOverride?: string): string {
    const secret = secretOverride || getHmacSecret(app);
    const payload = getEventRecipientPayload(eventId, recipientId);
    const signature = $security.hs256(payload, secret);
    return `${payload}&s=${signature}`;
}

export function generateSignedAuditionToken(app: PocketBaseApp, auditionId: string, secretOverride?: string): string {
    const secret = secretOverride || getHmacSecret(app);
    const payload = getAuditionPayload(auditionId);
    const signature = $security.hs256(payload, secret);
    return `${payload}&s=${signature}`;
}

export function parseSignedToken(token: string, requiredKeys: string[]): Record<string, string> | null {
    if (!token || typeof token !== "string") return null;
    const parts: Record<string, string> = {};
    const allowed: Record<string, boolean> = { s: true, e: true, p: true, a: true, c: true, t: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0) return;
        const key = segment.slice(0, idx);
        if (!allowed[key]) return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]]) return null;
    }
    return parts;
}
