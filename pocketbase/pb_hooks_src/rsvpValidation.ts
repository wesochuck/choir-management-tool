import type { PocketBaseRecord } from './email/emailTypes';


export function parsePocketBaseDate(dateValue: unknown): Date | null {
    const raw = String(dateValue || "").trim();
    if (!raw) return null;

    const normalized = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.replace(" ", "T") : raw;
    const withTimezone = /^\d{4}-\d{2}-\d{2}/.test(normalized) && !/(Z|[+-]\d{2}:?\d{2})$/.test(normalized)
        ? normalized + "Z"
        : normalized;

    try {
        const parsed = new Date(withTimezone);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    } catch {
        // Goja can be stricter than browsers for date strings; fall back below.
    }

    try {
        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
}

export function validateSingerRsvpWindow(event: PocketBaseRecord): { ok: true } | { ok: false; status: number; error: string } {
    if (event.get("isArchived")) {
        return {
            ok: false,
            status: 410,
            error: "This event has been archived/deleted.",
        };
    }

    const eventType = String(event.get("type") || "");

    if (eventType === "Performance" && !event.get("isOpenForRSVP")) {
        return {
            ok: false,
            status: 410,
            error: "The RSVP window for this performance is closed. Contact choir admins if you need help changing your commitment.",
        };
    }

    if (eventType === "Rehearsal") {
        const eventDate = parsePocketBaseDate(event.get("date"));
        if (!eventDate) {
            return { ok: false, status: 400, error: "Invalid rehearsal date." };
        }

        if (eventDate.getTime() < Date.now()) {
            return { ok: false, status: 410, error: "This rehearsal has already passed." };
        }
    }

    return { ok: true };
}

export function getRsvpWindowInfo(event: PocketBaseRecord): {
    canSubmit: boolean;
    isReadOnly: boolean;
    reason: string;
} {
    if (event.get("isArchived")) {
        return {
            canSubmit: false,
            isReadOnly: true,
            reason: "This event has been archived/deleted.",
        };
    }

    const eventType = String(event.get("type") || "");

    if (eventType === "Performance" && !event.get("isOpenForRSVP")) {
        return {
            canSubmit: false,
            isReadOnly: true,
            reason: "The RSVP window for this performance is closed. Your current response is shown below.",
        };
    }

    if (eventType === "Rehearsal") {
        const eventDate = parsePocketBaseDate(event.get("date"));
        if (!eventDate) {
            return {
                canSubmit: false,
                isReadOnly: true,
                reason: "Invalid rehearsal date.",
            };
        }

        if (eventDate.getTime() < Date.now()) {
            return {
                canSubmit: false,
                isReadOnly: true,
                reason: "This rehearsal has already passed.",
            };
        }
    }

    return {
        canSubmit: true,
        isReadOnly: false,
        reason: "",
    };
}

