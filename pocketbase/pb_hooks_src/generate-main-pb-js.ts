import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SRC_DIR = path.join(process.cwd(), 'pocketbase/pb_hooks_src');
const OUTPUT_FILE = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');

type UtilityBundleName =
    | 'hookJson'
    | 'hookText'
    | 'emailRendering'
    | 'emailStyles'
    | 'mailjetRenderer'
    | 'attendanceReport'
    | 'messageHookRules'
    | 'queueProcessor'
    | 'calendarEndpoint'
    | 'singerSeatingEndpoint'
    | 'hmacTokens';

type UtilityBundle = {
    files: string[];
    symbols: string[];
    dependsOn?: UtilityBundleName[];
};

type CallbackOptions = {
    forceBundles?: UtilityBundleName[];
    excludeBundles?: UtilityBundleName[];
};

const UTILITY_BUNDLES: Record<UtilityBundleName, UtilityBundle> = {
    hookJson: {
        files: ['email/hookJson.ts'],
        symbols: ['decodeGoBytes', 'parseJsonField'],
    },
    hookText: {
        files: ['email/hookText.ts'],
        symbols: [
            'escapeHtml',
            'sanitizeHtmlTemplateData',
            'sanitizeEmailSubject',
            'normalizeBaseUrl',
            'getTimezoneOffsetInfo',
            'formatInTimezone',
        ],
    },
    emailRendering: {
        files: ['email/emailRendering.ts'],
        symbols: ['renderMarkdown'],
    },
    emailStyles: {
        files: ['email/emailStyles.ts'],
        symbols: ['EMAIL_CSS'],
    },
    mailjetRenderer: {
        files: ['email/mailjetRenderer.ts'],
        symbols: ['compileMailjetHtml'],
        dependsOn: ['emailStyles'],
    },
    attendanceReport: {
        files: ['email/attendanceReport.ts'],
        symbols: ['renderAttendanceReportBody'],
        dependsOn: ['hookText'],
    },
    messageHookRules: {
        files: ['email/messageHookRules.ts'],
        symbols: ['shouldQueueMessage', 'enqueueBulkMessage'],
        dependsOn: ['hookJson'],
    },
    queueProcessor: {
        files: ['email/queueProcessor.ts'],
        symbols: ['processEmailQueue'],
        dependsOn: ['hookJson', 'hookText', 'emailRendering', 'mailjetRenderer'],
    },
    calendarEndpoint: {
        files: ['calendarEndpoint.ts'],
        symbols: ['handleCalendarDownload', 'handleCalendarFeed', 'handleCalendarFeedUrl', 'handleCalendarFeedReset'],
        dependsOn: ['hookJson', 'hookText'],
    },
    singerSeatingEndpoint: {
        files: ['singerSeatingEndpoint.ts'],
        symbols: ['handleSingerSeatingProfiles'],
        dependsOn: ['hookJson'],
    },
    hmacTokens: {
        files: ['hmacTokens.ts'],
        symbols: ['getHmacSecret', 'parseSignedToken'],
        dependsOn: ['hookJson'],
    },
};

const transpileCache = new Map<string, string>();

function applyTextEdits(source: string, edits: { start: number; end: number; text: string }[]): string {
    return [...edits]
        .sort((a, b) => b.start - a.start)
        .reduce((next, edit) => `${next.slice(0, edit.start)}${edit.text}${next.slice(edit.end)}`, source);
}

