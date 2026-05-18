// RSVP Automation Hooks

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
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        secret = record.get("value").secret;
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

routerAdd("POST", "/api/quick-rsvp", (e) => {
    const data = e.requestInfo().body;
    const token = data.token; 
    const rsvp = data.rsvp;

    if (!token || !rsvp) {
        return e.json(400, { error: "Missing token or rsvp" });
    }

    const parts = {};
    token.split('&').forEach(part => {
        const kv = part.split('=');
        if (kv.length === 2) {
            parts[kv[0]] = kv[1];
        }
    });

    if (!parts.e || !parts.p || !parts.s) {
        return e.json(400, { error: "Invalid token format" });
    }

    let secret = "";
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        secret = record.get("value").secret;
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
        return e.json(500, { error: "Failed to update RSVP: " + err.message });
    }

    return e.json(200, { success: true });
});
