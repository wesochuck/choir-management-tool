import { parseJsonField } from './email/hookJson';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from './email/emailTypes';

declare const $app: PocketBaseApp;
declare const $security: {
    hs256(data: string, secret: string): string;
    equal(a: string, b: string): boolean;
};
declare const Record: new (collection: unknown, data?: unknown) => PocketBaseRecord;
declare function routerAdd(method: string, path: string, handler: (e: PocketBaseRequestEvent) => unknown): void;

import {
    getHmacSecret,
    parseSignedToken,
    generateSignedEventRecipientToken,
    getEventRecipientPayload,
    generateSignedPlayerToken
} from './hmacTokens';
import { processEmailQueue } from './email/queueProcessor';
import { renderMarkdown } from './email/emailRendering';
import { escapeHtml, normalizeBaseUrl, formatInTimezone } from './email/hookText';

interface AppWithTransaction {
    runInTransaction(callback: (txApp: PocketBaseApp) => void): void;
}

import {
    parsePocketBaseDate,
    validateSingerRsvpWindow,
    getRsvpWindowInfo
} from './rsvpValidation';
import {
    notifyAdminsOfDecline
} from './adminNotifications';
export { parsePocketBaseDate };






routerAdd("POST", "/api/generate-rsvp-tokens", (e) => {
    // __SHARED_UTILS__

    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden: Admins only" });
    }

    const data = e.requestInfo().body;
    const eventId = data.eventId;
    const profileIds = data.profileIds;

    if (!eventId || !profileIds || !Array.isArray(profileIds)) {
        return e.json(400, { error: "Missing eventId or profileIds array" });
    }

    let secret: string;
    try {
        secret = getHmacSecret($app);
        if (!secret) throw new Error("Missing secret");
    } catch {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const tokens: Record<string, string> = {};
    (profileIds as string[]).forEach(pId => {
        tokens[pId] = generateSignedEventRecipientToken($app, eventId as string, pId, secret);
    });

    return e.json(200, { tokens });
});

