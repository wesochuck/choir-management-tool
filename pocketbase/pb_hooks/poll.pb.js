// Poll Automation Hooks

routerAdd("POST", "/api/generate-poll-tokens", (e) => {
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
    const pollId = data.pollId;
    const profileIds = data.profileIds;

    if (!pollId || !profileIds || !Array.isArray(profileIds)) {
        return e.json(400, { error: "Missing pollId or profileIds array" });
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
        const payload = `l=${pollId}&p=${pId}`;
        const signature = $security.hs256(payload, secret);
        tokens[pId] = `${payload}&s=${signature}`;
    });

    return e.json(200, { tokens });
});

routerAdd("POST", "/api/poll-details", (e) => {
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

    const parts = parseSignedTokenLocal(token, ["l", "p", "s"]);
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

    const payload = `l=${parts.l}&p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }

    try {
        const poll = $app.findRecordById("polls", parts.l);

        const archiveAt = poll.get("archiveAt");
        if (archiveAt) {
            const archiveStr = typeof archiveAt === "string" ? archiveAt : archiveAt.toString();
            const archiveDate = new Date(archiveStr.replace(" ", "T"));
            if (!isNaN(archiveDate.getTime()) && archiveDate < new Date()) {
                return e.json(400, { error: "This poll has concluded and is no longer accepting responses." });
            }
        }

        const eventId = poll.get("eventId");
        let event = null;
        if (eventId) {
            const eventRec = $app.findRecordById("events", eventId);
            event = {
                title: eventRec.get("title") || "",
                date: eventRec.get("date") || ""
            };
        }

        let currentStatus = "";
        try {
            const response = $app.findFirstRecordByFilter("pollResponses", "pollId = {:l} && profileId = {:p}", { l: parts.l, p: parts.p });
            currentStatus = response.get("status") || "";
        } catch (resErr) {}

        return e.json(200, {
            poll: {
                id: poll.id,
                question: poll.get("question") || "",
                event: event
            },
            currentStatus
        });
    } catch (err) {
        return e.json(404, { error: "Poll not found" });
    }
});

routerAdd("POST", "/api/submit-poll-response", (e) => {
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
    const status = data.status;

    if (!token || !status) {
        return e.json(400, { error: "Missing token or status" });
    }

    const parts = parseSignedTokenLocal(token, ["l", "p", "s"]);
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

    const payload = `l=${parts.l}&p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);

    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }

    try {
        const poll = $app.findRecordById("polls", parts.l);
        const archiveAt = poll.get("archiveAt");
        if (archiveAt) {
            const archiveStr = typeof archiveAt === "string" ? archiveAt : archiveAt.toString();
            const archiveDate = new Date(archiveStr.replace(" ", "T"));
            if (!isNaN(archiveDate.getTime()) && archiveDate < new Date()) {
                return e.json(400, { error: "This poll has concluded and is no longer accepting responses." });
            }
        }

        let response = null;
        try {
            response = $app.findFirstRecordByFilter("pollResponses", "pollId = {:l} && profileId = {:p}", { l: parts.l, p: parts.p });
        } catch (err) {
            const collection = $app.findCollectionByNameOrId("pollResponses");
            response = new Record(collection);
            response.set("pollId", parts.l);
            response.set("profileId", parts.p);
        }

        response.set("status", status);
        $app.save(response);

        return e.json(200, { success: true });
    } catch (err) {
        return e.json(500, { error: "Failed to submit response" });
    }
});
