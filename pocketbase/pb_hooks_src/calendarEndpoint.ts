import type { PocketBaseApp, PocketBaseRequestEvent } from './email/emailTypes';
import { parseJsonField } from './email/hookJson';

declare const $app: PocketBaseApp;
declare const $security: {
    hs256(data: string, secret: string): string;
    equal(a: string, b: string): boolean;
};

function getHmacSecretLocal(app: PocketBaseApp): string {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField<{ secret: string }>(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    } catch { return ""; }
}

function parseSignedTokenLocal(token: string, requiredKeys: string[]): Record<string, string> | null {
    if (!token || typeof token !== "string") return null;
    const parts: Record<string, string> = {};
    const allowed: Record<string, boolean> = { s: true, e: true, p: true, a: true };
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

function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}

function fmtUtc(date: Date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function getChoirTimezoneLocal(app: PocketBaseApp): string {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField<string | Record<string, string>>(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string") timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone) timezone = parsed.timezone;
        }
    } catch {}
    return timezone;
}

/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr: string, timezone: string): Date {
    if (!dateStr) return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        
        let offsetHours = -4; // default Eastern
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;

        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        } else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        } else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        } else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        } else {
            offsetHours = isDst ? -4 : -5;
        }
        
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}

export function handleCalendarDownload(e: PocketBaseRequestEvent): unknown {
    const token = e.requestInfo().query["token"];
    const app = $app;

    if (!token) {
        return e.json(400, { error: "Missing token" });
    }

    const parts = parseSignedTokenLocal(token as string, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }

    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }

    // Determine payload signature
    let payload: string;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    } else if (parts.a) {
        payload = `a=${parts.a}`;
    } else {
        return e.json(400, { error: "Invalid token structure" });
    }

    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }

    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";

        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            
            try {
                const venueId = event.get("venue") as string;
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = (venue.get("name") as string) || "";
                    venueAddress = (venue.get("address") as string) || "";
                }
            } catch {
                // Ignore venue resolution error
            }

            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : ((event.get("location") as string) || "");
            start = parseSafeUtcDate(event.get("date") as string, timezone);
            title = (event.get("title") as string) || (event.get("type") as string) || "Choir Event";
            details = (event.get("details") as string) || "";
            uid = `event-${event.id}@choir-management.local`;
        } else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot") as string, timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;

            try {
                const eventId = audition.get("performance") as string;
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue") as string;
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = (venue.get("name") as string) || "";
                        venueAddress = (venue.get("address") as string) || "";
                    }
                }
            } catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }

        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');

        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        
        return e.string(200, icsContent);

    } catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
}
