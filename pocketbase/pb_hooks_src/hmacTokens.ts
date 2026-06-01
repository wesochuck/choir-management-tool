import { parseJsonField } from './email/hookJson';
import type { PocketBaseRecord } from './email/emailTypes';

declare const $app: {
    findFirstRecordByFilter(collection: string, filter: string): PocketBaseRecord;
};

export function getHmacSecret(): string {
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField<{ secret?: string }>(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    } catch {
        return "";
    }
}

export function parseSignedToken(token: string, requiredKeys: string[]): Record<string, string> | null {
    if (!token || typeof token !== "string") return null;
    const parts: Record<string, string> = {};
    const allowed: Record<string, boolean> = { s: true, e: true, p: true, a: true, c: true };
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
