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
    let token = e.requestInfo().query.token;
    const sParam = e.requestInfo().query.s;
    if (token && sParam && !token.includes('s=')) {
        token = `${token}&s=${sParam}`;
    }

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
        const rawSetList = event.get("setList");
        let setList = [];
        if (rawSetList) {
            try {
                const str = typeof rawSetList === 'string' ? rawSetList : JSON.stringify(rawSetList);
                setList = JSON.parse(str);
            } catch (e) {
                setList = [];
            }
        }
        if (!Array.isArray(setList)) {
            setList = [];
        }
        
        // Fetch all pieces from the music library to allow title-based fallback matching on the client side
        let pieces = [];
        try {
            const allPieces = $app.findRecordsByFilter("musicLibrary", "id != ''", "created", 1000);
            pieces = allPieces.map(p => {
                const rawMapping = p.get("audioTrackMapping");
                let mapping = {};
                if (rawMapping) {
                    try {
                        const str = typeof rawMapping === 'string' ? rawMapping : JSON.stringify(rawMapping);
                        mapping = JSON.parse(str);
                    } catch (e) {
                        mapping = {};
                    }
                }
                return {
                    id: p.id,
                    parentId: p.get("parentId"),
                    title: p.get("title"),
                    composer: p.get("composer"),
                    duration: p.get("duration"),
                    created: p.get("created"),
                    updated: p.get("updated"),
                    audioTrackMapping: mapping,
                    collectionId: p.collectionId,
                    collectionName: p.collectionName
                };
            });
        } catch (err) {
            // Fallback to empty list if querying fails
        }

        // Include voice parts configuration for the selector
        let voiceParts = [];
        try {
            const vpRecord = $app.findFirstRecordByFilter("appSettings", "key = 'voiceParts'");
            const rawVal = vpRecord.get("value");
            let parsedVal = null;
            if (rawVal) {
                const str = typeof rawVal === 'string' ? rawVal : JSON.stringify(rawVal);
                parsedVal = JSON.parse(str);
            }
            if (parsedVal && parsedVal.voiceParts) {
                voiceParts = parsedVal.voiceParts;
            }
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