routerAdd("POST", "/api/rsvp-details", (e) => {
    // __SHARED_UTILS__

    const data = e.requestInfo().body;
    const token = data.token;

    if (!token || typeof token !== "string") {
        return e.json(400, { error: "Missing RSVP token. Please open full RSVP link from your email." });
    }

    const parts = parseSignedToken(token, ["e", "p", "s"]);
    if (!parts) {
        return e.json(400, { error: "This RSVP link is invalid. Please request a new RSVP link." });
    }

    let secret: string;
    try {
        secret = getHmacSecret($app);
        if (!secret) throw new Error("Missing secret");
    } catch {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = getEventRecipientPayload(parts.e, parts.p);
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        console.log("[RSVP Debug] Signature mismatch for event=" + parts.e + ", profile=" + parts.p);
        console.log("[RSVP Debug] Expected: " + expectedSignature + ", Received: " + parts.s);
        return e.json(401, { error: "This RSVP link is invalid or expired. Please request a new RSVP link." });
    }

    try {
        // Fetch all venues once to eliminate N+1 queries in rehearsals loop
        const venueMap: Record<string, PocketBaseRecord> = {};
        try {
            const allVenues = $app.findRecordsByFilter("venues", "1 = 1", "", 200);
            if (allVenues) {
                allVenues.forEach(v => {
                    venueMap[v.id] = v;
                });
            }
        } catch (venueFetchErr) {
            console.log("[RSVP Error] Failed to fetch venues: " + venueFetchErr);
        }

        const event = $app.findRecordById("events", parts.e);
        const rsvpWindow = getRsvpWindowInfo(event);

        let venueName = "";
        let venueAddress = "";
        try {
            const venueId = event.get("venue");
            if (venueId && typeof venueId === "string") {
                const venue = venueMap[venueId] || $app.findRecordById("venues", venueId);
                venueName = (venue.get("name") as string) || "";
                venueAddress = (venue.get("address") as string) || "";
            }
        } catch (venueErr) {
            console.log("[RSVP Details] Failed to resolve event venue: " + venueErr);
        }

        const profile = $app.findRecordById("profiles", parts.p);
        const rehearsals: unknown[] = [];

        if (event.get("type") === "Performance") {
            try {
                const list = $app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 100, 0, { eventId: parts.e });
                list.forEach(reh => {
                    let rVenueName = "";
                    try {
                        const rVenueId = reh.get("venue");
                        if (rVenueId && typeof rVenueId === "string") {
                            const rVenue = venueMap[rVenueId] || $app.findRecordById("venues", rVenueId);
                            rVenueName = (rVenue.get("name") as string) || "";
                        }
                    } catch (e) {
                        console.log("[RSVP Details] Failed to resolve rehearsal venue for rehearsal " + reh.id + ": " + e);
                    }
                    rehearsals.push({
                        id: reh.id,
                        title: reh.get("title") || "",
                        type: reh.get("type") || "",
                        date: reh.get("date") || "",
                        details: reh.get("details") || "",
                        expand: {
                            venue: {
                                name: rVenueName
                            }
                        }
                    });
                });
            } catch (rehErr) {
                console.log("[RSVP Details] Failed to fetch rehearsals for performance " + parts.e + ": " + rehErr);
            }
        }

        let currentRsvp = "Pending";
        let currentRsvpNote = "";
        try {
            const roster = $app.findFirstRecordByFilter("eventRosters", "event = {:e} && profile = {:p}", { e: parts.e, p: parts.p });
            currentRsvp = (roster.get("rsvp") as string) || "Pending";
            currentRsvpNote = (roster.get("rsvpNote") as string) || "";
        } catch (rosterErr) {
            console.log("[RSVP Details] No existing roster found for event " + parts.e + " and profile " + parts.p + ": " + rosterErr);
        }

        return e.json(200, {
            event: {
                id: event.id,
                title: event.get("title") || "",
                type: event.get("type") || "",
                date: event.get("date") || "",
                details: event.get("details") || "",
                location: event.get("location") || "",
                isOpenForRSVP: !!event.get("isOpenForRSVP"),
                expand: {
                    venue: {
                        name: venueName,
                        address: venueAddress
                    }
                }
            },
            profile: {
                id: profile.id,
                name: profile.get("name") || "",
                voicePart: profile.get("voicePart") || ""
            },
            currentRsvp,
            currentRsvpNote,
            rehearsals,
            rsvpWindow
        });

    } catch (err) {
        console.log("[RSVP Details Error] Failed to fetch details: " + err);
        return e.json(404, { error: "We could not find this RSVP record. Link may be expired. Please request a new RSVP link." });
    }
});

