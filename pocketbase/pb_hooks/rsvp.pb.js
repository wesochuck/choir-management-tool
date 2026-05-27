// RSVP Automation Hooks

routerAdd("POST", "/api/generate-rsvp-tokens", (e) => {
    function decodeGoBytesLocal(val) {
        if (!val) return "";
        if (typeof val === "string") return val;
        try {
            if (typeof val === "object") {
                if (Array.isArray(val) && val.length > 0 && typeof val[0] === "number") {
                    let str = "";
                    for (let i = 0; i < val.length; i++) {
                        str += String.fromCharCode(val[i]);
                    }
                    return str;
                }
                return val;
            }
        } catch (err) {}
        return "";
    }

    function parseJsonFieldLocal(val) {
        if (!val) return null;
        const decoded = decodeGoBytesLocal(val);
        if (!decoded) return null;
        if (typeof decoded === "object") return decoded;
        try {
            return JSON.parse(decoded);
        } catch (err) {
            return null;
        }
    }

    function getHmacSecretLocal() {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonFieldLocal(record.get("value"));
        return parsed && typeof parsed.secret === "string" ? parsed.secret : "";
    }

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

    let secret = "";
    try {
        secret = getHmacSecretLocal();
        if (!secret) throw new Error("Missing secret");
    } catch (err) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const tokens = {};
    profileIds.forEach(pId => {
        const payload = `e=${eventId}&p=${pId}`;
        const signature = $security.hs256(payload, secret);
        tokens[pId] = `${payload}&s=${signature}`;
    });

    return e.json(200, { tokens });
});

