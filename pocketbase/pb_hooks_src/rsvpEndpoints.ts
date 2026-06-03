import { generateSignedEventRecipientToken } from './hmacTokens';
import { parseJsonField } from './email/hookJson';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from './email/emailTypes';

declare const $app: PocketBaseApp;
declare const $security: {
    hs256(data: string, secret: string): string;
    equal(a: string, b: string): boolean;
};
declare const Record: new (collection: unknown, data?: unknown) => PocketBaseRecord;
declare function routerAdd(method: string, path: string, handler: (e: PocketBaseRequestEvent) => unknown): void;

// TypeScript declarations for shared utilities inlined at runtime
declare function getHmacSecret(app: PocketBaseApp): string;
declare function parseSignedToken(token: string, requiredKeys: string[]): Record<string, string> | null;
declare function generateSignedEventRecipientToken(app: PocketBaseApp, eventId: string, recipientId: string, secret?: string): string;
declare function getEventRecipientPayload(eventId: string, recipientId: string): string;
declare function processEmailQueue(app: PocketBaseApp): void;

interface TxApp extends PocketBaseApp {
    delete(record: PocketBaseRecord): void;
}

interface AppWithTransaction {
    runInTransaction(callback: (txApp: TxApp) => void): void;
}

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
        if (!event.get("isOpenForRSVP")) {
            return e.json(410, { error: "This RSVP window has closed for this event. Contact choir admins if you need help." });
        }
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
            rehearsals
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
        if (!event.get("isOpenForRSVP")) {
            return e.json(410, { error: "RSVP window for this event is closed. Contact choir admins for assistance." });
        }
    } catch {
        return e.json(404, { error: "Event not found. RSVP link may be expired." });
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

        const oldRsvp = roster.get("rsvp");
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
                const recipientEmail = profile.get("email");

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
    let content = data.content;
    const eventId = data.eventId;

    if (typeof content !== "string") {
        return e.json(400, { error: "Missing or invalid content parameter" });
    }

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
        const commSettings = $app.findFirstRecordByFilter("appSettings", "key = 'communication'");
        if (commSettings) {
            const parsed = parseJsonField<{ frontendUrl?: string }>(commSettings.get("value"));
            if (parsed && typeof parsed.frontendUrl === "string") {
                baseUrl = parsed.frontendUrl;
            }
        }
    } catch (err) {
        console.log("[Resolve Placeholders Hook Error] Failed to read communication settings: " + err);
    }

    if (!baseUrl) {
        const host = e.requestInfo().headers["host"] || "localhost:8080";
        const proto = e.requestInfo().headers["x-forwarded-proto"] || "http";
        baseUrl = proto + "://" + host;
    }

    // Resolve RSVP links
    if (content.indexOf("{{RSVP_LINKS}}") !== -1 && eventId && typeof eventId === "string") {
        const token = generateSignedEventRecipientToken($app, eventId, profile.id, secret);
        const rsvpLink = baseUrl + "/rsvp?token=" + encodeURIComponent(token);
        const replacement = "(RSVP Link for " + (profile.get("name") || "Singer") + ")\nLink: " + rsvpLink + "\n(No login required)";
        content = content.replace("{{RSVP_LINKS}}", replacement);
    }

    // Resolve Poll links
    const pollRegex = /{{POLL_LINK:([a-zA-Z0-9]+)}}/g;
    let match;
    while ((match = pollRegex.exec(content)) !== null) {
        const fullPlaceholder = match[0];
        const pollId = match[1];
        const payload = "l=" + pollId + "&p=" + profile.id;
        const signature = $security.hs256(payload, secret);
        const token = payload + "&s=" + signature;
        const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
        const replacement = "(Poll Link for " + (profile.get("name") || "Singer") + ")\nLink: " + pollLink + "\n(No login required)";
        content = content.replace(fullPlaceholder, replacement);
        pollRegex.lastIndex = 0; // Reset index since we replaced content
    }

    return e.json(200, { resolvedContent: content });
});