function stripModuleSyntaxSafely(source: string, fileName: string): string {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const edits: { start: number; end: number; text: string }[] = [];

    for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
            edits.push({ start: statement.getFullStart(), end: statement.getEnd(), text: '' });
            continue;
        }

        const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
        if (!modifiers) continue;

        for (const modifier of modifiers) {
            if (modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword) {
                const start = modifier.getFullStart();
                const end = modifier.getEnd();
                edits.push({ start, end, text: '' });
            }
        }
    }

    return applyTextEdits(source, edits);
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
    return diagnostics.map((diagnostic) => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        if (!diagnostic.file || diagnostic.start === undefined) return message;
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} - ${message}`;
    }).join('\n');
}

export function transpileHookSource(source: string, fileName: string): string {
    const scriptSource = stripModuleSyntaxSafely(source, fileName);
    const result = ts.transpileModule(scriptSource, {
        fileName,
        compilerOptions: {
            target: ts.ScriptTarget.ES2017,
            module: ts.ModuleKind.None,
            removeComments: false,
            importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
            ignoreDeprecations: '6.0',
        },
        reportDiagnostics: true,
    });

    const diagnostics = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    if (diagnostics.length > 0) {
        throw new Error(formatDiagnostics(diagnostics));
    }

    return result.outputText.trim();
}

function getTranspiledFile(fileName: string): string {
    const cached = transpileCache.get(fileName);
    if (cached !== undefined) return cached;

    const source = fs.readFileSync(path.join(SRC_DIR, fileName), 'utf8');
    const js = transpileHookSource(source, fileName);
    transpileCache.set(fileName, js);
    return js;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resolveBundleDependencies(bundleNames: UtilityBundleName[]): UtilityBundleName[] {
    const resolved = new Set<UtilityBundleName>();

    function visit(name: UtilityBundleName): void {
        if (resolved.has(name)) return;
        const bundle = UTILITY_BUNDLES[name];
        for (const dependency of bundle.dependsOn ?? []) {
            visit(dependency);
        }
        resolved.add(name);
    }

    for (const name of bundleNames) {
        visit(name);
    }

    return [...resolved];
}

export function detectBundles(callbackText: string, options: CallbackOptions = {}): UtilityBundleName[] {
    const required = new Set<UtilityBundleName>(options.forceBundles ?? []);
    const excluded = new Set<UtilityBundleName>(options.excludeBundles ?? []);

    for (const [bundleName, bundle] of Object.entries(UTILITY_BUNDLES) as [UtilityBundleName, UtilityBundle][]) {
        if (excluded.has(bundleName)) continue;
        for (const symbol of bundle.symbols) {
            const pattern = new RegExp(`\\b${escapeRegExp(symbol)}\\b`);
            if (pattern.test(callbackText)) {
                required.add(bundleName);
                break;
            }
        }
    }

    return resolveBundleDependencies([...required]).filter((name) => !excluded.has(name));
}

function renderUtilityPrelude(callbackText: string, options: CallbackOptions = {}): string {
    const bundles = detectBundles(callbackText, options);
    if (bundles.length === 0) return '';

    const files = new Set<string>();
    for (const bundleName of bundles) {
        for (const file of UTILITY_BUNDLES[bundleName].files) {
            files.add(file);
        }
    }

    const utilityJs = [...files].map((file) => `// --- Utility source: ${file} ---\n${getTranspiledFile(file)}`).join('\n\n');
    return `// --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---\n${utilityJs}\n// --- END CALLBACK-LOCAL UTILITIES ---`;
}

function withUtilities(callbackText: string, options: CallbackOptions = {}): string {
    const prelude = renderUtilityPrelude(callbackText, options);
    return prelude ? `${prelude}\n\n${callbackText.trim()}` : callbackText.trim();
}

function renderCron(name: string, schedule: string, body: string, options: CallbackOptions = {}): string {
    return `cronAdd(${JSON.stringify(name)}, ${JSON.stringify(schedule)}, () => {\n${indent(withUtilities(body, options), 4)}\n});`;
}

function renderRecordHook(hookName: string, collection: string, body: string, options: CallbackOptions = {}): string {
    return `${hookName}((e) => {\n${indent(withUtilities(body, options), 4)}\n}, ${JSON.stringify(collection)});`;
}

function renderRoute(method: string, routePath: string, body: string, options: CallbackOptions = {}): string {
    return `routerAdd(${JSON.stringify(method)}, ${JSON.stringify(routePath)}, (e) => {\n${indent(withUtilities(body, options), 4)}\n});`;
}

function indent(text: string, spaces: number): string {
    const padding = ' '.repeat(spaces);
    return text.split('\n').map((line) => line ? `${padding}${line}` : '').join('\n');
}

function replaceSharedUtilityPlaceholders(js: string): string {
    const placeholder = '// __SHARED_UTILS__';
    let output = '';
    let cursor = 0;

    while (true) {
        const index = js.indexOf(placeholder, cursor);
        if (index === -1) break;
        output += js.slice(cursor, index);
        const body = extractEnclosingArrowBody(js, index);
        output += renderUtilityPrelude(body);
        cursor = index + placeholder.length;
    }

    output += js.slice(cursor);
    return output;
}

function extractEnclosingArrowBody(source: string, position: number): string {
    let openBrace = -1;
    for (let i = position; i >= 0; i--) {
        if (source[i] === '{') {
            openBrace = i;
            break;
        }
    }
    if (openBrace === -1) return source;

    let depth = 0;
    for (let i = openBrace; i < source.length; i++) {
        const ch = source[i];
        if (ch === '{') depth += 1;
        if (ch === '}') depth -= 1;
        if (depth === 0) return source.slice(openBrace + 1, i);
    }

    return source.slice(openBrace + 1);
}

