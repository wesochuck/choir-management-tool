import fs from 'node:fs';
import path from 'path';
import ts from 'typescript';

const SRC_DIR = path.join(process.cwd(), 'pocketbase/pb_hooks_src');
const OUTPUT_FILE = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');

function readSrc(file: string): string {
    const filePath = path.join(SRC_DIR, 'email', file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Use TypeScript compiler to transpile to JS (strips types)
    const result = ts.transpileModule(content, {
        compilerOptions: { 
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ESNext,
            removeComments: false
        }
    });

    let js = result.outputText;

    // Remove imports and exports
    js = js.replace(/^import .* from .*$/gm, '');
    js = js.replace(/^export /gm, '');
    js = js.replace(/export\s+\{[^}]*\};/g, ''); // Remove named exports at bottom

    return js.trim();
}

function generate() {
    const hookText = readSrc('hookText.ts');
    const hookJson = readSrc('hookJson.ts');
    const emailRendering = readSrc('emailRendering.ts');
    const messageHookRules = readSrc('messageHookRules.ts');
    const attendanceReport = readSrc('attendanceReport.ts');
    const emailStyles = readSrc('emailStyles.ts');
    const mailjetRenderer = readSrc('mailjetRenderer.ts');
    const queueProcessor = readSrc('queueProcessor.ts');
    
    // Read root hooks
    const calendarEndpoint = fs.readFileSync(path.join(SRC_DIR, 'calendarEndpoint.ts'), 'utf8');
    const calendarJs = ts.transpileModule(calendarEndpoint, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext, removeComments: false } }).outputText.replace(/^import .* from .*$/gm, '').replace(/^export /gm, '').replace(/export\s+\{[^}]*\};/g, '').trim();

    const sharedUtils = `
// --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
${hookText}

${hookJson}

${emailRendering}

${messageHookRules}

${attendanceReport}

${emailStyles}

${mailjetRenderer}

${queueProcessor}

${calendarJs}

function getHmacSecret() {
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    } catch (err) { return ""; }
}

function parseSignedToken(token, requiredKeys) {
    if (!token || typeof token !== "string") return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
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
`.trim();

    const mainPbJs = `
// PocketBase Backend Hooks - SOURCE GENERATED (DO NOT EDIT DIRECTLY)
// Source: pocketbase/pb_hooks_src/

${sharedUtils}

// --- CRON JOBS ---

cronAdd("post_event_report", "0 * * * *", () => {
    // Shared Utils for Cron
    ${sharedUtils}

    const hoursAfter = 12;
    const now = new Date();
    const end = new Date(now.getTime() - (hoursAfter * 60 * 60 * 1000));
    const start = new Date(end.getTime() - (1 * 60 * 60 * 1000));

    const events = $app.findRecordsByFilter("events", "date >= {:start} && date < {:end}", "-date", 100, 0, { start, end });
    if (!events || events.length === 0) return;

    const admins = $app.findRecordsByFilter("users", "role = 'admin'");
    if (!admins || admins.length === 0) return;

    let commSettings = { mailingAddress: "123 Choir St, Harmony City, HC 12345", reportSubjectTemplate: "Attendance Report: {eventTitle}", reportBodyTemplate: "Report for {eventTitle}..." };
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const parsed = parseJsonField(setting.get("value"));
        if (parsed) {
            if (parsed.mailingAddress) commSettings.mailingAddress = parsed.mailingAddress;
            if (parsed.reportSubjectTemplate) commSettings.reportSubjectTemplate = parsed.reportSubjectTemplate;
            if (parsed.reportBodyTemplate) commSettings.reportBodyTemplate = parsed.reportBodyTemplate;
        }
    } catch (e) {
        console.log("Warning: Failed to parse communications settings", e);
    }

    events.forEach(event => {
        const rosters = $app.findRecordsByFilter("eventRosters", "event = {:eventId}", "profile.name", 500, 0, { eventId: event.id });
        if (!rosters || rosters.length === 0) return;

        const total = rosters.length;
        const present = rosters.filter(r => r.get("attendance") === "Present").length;
        const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
        const eventDateObj = new Date(event.get("date"));
        const eventDateStr = (eventDateObj.getMonth() + 1) + "/" + eventDateObj.getDate() + "/" + eventDateObj.getFullYear();
        
        const subject = sanitizeEmailSubject(commSettings.reportSubjectTemplate.replace(/{eventTitle}/g, event.get("title")).replace(/{eventDate}/g, eventDateStr));
        
        const body = renderAttendanceReportBody({
            eventTitle: event.get("title"),
            eventDate: eventDateStr,
            attendanceRate: attendanceRate,
            presentCount: present,
            totalCount: total,
            mailingAddress: commSettings.mailingAddress
        });

        // Refactored to let it enqueue and send asynchronously
        try {
            const messageCollection = $app.findCollectionByNameOrId("messages");
            const record = new Record(messageCollection, {
                subject,
                content: body,
                type: "Email",
                status: "Sent",
                recipients: admins.map(a => ({ id: a.id, name: a.get("name") || "Admin", email: a.get("email") })),
                filters: { type: "Automated Report", eventId: event.id }
            });
            $app.save(record);
        } catch (e) {
            console.log("[Cron Error] Failed to create attendance report message: " + e);
        }
    });
});

cronAdd("process_email_queue_job", "*/2 * * * *", () => {
    // Shared Utils for Cron
    ${sharedUtils}

    console.log("[Cron Engine] Evaluating pending outbound message matrices...");
    processEmailQueue($app);
});

// --- RECORD HOOKS ---

onRecordAfterCreateSuccess((e) => {
    // Shared Utils for Hook
    ${sharedUtils}
    
    try {
        const record = e?.record;
        if (record && shouldQueueMessage(record)) {
            enqueueBulkMessage($app, record);
        }
    } catch (hookErr) {
        console.log("[Hook Error] onRecordAfterCreateSuccess: " + hookErr);
    }
}, "messages");

onRecordAfterUpdateSuccess((e) => {
    // Shared Utils for Hook
    ${sharedUtils}
    
    try {
        const record = e?.record;
        const original = (e.record && typeof e.record.originalCopy === 'function') ? e.record.originalCopy() : e.originalCopy;
        const oldStatus = original ? original.get("status") : "";
        if (record && shouldQueueMessage(record, oldStatus)) {
            enqueueBulkMessage($app, record);
        }
    } catch (hookErr) {
        console.log("[Hook Error] onRecordAfterUpdateSuccess: " + hookErr);
    }
}, "messages");

// --- CUSTOM ENDPOINTS ---

routerAdd("POST", "/api/queue/process", (e) => {
    // Shared Utils for Router
    ${sharedUtils}

    const queryToken = e.requestInfo().query["token"] || "";
    let tokenValid = false;

    if (queryToken) {
        try {
            const record = $app.findFirstRecordByFilter("appSettings", "key = 'QUEUE_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            const secret = parsed && parsed.secret ? parsed.secret : "";
            if (secret && queryToken === secret) {
                tokenValid = true;
            }
        } catch (err) {
            // Secret not set or record missing
        }
    }

    const authRecord = e.auth;
    const isAdmin = authRecord && authRecord.get("role") === "admin";

    if (!tokenValid && !isAdmin) {
        return e.json(403, { error: "Forbidden" });
    }

    processEmailQueue($app);
    return e.json(200, { success: true });
});

routerAdd("GET", "/api/admin/queue-settings", (e) => {
    ${sharedUtils}
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden" });
    }

    let token = "";
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'QUEUE_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        token = parsed && parsed.secret ? parsed.secret : "";
    } catch (err) {
        // Record does not exist yet
    }

    return e.json(200, { secret: token });
});

routerAdd("POST", "/api/admin/queue-settings/generate", (e) => {
    ${sharedUtils}
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden" });
    }

    const newSecret = $security.randomString(32);
    const valueObj = { secret: newSecret };

    let record;
    try {
        record = $app.findFirstRecordByFilter("appSettings", "key = 'QUEUE_SECRET'");
        record.set("value", JSON.stringify(valueObj));
    } catch (err) {
        const collection = $app.findCollectionByNameOrId("appSettings");
        record = new Record(collection, {
            key: "QUEUE_SECRET",
            value: JSON.stringify(valueObj)
        });
    }

    $app.save(record);
    return e.json(200, { secret: newSecret });
});

routerAdd("POST", "/api/test-smtp", (e) => {
    ${sharedUtils}
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") return e.json(403, { error: "Forbidden" });
    const { email } = e.requestInfo().body;
    if (!email) return e.json(400, { error: "Missing email" });
    const settings = $app.settings();
    if (!settings.smtp.enabled) return e.json(400, { error: "SMTP disabled" });
    try {
        const message = new MailerMessage({ from: { address: settings.meta.senderAddress || "no-reply@choir.management", name: "Choir Management Tool" }, to: [{ address: email }], subject: "SMTP Test Successful!", html: "<p>Your SMTP is working!</p>" });
        $app.newMailClient().send(message);
        return e.json(200, { success: true });
    } catch (err) { return e.json(500, { error: "SMTP failed" }); }
});

routerAdd("GET", "/api/calendar/download", (e) => {
    ${sharedUtils}
    return handleCalendarDownload(e);
});
`.trim();

    fs.writeFileSync(OUTPUT_FILE, mainPbJs);
    console.log('Successfully generated pocketbase/pb_hooks/main.pb.js');
}

generate();