routerAdd("POST", "/api/quick-rsvp", (e) => {
    // __SHARED_UTILS__

    const data = e.requestInfo().body;
    const token = data.token;
    const rsvp = data.rsvp;
    const rsvpNote = typeof data.rsvpNote === "string" ? data.rsvpNote.trim() : "";

    if (!token || !rsvp || typeof token !== "string") {
        return e.json(400, { error: "Missing RSVP details. Please use full RSVP link from your email." });
    }

    if (rsvpNote.length > 1000) {
        return e.json(400, {
            error: "Your note cannot exceed 1000 characters.",
            code: "RSVP_NOTE_TOO_LONG",
        });
    }

    const parts = parseSignedToken(token, ["e", "p", "s"]);
    if (!parts) {
        return e.json(400, { error: "This RSVP link is invalid. Please request a new RSVP link." });
    }

    let secret: string;
    try {
        secret = getHmacSecret($app);
        if (!secret) throw new Error("Missing secret");
    } catch {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = getEventRecipientPayload(parts.e, parts.p);
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        console.log("[RSVP Debug] Signature mismatch for event=" + parts.e + ", profile=" + parts.p);
        console.log("[RSVP Debug] Expected: " + expectedSignature + ", Received: " + parts.s);
        return e.json(401, { error: "This RSVP link is invalid or expired. Please request a new RSVP link." });
    }

    let event: PocketBaseRecord;
    try {
        event = $app.findRecordById("events", parts.e);
    } catch {
        return e.json(404, { error: "Event not found. RSVP link may be expired." });
    }
    const windowValidation = validateSingerRsvpWindow(event);
    if (!windowValidation.ok) {
        return e.json(windowValidation.status, { error: windowValidation.error });
    }

    const normalizedRsvp = rsvp === "No" ? "No" : "Yes";

    if (event.get("type") === "Rehearsal" && normalizedRsvp === "No" && !rsvpNote) {
        return e.json(400, {
            error: "Please include a note explaining why you cannot attend this rehearsal.",
            code: "RSVP_NOTE_REQUIRED",
        });
    }

    try {
        const matches = $app.findRecordsByFilter(
            "eventRosters",
            "event = {:e} && profile = {:p}",
            "",
            2,
            0,
            { e: parts.e, p: parts.p }
        ) || [];

        let roster = matches.length > 0 ? matches[0] : null;
        if (!roster) {
            const collection = $app.findCollectionByNameOrId("eventRosters");
            roster = new Record(collection);
            roster.set("event", parts.e);
            roster.set("profile", parts.p);
            roster.set("attendance", "Pending");
            roster.set("folderReturned", false);
        }

        const oldRsvp = (roster.get("rsvp") as string) || "Pending";
        const oldNote = ((roster.get("rsvpNote") as string) || "").trim();
        roster.set("rsvp", normalizedRsvp);

        if (normalizedRsvp === "No") {
            roster.set("rsvpNote", rsvpNote);
        } else {
            roster.set("rsvpNote", "");
        }

        $app.save(roster);

        // Enqueue confirmation email if RSVP changed to Yes
        if (normalizedRsvp === "Yes" && oldRsvp !== "Yes") {
            try {
                const profile = $app.findRecordById("profiles", parts.p);
                let recipientEmail = "";
                const userId = profile.get("user") as string;
                if (userId) {
                    try {
                        const userRec = $app.findRecordById("users", userId);
                        recipientEmail = (userRec.get("email") as string) || "";
                    } catch (err) {
                        console.log("[RSVP Confirmation Error] Failed to resolve email for profile " + parts.p + ": " + err);
                    }
                }

                if (recipientEmail && !profile.get("doNotEmail")) {
                    const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'RSVP Confirmation' && isSystemTemplate = true");
                    const queueCollection = $app.findCollectionByNameOrId("emailQueue");

                    const queueRecord = new Record(queueCollection, {
                        recipientId: profile.id,
                        recipientEmail: recipientEmail,
                        recipientName: profile.get("name") || "Singer",
                        subject: template.get("subject") || "",
                        rawContent: template.get("content") || "",
                        status: "Pending",
                        attempts: 0,
                        filters: JSON.stringify({
                            eventId: parts.e,
                            type: "Automated Confirmation"
                        })
                    });

                    $app.save(queueRecord);
                    processEmailQueue($app);
                }
            } catch (emailErr) {
                console.log("[RSVP Confirmation Error] Failed to enqueue automated email: " + emailErr);
            }
        }

        // Notify admins if RSVP changed to No or decline reason changed for rehearsals
        const shouldNotifyAdmins =
            normalizedRsvp === "No" &&
            (oldRsvp !== "No" || (oldNote !== rsvpNote && event.get("type") === "Rehearsal"));

        if (shouldNotifyAdmins) {
            try {
                const profile = $app.findRecordById("profiles", parts.p);
                notifyAdminsOfDecline($app, parts.e, profile, rsvpNote);
            } catch (declineErr) {
                console.log("[RSVP Decline Hook Error] Failed to process quick-rsvp decline notice: " + declineErr);
            }
        }
    } catch (err) {
        let errDetails: string;
        try {
            errDetails = JSON.stringify(err);
        } catch {
            errDetails = String(err);
        }
        console.log("[RSVP Quick Error] Failed to update RSVP: " + String(err) + " | details=" + errDetails);
        return e.json(500, { error: "Failed to update RSVP." });
    }

    return e.json(200, { success: true });
});