routerAdd("POST", "/api/rsvp-details", (e) => {
    function decodeGoBytesLocal(val) {
        if (!val) return "";
        if (typeof val === "string") return val;
        try {
            if (typeof val === "object") {
                if (Array.isArray(val) && val.length > 0 && typeof val[0] === "number") {
                    let str = "";
                    for (let i = 0; i < val.length; i++) {
                        str += String.fromCharCode(val[i]);
                    }
                    return str;
                }
                return val;
            }
        } catch (err) {}
        return "";
    }

    function parseJsonFieldLocal(val) {
        if (!val) return null;
        const decoded = decodeGoBytesLocal(val);
        if (!decoded) return null;
        if (typeof decoded === "object") return decoded;
        try {
            return JSON.parse(decoded);
        } catch (err) {
            return null;
        }
    }

    function getHmacSecretLocal() {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonFieldLocal(record.get("value"));
        return parsed && typeof parsed.secret === "string" ? parsed.secret : "";
    }

    function parseSignedTokenLocal(token, requiredKeys) {
        if (!token || typeof token !== "string") return null;
        const parts = {};
        const allowed = {};
        requiredKeys.forEach(k => {
            allowed[k] = true;
        });
        token.split("&").forEach(segment => {
            const idx = segment.indexOf("=");
            if (idx <= 0) return;
            const key = segment.slice(0, idx);
            if (!allowed[key]) return;
            if (typeof parts[key] !== "undefined") return;
            parts[key] = segment.slice(idx + 1);
        });
        for (let i = 0; i < requiredKeys.length; i++) {
            const key = requiredKeys[i];
            if (!parts[key]) return null;
        }
        return parts;
    }

    const data = e.requestInfo().body;
    const token = data.token;

    if (!token) {
        return e.json(400, { error: "Missing RSVP token. Please open full RSVP link from your email." });
    }

    const parts = parseSignedTokenLocal(token, ["e", "p", "s"]);
    if (!parts) {
        return e.json(400, { error: "This RSVP link is invalid. Please request a new RSVP link." });
    }

    let secret = "";
    try {
        secret = getHmacSecretLocal();
        if (!secret) throw new Error("Missing secret");
    } catch (err) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = `e=${parts.e}&p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        console.log("[RSVP Debug] Signature mismatch for event=" + parts.e + ", profile=" + parts.p);
        console.log("[RSVP Debug] Expected: " + expectedSignature + ", Received: " + parts.s);
        return e.json(401, { error: "This RSVP link is invalid or expired. Please request a new RSVP link." });
    }

    try {
        // Fetch all venues once to eliminate N+1 queries in rehearsals loop
        let venueMap = {};
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
            if (venueId) {
                const venue = venueMap[venueId] || $app.findRecordById("venues", venueId);
                venueName = venue.get("name") || "";
                venueAddress = venue.get("address") || "";
            }
        } catch (venueErr) {
            console.log("[RSVP Details] Failed to resolve event venue: " + venueErr);
        }

        const profile = $app.findRecordById("profiles", parts.p);
        const rehearsals = [];

        if (event.get("type") === "Performance") {
            try {
                const list = $app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 100, 0, { eventId: parts.e });
                list.forEach(reh => {
                    let rVenueName = "";
                    try {
                        const rVenueId = reh.get("venue");
                        if (rVenueId) {
                            const rVenue = venueMap[rVenueId] || $app.findRecordById("venues", rVenueId);
                            rVenueName = rVenue.get("name") || "";
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
        try {
            const roster = $app.findFirstRecordByFilter("eventRosters", "event = {:e} && profile = {:p}", { e: parts.e, p: parts.p });
            currentRsvp = roster.get("rsvp") || "Pending";
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
            rehearsals
        });
    } catch (err) {
        console.log("[RSVP Details Error] Failed to fetch details: " + err);
        return e.json(404, { error: "We could not find this RSVP record. Link may be expired. Please request a new RSVP link." });
    }
});

routerAdd("POST", "/api/quick-rsvp", (e) => {
    function decodeGoBytesLocal(val) {
        if (!val) return "";
        if (typeof val === "string") return val;
        try {
            if (typeof val === "object") {
                if (Array.isArray(val) && val.length > 0 && typeof val[0] === "number") {
                    let str = "";
                    for (let i = 0; i < val.length; i++) {
                        str += String.fromCharCode(val[i]);
                    }
                    return str;
                }
                return val;
            }
        } catch (err) {}
        return "";
    }

    function parseJsonFieldLocal(val) {
        if (!val) return null;
        const decoded = decodeGoBytesLocal(val);
        if (!decoded) return null;
        if (typeof decoded === "object") return decoded;
        try {
            return JSON.parse(decoded);
        } catch (err) {
            return null;
        }
    }

    function getHmacSecretLocal() {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonFieldLocal(record.get("value"));
        return parsed && typeof parsed.secret === "string" ? parsed.secret : "";
    }

    function parseSignedTokenLocal(token, requiredKeys) {
        if (!token || typeof token !== "string") return null;
        const parts = {};
        const allowed = {};
        requiredKeys.forEach(k => {
            allowed[k] = true;
        });
        token.split("&").forEach(segment => {
            const idx = segment.indexOf("=");
            if (idx <= 0) return;
            const key = segment.slice(0, idx);
            if (!allowed[key]) return;
            if (typeof parts[key] !== "undefined") return;
            parts[key] = segment.slice(idx + 1);
        });
        for (let i = 0; i < requiredKeys.length; i++) {
            const key = requiredKeys[i];
            if (!parts[key]) return null;
        }
        return parts;
    }

    const data = e.requestInfo().body;
    const token = data.token; 
    const rsvp = data.rsvp;

    if (!token || !rsvp) {
        return e.json(400, { error: "Missing RSVP details. Please use full RSVP link from your email." });
    }

    const parts = parseSignedTokenLocal(token, ["e", "p", "s"]);
    if (!parts) {
        return e.json(400, { error: "This RSVP link is invalid. Please request a new RSVP link." });
    }

    let secret = "";
    try {
        secret = getHmacSecretLocal();
        if (!secret) throw new Error("Missing secret");
    } catch (err) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = `e=${parts.e}&p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        console.log("[RSVP Debug] Signature mismatch for event=" + parts.e + ", profile=" + parts.p);
        console.log("[RSVP Debug] Expected: " + expectedSignature + ", Received: " + parts.s);
        return e.json(401, { error: "This RSVP link is invalid or expired. Please request a new RSVP link." });
    }

    try {
        const event = $app.findRecordById("events", parts.e);
        if (!event.get("isOpenForRSVP")) {
            return e.json(410, { error: "RSVP window for this event is closed. Contact choir admins for assistance." });
        }
    } catch (err) {
        return e.json(404, { error: "Event not found. RSVP link may be expired." });
    }

    try {
        // Safer upsert: avoid creating duplicates when lookup fails for non-not-found reasons.
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
        const normalizedRsvp = rsvp === "No" ? "No" : "Yes";
        roster.set("rsvp", normalizedRsvp);
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
                }
            } catch (emailErr) {
                console.log("[RSVP Confirmation Error] Failed to enqueue automated email: " + emailErr);
            }
        }
    } catch (err) {
        let errDetails = "";
        try {
            errDetails = JSON.stringify(err);
        } catch (jsonErr) {
            errDetails = String(err);
        }
        console.log("[RSVP Quick Error] Failed to update RSVP: " + String(err) + " | details=" + errDetails);
        return e.json(500, { error: "Failed to update RSVP." });
    }

    return e.json(200, { success: true });
});

