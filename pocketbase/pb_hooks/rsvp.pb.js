// RSVP Automation Hooks

function decodeGoBytes(val) {
    if (!val) return "";
    if (typeof val === "string") return val;
    try {
        if (typeof val === "object") {
            let str = "";
            const len = val.length;
            if (typeof len === "number") {
                for (let i = 0; i < len; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
        }
    } catch (err) {}
    return "";
}

function parseJsonField(val) {
    if (!val) return null;
    const str = decodeGoBytes(val);
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch (err) {
        return null;
    }
}

function getHmacSecret() {
    const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
    const parsed = parseJsonField(record.get("value"));
    return parsed && typeof parsed.secret === "string" ? parsed.secret : "";
}

function parseSignedToken(token, requiredKeys) {
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

routerAdd("POST", "/api/generate-rsvp-tokens", (e) => {
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
        secret = getHmacSecret();
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
    const data = e.requestInfo().body;
    const token = data.token;

    if (!token) {
        return e.json(400, { error: "Missing token" });
    }

    const parts = parseSignedToken(token, ["e", "p", "s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }

    let secret = "";
    try {
        secret = getHmacSecret();
        if (!secret) throw new Error("Missing secret");
    } catch (err) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = `e=${parts.e}&p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
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
        return e.json(404, { error: "Event or Profile not found." });
    }
});

routerAdd("POST", "/api/quick-rsvp", (e) => {
    const data = e.requestInfo().body;
    const token = data.token; 
    const rsvp = data.rsvp;

    if (!token || !rsvp) {
        return e.json(400, { error: "Missing token or rsvp" });
    }

    const parts = parseSignedToken(token, ["e", "p", "s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }

    let secret = "";
    try {
        secret = getHmacSecret();
        if (!secret) throw new Error("Missing secret");
    } catch (err) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = `e=${parts.e}&p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }

    try {
        const event = $app.findRecordById("events", parts.e);
        if (!event.get("isOpenForRSVP")) {
            return e.json(400, { error: "Event is not open for RSVP" });
        }
    } catch (err) {
        return e.json(404, { error: "Event not found" });
    }

    try {
        let roster;
        try {
            roster = $app.findFirstRecordByFilter("eventRosters", "event = {:e} && profile = {:p}", { e: parts.e, p: parts.p });
        } catch (err) {
            const collection = $app.findCollectionByNameOrId("eventRosters");
            roster = new Record(collection);
            roster.set("event", parts.e);
            roster.set("profile", parts.p);
            roster.set("attendance", "Pending");
        }
        
        roster.set("rsvp", rsvp);
        $app.save(roster);
    } catch (err) {
        console.log("[RSVP Quick Error] Failed to update RSVP: " + err);
        return e.json(500, { error: "Failed to update RSVP." });
    }

    return e.json(200, { success: true });
});

routerAdd("POST", "/api/unsubscribe", (e) => {
    const data = e.requestInfo().body;
    const token = data.token; 

    if (!token) {
        return e.json(400, { error: "Missing token" });
    }

    const parts = parseSignedToken(token, ["p", "s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }

    let secret = "";
    try {
        secret = getHmacSecret();
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