routerAdd("POST", "/api/unsubscribe", (e) => {
    // __SHARED_UTILS__

    const data = e.requestInfo().body;
    const token = data.token;

    if (!token || typeof token !== "string") {
        return e.json(400, { error: "Missing token" });
    }

    const parts = parseSignedToken(token, ["p", "s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }

    let secret: string;
    try {
        secret = getHmacSecret($app);
        if (!secret) throw new Error("Missing secret");
    } catch {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = `p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }

    try {
        const profile = $app.findRecordById("profiles", parts.p);
        profile.set("doNotEmail", true);
        $app.save(profile);
    } catch {
        return e.json(404, { error: "Profile not found" });
    }

    return e.json(200, { success: true });
});

routerAdd("POST", "/api/admin/bulk-update-rsvps", (e) => {
    // __SHARED_UTILS__

    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden: Admins only" });
    }

    const data = e.requestInfo().body;
    const eventId = data.eventId;
    const updates = data.updates;

    if (!eventId || !updates || !Array.isArray(updates)) {
        return e.json(400, { error: "Missing eventId or updates array" });
    }

    try {
        const rosterCollection = $app.findCollectionByNameOrId("eventRosters");
        const existingRosters = $app.findRecordsByFilter(
            "eventRosters",
            "event = {:eventId}",
            "",
            1000,
            0,
            { eventId: eventId }
        ) || [];

        const rosterMap: Record<string, PocketBaseRecord> = {};
        existingRosters.forEach(r => {
            const profileVal = r.get("profile");
            if (typeof profileVal === "string") {
                rosterMap[profileVal] = r;
            }
        });

        const txApp = $app as unknown as AppWithTransaction;
        txApp.runInTransaction((tx) => {
            (updates as { profileId: string; rsvp: string }[]).forEach(u => {
                const existing = rosterMap[u.profileId];
                if (existing) {
                    if (u.rsvp === 'Pending') {
                        const attendance = existing.get("attendance") || "Pending";
                        const folderNumber = ((existing.get("folderNumber") as string) || "").trim();
                        const folderReturned = existing.get("folderReturned");
                        const seatId = ((existing.get("seatId") as string) || "").trim();

                        const hasOtherData = attendance !== 'Pending' ||
                                             folderNumber !== '' ||
                                             folderReturned ||
                                             seatId !== '';
                        if (!hasOtherData) {
                            tx.delete(existing);
                        } else if (existing.get("rsvp") !== 'Pending') {
                            existing.set("rsvp", "Pending");
                            existing.set("rsvpNote", "");
                            tx.save(existing);
                        }
                    } else if (existing.get("rsvp") !== u.rsvp) {
                        existing.set("rsvp", u.rsvp);
                        if (u.rsvp !== "No") {
                            existing.set("rsvpNote", "");
                        }
                        tx.save(existing);
                    }
                } else {
                    if (u.rsvp !== 'Pending') {
                        const roster = new Record(rosterCollection);
                        roster.set("event", eventId);
                        roster.set("profile", u.profileId);
                        roster.set("rsvp", u.rsvp);
                        roster.set("attendance", "Pending");
                        roster.set("folderReturned", false);
                        tx.save(roster);
                    }
                }
            });
        });

        return e.json(200, { success: true });
    } catch (err) {
        console.log("[Bulk RSVP Hook Error]: " + String(err));
        return e.json(500, { error: "Failed to bulk update RSVPs: " + String(err) });
    }
});

routerAdd("POST", "/api/admin/bulk-upsert-attendance", (e) => {
    // __SHARED_UTILS__

    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden: Admins only" });
    }

    const data = e.requestInfo().body;
    const eventId = data.eventId;
    const updates = data.updates;

    if (!eventId) {
        return e.json(400, { error: "Missing eventId" });
    }
    if (!Array.isArray(updates)) {
        return e.json(400, { error: "updates must be an array" });
    }

    const allowedAttendance: Record<string, boolean> = {
        Present: true,
        Absent: true,
        Pending: true
    };

    const shouldPromotePendingRsvpToYes = (attendance: string, rsvp: string) => {
        return attendance === "Present" && (!rsvp || rsvp === "Pending");
    };

    for (let i = 0; i < updates.length; i++) {
        const update = updates[i] || {};
        if (!update.profileId) {
            return e.json(400, { error: "Each update requires profileId" });
        }
        if (!allowedAttendance[update.attendance]) {
            return e.json(400, { error: "Invalid attendance value" });
        }
    }

    try {
        const rosterCollection = $app.findCollectionByNameOrId("eventRosters");
        const existingRosters = $app.findRecordsByFilter(
            "eventRosters",
            "event = {:eventId}",
            "",
            1000,
            0,
            { eventId: eventId }
        ) || [];

        const rosterMap: Record<string, PocketBaseRecord> = {};
        existingRosters.forEach((roster) => {
            const profileVal = roster.get("profile");
            if (typeof profileVal === "string") {
                rosterMap[profileVal] = roster;
            }
        });

        const changedRosters: PocketBaseRecord[] = [];
        const txApp = $app as unknown as AppWithTransaction;
        txApp.runInTransaction((tx) => {
            (updates as { profileId: string; attendance: string }[]).forEach((update) => {
                const existingRoster = rosterMap[update.profileId];
                if (existingRoster) {
                    const currentAttendance = existingRoster.get("attendance") as string;
                    const currentRsvp = existingRoster.get("rsvp") as string;
                    let changed = false;

                    if (currentAttendance !== update.attendance) {
                        existingRoster.set("attendance", update.attendance);
                        changed = true;
                    }

                    // Match the single attendance update behavior: marking a pending singer Present
                    // also makes them attending so RSVP-driven seating views include them.
                    if (shouldPromotePendingRsvpToYes(update.attendance, currentRsvp)) {
                        existingRoster.set("rsvp", "Yes");
                        changed = true;
                    }

                    if (changed) {
                        tx.save(existingRoster);
                    }

                    changedRosters.push(existingRoster);
                } else {
                    const roster = new Record(rosterCollection);
                    roster.set("event", eventId);
                    roster.set("profile", update.profileId);
                    roster.set("rsvp", update.attendance === "Present" ? "Yes" : "Pending");
                    roster.set("attendance", update.attendance);
                    roster.set("folderReturned", false);
                    tx.save(roster);
                    changedRosters.push(roster);
                }
            });
        });

        const payload = changedRosters.map((roster) => ({
            id: roster.id,
            event: roster.get("event"),
            profile: roster.get("profile"),
            attendance: roster.get("attendance"),
            rsvp: roster.get("rsvp"),
            folderNumber: roster.get("folderNumber") || "",
            folderReturned: !!roster.get("folderReturned"),
            seatId: roster.get("seatId") || ""
        }));

        return e.json(200, { rosters: payload });
    } catch (err) {
        console.log("[Bulk Attendance Hook Error]: " + String(err));
        return e.json(500, { error: "Failed to bulk upsert attendance: " + String(err) });
    }
});

routerAdd("POST", "/api/singer/resolve-placeholders", (e) => {
    // __SHARED_UTILS__

    const authRecord = e.auth;
    if (!authRecord) {
        return e.json(401, { error: "Unauthorized" });
    }

    const data = e.requestInfo().body;
    if (typeof data.content !== "string") {
        return e.json(400, { error: "Missing or invalid content parameter" });
    }
    const content: string = data.content;
    const eventId = typeof data.eventId === "string" ? data.eventId : undefined;

    let profile: PocketBaseRecord;
    try {
        profile = $app.findFirstRecordByFilter("profiles", "user = {:userId}", { userId: authRecord.id });
    } catch {
        return e.json(404, { error: "Profile not found" });
    }

    let secret: string;
    try {
        secret = getHmacSecret($app);
        if (!secret) throw new Error("Missing secret");
    } catch {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    let baseUrl = "";
    try {
        let commSettings;
        try {
            commSettings = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        } catch {
            commSettings = $app.findFirstRecordByFilter("appSettings", "key = 'communication'");
        }
        if (commSettings) {
            const parsed = parseJsonField<{ frontendUrl?: string }>(commSettings.get("value"));
            if (parsed && typeof parsed.frontendUrl === "string") {
                baseUrl = parsed.frontendUrl;
            }
        }
    } catch (err) {
        console.log("[Resolve Placeholders Hook Error] Failed to read communication settings: " + err);
    }

    if (!baseUrl || baseUrl === "http://localhost:5173" || baseUrl.indexOf("localhost") !== -1) {
        const requestInfo = e.requestInfo();
        const host = requestInfo.headers?.["host"];
        const proto = requestInfo.headers?.["x-forwarded-proto"] || "https";
        if (host && host.indexOf("localhost") === -1) {
            baseUrl = proto + "://" + host;
        } else {
            const meta = $app.settings()?.meta;
            const settingsAppUrl = meta?.appUrl || meta?.appURL || "";
            if (settingsAppUrl) {
                baseUrl = settingsAppUrl;
            } else if (host) {
                baseUrl = proto + "://" + host;
            } else {
                baseUrl = "http://localhost:5173";
            }
        }
    }
    baseUrl = normalizeBaseUrl(baseUrl);

    let timezone = "America/New_York";
    try {
        const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField<string | { timezone?: string }>(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            } else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    } catch {
        // use default timezone
    }

    let event: PocketBaseRecord | null = null;
    if (eventId) {
        try {
            event = $app.findRecordById("events", eventId);
        } catch (err) {
            console.log("[Resolve Placeholders] Failed to find event: " + err);
        }
    }

    // Temporarily protect placeholders containing underscores from markdown parsing
    const protectedContent = content
        .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
        .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
        .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
        .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
        .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
        .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");

    let htmlBody = renderMarkdown(protectedContent);

    // Restore protected placeholders
    htmlBody = htmlBody
        .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
        .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
        .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
        .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
        .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
        .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");

    // Resolve {singerName}
    const recipientName = (profile.get("name") || "Singer") as string;
    htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));

    if (event) {
        const eventDate = event.get("date") as string;
        const eventTitle = (event.get("title") || event.get("type") || "Event") as string;
        const eventType = (event.get("type") || "Performance") as string;
        const eventDetails = (event.get("details") || "") as string;
        let venueName = "TBD";
        let venueAddress = "";
        try {
            const venueRecord = $app.findRecordById("venues", event.get("venue") as string);
            venueName = (venueRecord.get("name") || "TBD") as string;
            venueAddress = (venueRecord.get("address") || "") as string;
        } catch {
            // venue not found
        }

        const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
        const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

        let locationHtml = escapeHtml(venueName);
        if (venueAddress.trim()) {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`;
            locationHtml = `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${escapeHtml(venueName)}</a>`;
        }

        const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${locationHtml}</strong>
    </div>
</div>
`;

        htmlBody = htmlBody.replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
                        .replace(/{eventType}/g, () => escapeHtml(eventType))
                        .replace(/{eventDate}/g, () => escapeHtml(dateShort))
                        .replace(/{eventLocation}/g, () => locationHtml)
                        .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
                        .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
                        .replace(/{eventInfo}/g, () => eventInfoHtml);

        // Resolve RSVP links
        if (htmlBody.indexOf("{{RSVP_LINKS}}") !== -1 || htmlBody.indexOf("{rsvpLinks}") !== -1) {
            const token = generateSignedEventRecipientToken($app, event.id, profile.id, secret);
            const rsvpLink = baseUrl + "/rsvp?token=" + encodeURIComponent(token);
            const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">(No login required)</p>
</div>
`;
            htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, () => rsvpHtml).replace(/{rsvpLinks}/g, () => rsvpHtml);
        }

        // Resolve Player links
        if (htmlBody.indexOf("{{PLAYER_LINK}}") !== -1 || htmlBody.indexOf("{playerLink}") !== -1) {
            const token = generateSignedPlayerToken($app, event.id, secret);
            const playerLink = baseUrl + "/player?token=" + encodeURIComponent(token);
            const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
            htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, () => playerHtml).replace(/{playerLink}/g, () => playerHtml);
        }
    } else {
        // Clear event placeholders if no event is present
        htmlBody = htmlBody.replace(/{eventTitle}/g, "")
                        .replace(/{eventType}/g, "")
                        .replace(/{eventDate}/g, "")
                        .replace(/{eventLocation}/g, "")
                        .replace(/{eventDetails}/g, "")
                        .replace(/{{EVENT_INFO}}/g, "")
                        .replace(/{eventInfo}/g, "")
                        .replace(/{{RSVP_LINKS}}/g, "")
                        .replace(/{rsvpLinks}/g, "")
                        .replace(/{{PLAYER_LINK}}/g, "")
                        .replace(/{playerLink}/g, "");
    }

    // Resolve Poll links
    const pollRegex = /{{POLL_LINK:([a-zA-Z0-9]+)}}/g;
    let match;
    while ((match = pollRegex.exec(htmlBody)) !== null) {
        const fullPlaceholder = match[0];
        const pollId = match[1];
        const payload = "l=" + pollId + "&p=" + profile.id;
        const signature = $security.hs256(payload, secret);
        const token = payload + "&s=" + signature;
        const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);

        let pollButtonLabel = "Answer our quick question";
        try {
            const pollRecord = $app.findRecordById("polls", pollId);
            const question = pollRecord?.get("question");
            if (typeof question === "string" && question.trim()) {
                pollButtonLabel = question.trim();
            }
        } catch {
            // Keep default fallback
        }

        const replacement = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
        htmlBody = htmlBody.replace(fullPlaceholder, replacement);
        pollRegex.lastIndex = 0; // Reset index since we replaced content
    }

    return e.json(200, { resolvedContent: htmlBody });
});