routerAdd("POST", "/api/unsubscribe", (e) => {
    function decodeGoBytesLocal(val) {
        if (!val) return "";
        if (typeof val === "string") return val;
        try {
            if (typeof val === "object") {
                if (Array.isArray(val) && val.length > 0 && typeof val[0] === "number") {
                    let str = "";
                    for (let i = 0; i < val.length; i++) {
                        str += String.fromCharCode(val[i]);
                    }
                    return str;
                }
                return val;
            }
        } catch (err) {}
        return "";
    }

    function parseJsonFieldLocal(val) {
        if (!val) return null;
        const decoded = decodeGoBytesLocal(val);
        if (!decoded) return null;
        if (typeof decoded === "object") return decoded;
        try {
            return JSON.parse(decoded);
        } catch (err) {
            return null;
        }
    }

    function getHmacSecretLocal() {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonFieldLocal(record.get("value"));
        return parsed && typeof parsed.secret === "string" ? parsed.secret : "";
    }

    function parseSignedTokenLocal(token, requiredKeys) {
        if (!token || typeof token !== "string") return null;
        const parts = {};
        const allowed = {};
        requiredKeys.forEach(k => {
            allowed[k] = true;
        });
        token.split("&").forEach(segment => {
            const idx = segment.indexOf("=");
            if (idx <= 0) return;
            const key = segment.slice(0, idx);
            if (!allowed[key]) return;
            if (typeof parts[key] !== "undefined") return;
            parts[key] = segment.slice(idx + 1);
        });
        for (let i = 0; i < requiredKeys.length; i++) {
            const key = requiredKeys[i];
            if (!parts[key]) return null;
        }
        return parts;
    }

    const data = e.requestInfo().body;
    const token = data.token; 

    if (!token) {
        return e.json(400, { error: "Missing token" });
    }

    const parts = parseSignedTokenLocal(token, ["p", "s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }

    let secret = "";
    try {
        secret = getHmacSecretLocal();
        if (!secret) throw new Error("Missing secret");
    } catch (err) {
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
    } catch (err) {
        return e.json(404, { error: "Profile not found" });
    }

    return e.json(200, { success: true });
});

routerAdd("POST", "/api/admin/bulk-update-rsvps", (e) => {
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

        const rosterMap = {};
        existingRosters.forEach(r => {
            rosterMap[r.get("profile")] = r;
        });

        $app.runInTransaction((txApp) => {
            updates.forEach(u => {
                const existing = rosterMap[u.profileId];
                if (existing) {
                    if (u.rsvp === 'Pending') {
                        const attendance = existing.get("attendance") || "Pending";
                        const folderNumber = (existing.get("folderNumber") || "").trim();
                        const folderReturned = existing.get("folderReturned");
                        const seatId = (existing.get("seatId") || "").trim();

                        const hasOtherData = attendance !== 'Pending' ||
                                             folderNumber !== '' ||
                                             folderReturned ||
                                             seatId !== '';
                        if (!hasOtherData) {
                            txApp.delete(existing);
                        } else if (existing.get("rsvp") !== 'Pending') {
                            existing.set("rsvp", "Pending");
                            txApp.save(existing);
                        }
                    } else if (existing.get("rsvp") !== u.rsvp) {
                        existing.set("rsvp", u.rsvp);
                        txApp.save(existing);
                    }
                } else {
                    if (u.rsvp !== 'Pending') {
                        const roster = new Record(rosterCollection);
                        roster.set("event", eventId);
                        roster.set("profile", u.profileId);
                        roster.set("rsvp", u.rsvp);
                        roster.set("attendance", "Pending");
                        roster.set("folderReturned", false);
                        txApp.save(roster);
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

    const allowedAttendance = {
        Present: true,
        Absent: true,
        Pending: true
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

        const rosterMap = {};
        existingRosters.forEach((roster) => {
            rosterMap[roster.get("profile")] = roster;
        });

        const changedRosters = [];
        $app.runInTransaction((txApp) => {
            updates.forEach((update) => {
                const existingRoster = rosterMap[update.profileId];
                if (existingRoster) {
                    if (existingRoster.get("attendance") !== update.attendance) {
                        existingRoster.set("attendance", update.attendance);
                        txApp.save(existingRoster);
                    }
                    changedRosters.push(existingRoster);
                } else {
                    const roster = new Record(rosterCollection);
                    roster.set("event", eventId);
                    roster.set("profile", update.profileId);
                    roster.set("rsvp", "Pending");
                    roster.set("attendance", update.attendance);
                    roster.set("folderReturned", false);
                    txApp.save(roster);
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
