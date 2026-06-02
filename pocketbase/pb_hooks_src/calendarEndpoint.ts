import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from './email/emailTypes';
import { parseJsonField } from './email/hookJson';

declare const $app: PocketBaseApp;
declare const $security: {
    hs256(data: string, secret: string): string;
    equal(a: string, b: string): boolean;
    randomString(length: number): string;
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
    } catch {
        // ignore error
    }
    return timezone;
}

function getChoirNameLocal(app: PocketBaseApp): string {
    try {
        const setting = app.findFirstRecordByFilter("appSettings", "key = 'choirName'");
        const parsed = parseJsonField<string | Record<string, string>>(setting.get("value"));

        if (typeof parsed === "string" && parsed.trim()) {
            return parsed.trim();
        }

        if (parsed && typeof parsed === "object") {
            const value = parsed.name || parsed.choirName || parsed.value;
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }
    } catch {
        // ignore error
    }

    return "Choir";
}

/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr: string, timezone: string): Date {
    if (!dateStr) return new Date();
    const str = String(dateStr);
    let normalized = str.trim();
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
        
        let offsetHours: number;
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

        const choirName = getChoirNameLocal(app);
        const calendarName = `${choirName} Schedule`;

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
            `X-WR-TIMEZONE:${timezone}`,
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

        const filenameBase = calendarName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'choir-schedule';

        const fileId = parts.e ? `event-${parts.e}` : `audition-${parts.a}`;

        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set(
            "Content-Disposition",
            `attachment; filename="${filenameBase}-${fileId}.ics"`
        );
        
        return e.string(200, icsContent);

    } catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
}

export function handleCalendarFeed(e: PocketBaseRequestEvent): unknown {
    const token = e.requestInfo().query["token"];
    const app = $app;

    if (!token) {
        return e.json(400, { error: "Missing token" });
    }

    const parts = parseSignedTokenLocal(token as string, ["p", "c", "s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }

    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }

    // Verify signature over the payload p=<profileId>&c=<calendarSalt>
    const payload = `p=${parts.p}&c=${parts.c}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }

    try {
        // Fetch singer profile
        const profile = app.findRecordById("profiles", parts.p);
        
        // Double check calendar salt matches
        const activeSalt = profile.get("calendarSalt") as string;
        if (!activeSalt || activeSalt !== parts.c) {
            return e.json(401, { error: "Token has been reset or is invalid" });
        }

        const timezone = getChoirTimezoneLocal(app);

        // Fetch all events (Performance/Rehearsal) - past 30 days up to 1 year in the future.
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ");
        const events = app.findRecordsByFilter("events", `date >= '${thirtyDaysAgo}'`, "-date", 500);

        // Fetch all rosters (RSVPs) for this profile
        const rosters = app.findRecordsByFilter("eventRosters", `profile = '${profile.id}'`, "", 1000);
        
        // Map event ID to roster record
        const rosterMap: Record<string, unknown> = {};
        rosters.forEach(r => {
            rosterMap[r.get("event") as string] = r;
        });

        // Resolve each event
        const eventsToInclude: PocketBaseRecord[] = [];
        const rsvpStatusMap: Record<string, string> = {}; // Cache resolved RSVPs

        // Loop through all events to calculate their resolved RSVP status
        events.forEach(event => {
            const eventId = event.id;
            const eventType = event.get("type") as string;
            
            // Check for direct roster RSVP
            const roster = rosterMap[eventId] as PocketBaseRecord | undefined;
            let resolvedRsvp = roster ? (roster.get("rsvp") as string) : "Pending";
            
            if (eventType === "Rehearsal" && resolvedRsvp === "Pending") {
                // Rehearsal inherits from parent performance
                const parentId = event.get("parentPerformanceId") as string;
                if (parentId) {
                    const parentRoster = rosterMap[parentId] as PocketBaseRecord | undefined;
                    const parentRsvp = parentRoster ? (parentRoster.get("rsvp") as string) : "Pending";
                    if (parentRsvp !== "Pending") {
                        resolvedRsvp = parentRsvp;
                    }
                }
            }

            // Only include if RSVP is Yes (Attending) or Pending
            if (resolvedRsvp === "Yes" || resolvedRsvp === "Pending") {
                eventsToInclude.push(event);
                rsvpStatusMap[eventId] = resolvedRsvp;
            }
        });

        // Sort events chronologically (oldest first)
        eventsToInclude.sort((a: PocketBaseRecord, b: PocketBaseRecord) => {
            return new Date(a.get("date") as string).getTime() - new Date(b.get("date") as string).getTime();
        });

        // Build the VEVENT list
        const vevents: string[] = [];
        const dtstamp = new Date();

        // Pre-fetch all venues
        const venueMap: Record<string, PocketBaseRecord> = {};
        try {
            const allVenues = app.findRecordsByFilter("venues", "1 = 1", "", 500);
            allVenues.forEach(v => {
                venueMap[v.id] = v;
            });
        } catch {
            // ignore venue pre-fetch failure
        }

        eventsToInclude.forEach((event: PocketBaseRecord) => {
            let venueName = "";
            let venueAddress = "";
            const venueId = event.get("venue") as string;
            if (venueId) {
                const venue = venueMap[venueId] || app.findRecordById("venues", venueId);
                if (venue) {
                    venueName = (venue.get("name") as string) || "";
                    venueAddress = (venue.get("address") as string) || "";
                }
            }

            const locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : ((event.get("location") as string) || "");
            const start = parseSafeUtcDate(event.get("date") as string, timezone);
            
            // Duration: rehearsals default to 2 hours, performances default to 2.5 hours
            const durationHours = event.get("type") === "Performance" ? 2.5 : 2;
            const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

            const rsvpText = rsvpStatusMap[event.id] === "Yes" ? "Attending" : "Pending RSVP";
            const typeText = event.get("type") as string;
            const callTime = event.get("callTime") as string;

            // Build premium DESCRIPTION field
            const descParts: string[] = [];
            descParts.push(`Type: ${typeText}`);
            descParts.push(`Your Status: ${rsvpText}`);
            if (callTime) {
                descParts.push(`Call Time: ${callTime}`);
            }
            
            const details = event.get("details") as string;
            if (details) {
                descParts.push(`\nDetails:\n${details}`);
            }

            // Set List inclusion
            const setListApproved = event.get("setListApproved") as boolean;
            if (setListApproved && rsvpStatusMap[event.id] === "Yes") {
                const rawSetList = event.get("setList");
                const parsedSetList = parseJsonField<{ title: string; composer?: string; pieceId?: string; type?: string }[]>(rawSetList);
                if (parsedSetList && parsedSetList.length > 0) {
                    descParts.push(`\nSet List:`);
                    parsedSetList.forEach((item, index) => {
                        const songTitle = item.title;
                        const songComposer = item.composer || "";
                        const itemStr = songComposer ? `${index + 1}. ${songTitle} (${songComposer})` : `${index + 1}. ${songTitle}`;
                        descParts.push(itemStr);
                    });
                }
            }

            const description = descParts.join("\n");
            const title = event.get("title") as string;
            const uid = `event-${event.id}@choir-management.local`;

            vevents.push(
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${fmtUtc(dtstamp)}`,
                `DTSTART:${fmtUtc(start)}`,
                `DTEND:${fmtUtc(end)}`,
                `SUMMARY:${escapeIcsText(title)}`,
                `LOCATION:${escapeIcsText(locationStr)}`,
                `DESCRIPTION:${escapeIcsText(description)}`,
                'END:VEVENT'
            );
        });

        const choirName = getChoirNameLocal(app);
        const calendarName = `${choirName} Schedule`;

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
            'X-WR-TIMEZONE:' + timezone,
            vevents.join('\r\n'),
            'END:VCALENDAR',
            ''
        ].join('\r\n');

        const filenameBase = calendarName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'choir-schedule';

        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${filenameBase}-${profile.id}.ics"`);
        e.response.header().set("Cache-Control", "no-store, must-revalidate");
        
        return e.string(200, icsContent);

    } catch (err) {
        return e.json(500, { error: "Failed to generate calendar feed: " + String(err) });
    }
}