routerAdd("POST", "/api/singer/rsvp", (e) => {
    // __SHARED_UTILS__

    const authRecord = e.auth;
    if (!authRecord) {
        return e.json(401, { error: "Unauthorized" });
    }

    const data = e.requestInfo().body;
    if (typeof data.eventId !== "string" || typeof data.rsvp !== "string") {
        return e.json(400, { error: "Missing eventId or rsvp" });
    }
    const eventId: string = data.eventId;
    const rsvp: string = data.rsvp;
    const rsvpNote = typeof data.rsvpNote === "string" ? data.rsvpNote.trim() : "";

    if (rsvpNote.length > 1000) {
        return e.json(400, {
            error: "Your note cannot exceed 1000 characters.",
            code: "RSVP_NOTE_TOO_LONG",
        });
    }

    if (rsvp !== "Yes" && rsvp !== "No" && rsvp !== "Pending") {
        return e.json(400, { error: "Invalid rsvp status" });
    }

    let profile: PocketBaseRecord;
    try {
        profile = $app.findFirstRecordByFilter("profiles", "user = {:userId}", { userId: authRecord.id });
    } catch {
        return e.json(404, { error: "Profile not found" });
    }

    let event: PocketBaseRecord;
    try {
        event = $app.findRecordById("events", eventId);
    } catch {
        return e.json(404, { error: "Event not found" });
    }
    const windowValidation = validateSingerRsvpWindow(event);
    if (!windowValidation.ok) {
        return e.json(windowValidation.status, { error: windowValidation.error });
    }

    if (event.get("type") === "Rehearsal" && rsvp === "No" && !rsvpNote) {
        return e.json(400, {
            error: "Please include a note explaining why you cannot attend this rehearsal.",
            code: "RSVP_NOTE_REQUIRED",
        });
    }

    try {
        const matches = $app.findRecordsByFilter(
            "eventRosters",
            "event = {:e} && profile = {:p}",
            "",
            2,
            0,
            { e: eventId, p: profile.id }
        ) || [];

        let roster = matches.length > 0 ? matches[0] : null;

        if (rsvp === "Pending") {
            if (roster) {
                const hasOtherData = roster.get("attendance") !== "Pending" ||
                                     Boolean((roster.get("folderNumber") as string || "").trim()) ||
                                     roster.get("folderReturned") ||
                                     Boolean((roster.get("seatId") as string || "").trim());

                if (!hasOtherData) {
                    $app.delete(roster);
                    return e.json(200, {
                        id: "",
                        event: eventId,
                        profile: profile.id,
                        rsvp: "Pending",
                        attendance: "Pending",
                        folderReturned: false,
                    });
                } else {
                    roster.set("rsvp", "Pending");
                    roster.set("rsvpNote", "");
                    $app.save(roster);
                }
            } else {
                return e.json(200, {
                    id: "",
                    event: eventId,
                    profile: profile.id,
                    rsvp: "Pending",
                    attendance: "Pending",
                    folderReturned: false,
                });
            }
        } else {
            const oldRsvp = roster ? ((roster.get("rsvp") as string) || "Pending") : "Pending";
            const oldNote = roster ? (((roster.get("rsvpNote") as string) || "").trim()) : "";
            if (!roster) {
                const collection = $app.findCollectionByNameOrId("eventRosters");
                roster = new Record(collection);
                roster.set("event", eventId);
                roster.set("profile", profile.id);
                roster.set("attendance", "Pending");
                roster.set("folderReturned", false);
            }

            roster.set("rsvp", rsvp);
            if (rsvp === "No") {
                roster.set("rsvpNote", rsvpNote);
            } else {
                roster.set("rsvpNote", "");
            }

            $app.save(roster);

            // Enqueue confirmation email if RSVP changed to Yes
            if (rsvp === "Yes" && oldRsvp !== "Yes") {
                try {
                    let recipientEmail = "";
                    const userId = profile.get("user") as string;
                    if (userId) {
                        try {
                            const userRec = $app.findRecordById("users", userId);
                            recipientEmail = (userRec.get("email") as string) || "";
                        } catch (err) {
                            console.log("[RSVP Confirmation Error] Failed to resolve email for profile " + profile.id + ": " + err);
                        }
                    }

                    if (recipientEmail && !profile.get("doNotEmail")) {
                        const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'RSVP Confirmation' && isSystemTemplate = true");
                        const queueCollection = $app.findCollectionByNameOrId("emailQueue");

                        const queueRecord = new Record(queueCollection, {
                            recipientId: profile.id,
                            recipientEmail: recipientEmail,
                            recipientName: profile.get("name") || "Singer",
                            subject: template.get("subject") || "",
                            rawContent: template.get("content") || "",
                            status: "Pending",
                            attempts: 0,
                            filters: JSON.stringify({
                                eventId: eventId,
                                type: "Automated Confirmation"
                            })
                        });

                        $app.save(queueRecord);
                        processEmailQueue($app);
                    }
                } catch (emailErr) {
                    console.log("[RSVP Confirmation Error] Failed to enqueue automated email: " + emailErr);
                }
            }

            // Notify admins if RSVP changed to No or decline reason changed for rehearsals
            const shouldNotifyAdmins =
                rsvp === "No" &&
                (oldRsvp !== "No" || (oldNote !== rsvpNote && event.get("type") === "Rehearsal"));

            if (shouldNotifyAdmins) {
                try {
                    notifyAdminsOfDecline($app, eventId, profile, rsvpNote);
                } catch (declineErr) {
                    console.log("[RSVP Decline Hook Error] Failed to process singer/rsvp decline notice: " + declineErr);
                }
            }
        }

        return e.json(200, {
            id: roster.id,
            event: roster.get("event"),
            profile: roster.get("profile"),
            rsvp: roster.get("rsvp"),
            rsvpNote: roster.get("rsvpNote") || "",
            attendance: roster.get("attendance"),
            folderReturned: !!roster.get("folderReturned"),
            seatId: roster.get("seatId") || "",
            folderNumber: roster.get("folderNumber") || "",
        });

    } catch (err) {
        console.log("[Singer RSVP Error] Failed to update RSVP: " + err);
        return e.json(500, { error: "Failed to update RSVP" });
    }
});