function buildRsvpRoutes(): string {
    const rsvpJs = getTranspiledFile('rsvpEndpoints.ts');
    return replaceSharedUtilityPlaceholders(rsvpJs);
}

export function generate(): void {
    const postEventReportBody = `
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
    const eventTitle = String(event.get("title") || "");
    const subject = sanitizeEmailSubject(
        commSettings.reportSubjectTemplate
            .replace(/{eventTitle}/g, () => eventTitle)
            .replace(/{eventDate}/g, () => eventDateStr)
    );
    const body = renderAttendanceReportBody({
        eventTitle: event.get("title"),
        eventDate: eventDateStr,
        attendanceRate: attendanceRate,
        presentCount: present,
        totalCount: total,
        mailingAddress: commSettings.mailingAddress
    });

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
});`;

    const processQueueBody = `
console.log("[Cron Engine] Evaluating pending outbound message matrices...");
processEmailQueue($app);`;

    const createHookBody = `
try {
    const record = e?.record;
    if (record && shouldQueueMessage(record)) {
        enqueueBulkMessage($app, record);
        processEmailQueue($app);
    }
} catch (hookErr) {
    console.log("[Hook Error] onRecordAfterCreateSuccess: " + hookErr);
}`;

    const updateHookBody = `
try {
    const record = e?.record;
    const original = (e.record && typeof e.record.originalCopy === 'function') ? e.record.originalCopy() : e.originalCopy;
    const oldStatus = original ? original.get("status") : "";
    if (record && shouldQueueMessage(record, oldStatus)) {
        enqueueBulkMessage($app, record);
        processEmailQueue($app);
    }
} catch (hookErr) {
    console.log("[Hook Error] onRecordAfterUpdateSuccess: " + hookErr);
}`;

    const auditionCreateHookBody = `
try {
    const audition = e?.record;
    if (!audition) return;

    const contact = audition.get("contact") || "";
    const isEmail = contact.includes("@") && contact.includes(".");

    function getChoirTimezone() {
        let timezone = "America/New_York";
        try {
            const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
            if (tzSetting) {
                const tzP = parseJsonField(tzSetting.get("value"));
                if (typeof tzP === "string") {
                    timezone = tzP;
                } else if (typeof tzP === "object" && tzP && tzP.timezone) {
                    timezone = tzP.timezone;
                }
            }
        } catch (err) {}
        return timezone;
    }

    function formatSlotFriendly(slot) {
        if (!slot) return "";
        try {
            const d = new Date(slot);
            if (isNaN(d.getTime())) return slot;

            const timezone = getChoirTimezone();
            const dateStr = formatInTimezone(d, timezone, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = formatInTimezone(d, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
            
            if (dateStr && timeStr) {
                return dateStr + " at " + timeStr;
            }
        } catch (err) {}
        return slot;
    }

    const requestedSlotsRaw = audition.get("requestedSlots");
    const requestedSlots = parseJsonField(requestedSlotsRaw);
    
    let formattedTimeSlots = "Any";
    if (Array.isArray(requestedSlots) && requestedSlots.length > 0) {
        const formattedList = requestedSlots.map(function(slot) {
            return "- " + formatSlotFriendly(slot);
        });
        formattedTimeSlots = "\\n" + formattedList.join("\\n");
    } else {
        const legacySlot = audition.get("scheduledTimeSlot") || audition.get("timeSlot") || "";
        if (legacySlot) {
            formattedTimeSlots = formatSlotFriendly(legacySlot);
        }
    }

    const eventId = audition.get("performance") || "";

    if (isEmail) {
        const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Confirmation' && isSystemTemplate = true");
        if (template) {
            const queueCollection = $app.findCollectionByNameOrId("emailQueue");
            let rawContent = template.get("content") || "";
            rawContent = rawContent.replace(/{timeSlot}/g, formattedTimeSlots);

            const queueRecord = new Record(queueCollection, {
                recipientId: audition.id,
                recipientEmail: contact.trim(),
                recipientName: audition.get("name") || "Singer",
                subject: template.get("subject") || "",
                rawContent: rawContent,
                status: "Pending",
                attempts: 0,
                filters: JSON.stringify({ 
                    eventId: eventId, 
                    type: "Automated Confirmation" 
                })
            });

            $app.save(queueRecord);
        }
    }

    // Admin Notification Logic
    try {
        const auditionSettings = $app.findFirstRecordByFilter("appSettings", "key = 'auditions'");
        const settingsParsed = parseJsonField(auditionSettings.get("value"));
        if (settingsParsed && settingsParsed.adminNotifyEnabled && Array.isArray(settingsParsed.adminNotifyUsers) && settingsParsed.adminNotifyUsers.length > 0) {
            let frontendUrl = "http://localhost:5173";
            try {
                const commSetting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
                const commParsed = parseJsonField(commSetting.get("value"));
                if (commParsed && commParsed.frontendUrl) {
                    frontendUrl = commParsed.frontendUrl.replace(/\\/+$/, "");
                }
            } catch (err) {}

            let targetPerfName = "None";
            if (eventId) {
                try {
                    const perfRecord = $app.findRecordById("events", eventId);
                    if (perfRecord) {
                        targetPerfName = perfRecord.get("title") || "None";
                    }
                } catch (err) {}
            }

            const cleanSlots = formattedTimeSlots.replace(/\\n/g, "<br/>");
            const adminEmailBody = [
                "<p>A new audition inquiry has been submitted.</p>",
                "<ul>",
                "  <li><strong>Name:</strong> " + escapeHtml(audition.get("name") || "") + "</li>",
                "  <li><strong>Contact:</strong> " + escapeHtml(contact) + "</li>",
                "  <li><strong>Voice Part:</strong> " + escapeHtml(audition.get("voicePart") || "Not specified") + "</li>",
                "  <li><strong>Target Performance:</strong> " + escapeHtml(targetPerfName) + "</li>",
                "  <li><strong>Requested Slots:</strong><br/>" + cleanSlots + "</li>",
                "  <li><strong>Experience:</strong><br/>" + escapeHtml(audition.get("experience") || "None provided").replace(/\\n/g, "<br/>") + "</li>",
                "</ul>",
                "<p><a href=\\"" + frontendUrl + "/admin/auditions\\" style=\\"display:inline-block;padding:10px 16px;background-color:#1b4d3e;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;\\">Review Auditions Dashboard</a></p>"
            ].join("");

            const queueCollection = $app.findCollectionByNameOrId("emailQueue");

            for (let i = 0; i < settingsParsed.adminNotifyUsers.length; i++) {
                const adminId = settingsParsed.adminNotifyUsers[i];
                try {
                    const adminRecord = $app.findRecordById("users", adminId);
                    if (adminRecord && adminRecord.get("email")) {
                        const adminQueueRecord = new Record(queueCollection, {
                            recipientId: adminId,
                            recipientEmail: adminRecord.get("email"),
                            recipientName: adminRecord.get("name") || "Administrator",
                            subject: "New Audition Submission: " + (audition.get("name") || ""),
                            rawContent: adminEmailBody,
                            status: "Pending",
                            attempts: 0,
                            filters: JSON.stringify({
                                auditionId: audition.id,
                                type: "Admin Notification",
                                contentType: "html"
                            })
                            });
                        $app.save(adminQueueRecord);
                    }
                } catch (adminErr) {
                    console.log("[Audition Notification Error] Failed to query admin or save queue: " + adminErr);
                }
            }
        }
    } catch (settingsErr) {
        // Auditions settings not defined/found, or other configuration error
    }

    processEmailQueue($app);
} catch (err) {
    console.log("[Audition Confirmation/Notification Error] Failed to process hooks: " + err);
}`;

    const auditionUpdateHookBody = `
try {
    const audition = e?.record;
    if (!audition) return;

    const currentStatus = audition.get("status");

    if (currentStatus === "Scheduled") {
        const contact = audition.get("contact") || "";
        const isEmail = contact.includes("@") && contact.includes(".");

        if (isEmail) {
            const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Scheduled' && isSystemTemplate = true");
            if (!template) return;

            const eventId = audition.get("performance") || "";
            const timeSlotVal = audition.get("scheduledTimeSlot") || audition.get("timeSlot") || "";
            
            function getChoirTimezone() {
                let timezone = "America/New_York";
                try {
                    const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
                    if (tzSetting) {
                        const tzP = parseJsonField(tzSetting.get("value"));
                        if (typeof tzP === "string") {
                            timezone = tzP;
                        } else if (typeof tzP === "object" && tzP && tzP.timezone) {
                            timezone = tzP.timezone;
                        }
                    }
                } catch (err) {}
                return timezone;
            }

            function formatSlotFriendly(slot) {
                if (!slot) return "";
                try {
                    const d = new Date(slot);
                    if (isNaN(d.getTime())) return slot;

                    const timezone = getChoirTimezone();
                    const dateStr = formatInTimezone(d, timezone, { month: 'short', day: 'numeric', year: 'numeric' });
                    const timeStr = formatInTimezone(d, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                    
                    if (dateStr && timeStr) {
                        return dateStr + " at " + timeStr;
                    }
                } catch (err) {}
                return slot;
            }

            const formattedTimeSlot = timeSlotVal ? formatSlotFriendly(timeSlotVal) : "Any";
            
            let rawContent = template.get("content") || "";
            rawContent = rawContent.replace(/{timeSlot}/g, formattedTimeSlot);

            // Check if we already enqueued this scheduled email for this audition to prevent duplicates
            const existing = $app.findRecordsByFilter(
                "emailQueue",
                "recipientId = {:auditionId} && subject = {:subject} && rawContent = {:rawContent}",
                "",
                1,
                0,
                { auditionId: audition.id, subject: template.get("subject") || "", rawContent: rawContent }
            );

            if (existing && existing.length > 0) {
                return; // Email already enqueued
            }

            const queueCollection = $app.findCollectionByNameOrId("emailQueue");
            const queueRecord = new Record(queueCollection, {
                recipientId: audition.id,
                recipientEmail: contact.trim(),
                recipientName: audition.get("name") || "Singer",
                subject: template.get("subject") || "",
                rawContent: rawContent,
                status: "Pending",
                attempts: 0,
                filters: JSON.stringify({ 
                    eventId: eventId, 
                    auditionId: audition.id,
                    type: "Automated Confirmation" 
                })
            });

            $app.save(queueRecord);
            processEmailQueue($app);
        }
    }
} catch (err) {
    console.log("[Audition Scheduled Error] Failed to enqueue email: " + err);
}`;

    const queueProcessBody = `
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
return e.json(200, { success: true });`;

    const queueSettingsBody = `
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

return e.json(200, { secret: token });`;

    const queueSettingsGenerateBody = `
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
return e.json(200, { secret: newSecret });`;

    const testSmtpBody = `
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
} catch (err) { return e.json(500, { error: "SMTP failed" }); }`;

    const mainPbJs = `
// PocketBase Backend Hooks - SOURCE GENERATED (DO NOT EDIT DIRECTLY)
// Source: pocketbase/pb_hooks_src/

// --- CRON JOBS ---

${renderCron('post_event_report', '0 * * * *', postEventReportBody)}

${renderCron('process_email_queue_job', '*/2 * * * *', processQueueBody)}

// --- RECORD HOOKS ---

${renderRecordHook('onRecordAfterCreateSuccess', 'messages', createHookBody)}

${renderRecordHook('onRecordAfterUpdateSuccess', 'messages', updateHookBody)}

${renderRecordHook('onRecordAfterCreateSuccess', 'auditions', auditionCreateHookBody)}

${renderRecordHook('onRecordAfterUpdateSuccess', 'auditions', auditionUpdateHookBody)}

// --- CUSTOM ENDPOINTS ---

${buildRsvpRoutes()}

${renderRoute('POST', '/api/queue/process', queueProcessBody)}

${renderRoute('GET', '/api/admin/queue-settings', queueSettingsBody)}

${renderRoute('POST', '/api/admin/queue-settings/generate', queueSettingsGenerateBody)}

${renderRoute('POST', '/api/test-smtp', testSmtpBody)}

${renderRoute('GET', '/api/calendar/download', 'return handleCalendarDownload(e);')}

${renderRoute('GET', '/api/calendar/feed', 'return handleCalendarFeed(e);')}

${renderRoute('GET', '/api/singer/calendar-feed-url', 'return handleCalendarFeedUrl(e);')}

${renderRoute('POST', '/api/singer/calendar-feed-url/reset', 'return handleCalendarFeedReset(e);')}

${renderRoute('GET', '/api/singer/seating-profiles', 'return handleSingerSeatingProfiles(e);')}
`.trim();

    fs.writeFileSync(OUTPUT_FILE, `${mainPbJs}\n`);
    console.log('Successfully generated pocketbase/pb_hooks/main.pb.js');
}

function isMainModule(): boolean {
    return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
    generate();
}