export function handleCalendarFeedUrl(e: PocketBaseRequestEvent): unknown {
    const authRecord = e.auth;
    if (!authRecord) {
        return e.json(401, { error: "Unauthorized" });
    }

    const app = $app;
    try {
        const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
        let salt = profile.get("calendarSalt") as string;
        if (!salt) {
            salt = $security.randomString(16);
            profile.set("calendarSalt", salt);
            app.saveNoValidate(profile);
        }

        const secret = getHmacSecretLocal(app);
        if (!secret) {
            return e.json(500, { error: "Configuration error" });
        }

        const payload = `p=${profile.id}&c=${salt}`;
        const signature = $security.hs256(payload, secret);
        const token = `${payload}&s=${signature}`;

        return e.json(200, { token });
    } catch {
        return e.json(404, { error: "Singer profile not found" });
    }
}

export function handleCalendarFeedReset(e: PocketBaseRequestEvent): unknown {
    const authRecord = e.auth;
    if (!authRecord) {
        return e.json(401, { error: "Unauthorized" });
    }

    const app = $app;
    try {
        const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
        
        // Generate new salt
        const salt = $security.randomString(16);
        profile.set("calendarSalt", salt);
        app.saveNoValidate(profile);

        const secret = getHmacSecretLocal(app);
        if (!secret) {
            return e.json(500, { error: "Configuration error" });
        }

        const payload = `p=${profile.id}&c=${salt}`;
        const signature = $security.hs256(payload, secret);
        const token = `${payload}&s=${signature}`;

        return e.json(200, { token });
    } catch (err) {
        return e.json(500, { error: "Failed to reset calendar feed: " + String(err) });
    }
}


