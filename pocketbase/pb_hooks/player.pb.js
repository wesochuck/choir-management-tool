// Audio Player Standalone Hooks

routerAdd("POST", "/api/generate-player-token", (e) => {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden: Admins only" });
    }

    const data = e.requestInfo().body;
    const eventId = data.eventId;

    if (!eventId) {
        return e.json(400, { error: "Missing eventId" });
    }

    let secret = "";
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        secret = record.get("value").secret;
    } catch (err) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = `e=${eventId}`;
    const signature = $security.hs256(payload, secret);
    const token = `${payload}&s=${signature}`;

    return e.json(200, { token });
});

routerAdd("GET", "/api/player-playlist", (e) => {
    const token = e.requestInfo().query.token;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }

    const parts = {};
    token.split('&').forEach(part => {
        const kv = part.split('=');
        if (kv.length === 2) {
            parts[kv[0]] = kv[1];
        }
    });

    if (!parts.e || !parts.s) {
        return e.json(400, { error: "Invalid token format" });
    }

    let secret = "";
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        secret = record.get("value").secret;
    } catch (err) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }

    const payload = `e=${parts.e}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }

    try {
        const event = $app.findRecordById("events", parts.e);
        const setList = event.get("setList") || [];
        
        // Fetch piece details for any linked pieces
        const pieceIds = setList
            .filter(item => item.pieceId)
            .map(item => item.pieceId);

        let pieces = [];
        if (pieceIds.length > 0) {
            // Find all pieces and their movements
            // For simplicity in the hook, we'll return the pieces mapped by ID
            // The frontend service will handle the final assembly
            const filterStr = pieceIds.map(id => `id = '${id}'`).join(" || ");
            pieces = $app.findRecordsByFilter("musicLibrary", filterStr);
        }

        // Include voice parts configuration for the selector
        let voiceParts = [];
        try {
            const vpRecord = $app.findFirstRecordByFilter("appSettings", "key = 'voiceParts'");
            voiceParts = vpRecord.get("value").voiceParts || [];
        } catch (e) {
            // Fallback to empty if not found
        }

        return e.json(200, {
            event: {
                id: event.id,
                title: event.get("title"),
                date: event.get("date")
            },
            setList: setList,
            pieces: pieces,
            voiceParts: voiceParts
        });
    } catch (err) {
        return e.json(404, { error: "Event or related pieces not found" });
    }
});
