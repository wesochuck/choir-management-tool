// PocketBase Backend Hooks - Unified Communication Platform

// --- UTILITIES ---

/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str) return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}

/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url) return "http://localhost:5173";
    let cleaned = url.trim();
    return cleaned.endsWith("/") ? cleaned.slice(0, -1) : cleaned;
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 */
function decodeGoBytes(val) {
    if (!val) return "";
    if (typeof val === 'string') return val;
    try {
        if (typeof val === 'object' && val.length !== undefined) {
            let str = "";
            for (let i = 0; i < val.length; i++) {
                str += String.fromCharCode(val[i]);
            }
            return str;
        }
    } catch (err) {}
    return JSON.stringify(val);
}

/**
 * Safely parses a JSON field from a PocketBase record.
 */
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

// --- CORE DISPATCH LOGIC ---

/**
 * Dispatches emails to recipients using system SMTP.
 */
function dispatchEmails(subject, content, recipients, recordId, filters) {
    console.log("[Email] Attempting dispatch for " + recordId + " to " + recipients.length + " recipients");
    
    // 1. Resolve 'From' Address & Name from System Settings
    const systemSettings = $app.settings();
    const fromAddress = systemSettings.meta.senderAddress || "no-reply@choir.management";
    const fromName = systemSettings.meta.senderName || "Choir Management Tool";

    // 2. Fetch Secret for HMAC
    let secret = "";
    try {
        const secretRecord = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(secretRecord.get("value"));
        secret = parsed ? parsed.secret : "";
    } catch (err) {
        console.log("[Email Warning] HMAC_SECRET not found, links may be limited.");
    }

    // 3. Resolve Base URL & Mailing Address from App Settings
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const p = parseJsonField(setting.get("value"));
        if (p) {
            if (p.frontendUrl) baseUrl = p.frontendUrl;
            if (p.mailingAddress) mailingAddress = p.mailingAddress;
        }
    } catch (e) {}
    baseUrl = normalizeBaseUrl(baseUrl);

    // 4. Fetch Event details for placeholder resolution (if eventId is in filters)
    let event = null;
    if (filters && filters.eventId) {
        try {
            event = $app.findRecordById("events", filters.eventId);
        } catch (e) {
            console.log("[Email Warning] Event " + filters.eventId + " not found for placeholder resolution.");
        }
    }

    let successCount = 0;
    let errorCount = 0;

    recipients.forEach((r, idx) => {
        const email = r.email;
        if (!email) {
            console.log("[Email Skip] Recipient at index " + idx + " has no email address.");
            return;
        }

        let finalSubject = subject;
        let finalContent = content;

        // --- PLACEHOLDER RESOLUTION ---

        // Recipient Name
        const singerName = r.name || "Singer";
        finalSubject = finalSubject.replace(/{singerName}/g, sanitizeEmailSubject(singerName));
        finalContent = finalContent.replace(/{singerName}/g, escapeHtml(singerName));

        // Event Context
        if (event) {
            const eventDateObj = new Date(event.get("date"));
            const eventDateStr = (eventDateObj.getMonth() + 1) + "/" + eventDateObj.getDate() + "/" + eventDateObj.getFullYear() + ", " + eventDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const eventTitle = event.get("title") || event.get("type") || "Event";
            const eventType = event.get("type") || "Performance";
            const eventDetails = event.get("details") || "";

            let eventLocation = "TBD";
            try {
                const venueRecord = $app.findRecordById("venues", event.get("venue"));
                eventLocation = venueRecord.get("name") || "TBD";
            } catch (e) {}

            finalSubject = finalSubject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                                     .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                                     .replace(/{eventDate}/g, sanitizeEmailSubject(eventDateStr))
                                     .replace(/{eventLocation}/g, sanitizeEmailSubject(eventLocation))
                                     .replace(/{eventDetails}/g, sanitizeEmailSubject(eventDetails));

            finalContent = finalContent.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                                     .replace(/{eventType}/g, escapeHtml(eventType))
                                     .replace(/{eventDate}/g, escapeHtml(eventDateStr))
                                     .replace(/{eventLocation}/g, escapeHtml(eventLocation))
                                     .replace(/{eventDetails}/g, escapeHtml(eventDetails));
        }

        // Compliance: Mailing Address
        finalContent = finalContent.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));

        // Compliance: Personalized Unsubscribe Link
        if (finalContent.includes("{{UNSUBSCRIBE_LINK}}") && secret) {
            const payload = `p=${r.id}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            const link = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
            finalContent = finalContent.replace(/{{UNSUBSCRIBE_LINK}}/g, link);
        }

        // RSVP Buttons
        if ((finalContent.includes("{{RSVP_LINKS}}") || finalContent.includes("{rsvpLinks}")) && secret && event) {
            const payload = `e=${event.id}&p=${r.id}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
            const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
            
            const rsvpHtml = `
                <div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center;">
                    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
                    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
                </div>
            `;
            finalContent = finalContent.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
        }

        // Final delivery
        try {
            const message = new MailerMessage({
                from: { address: fromAddress, name: fromName },
                to:      [{ address: email }],
                subject: finalSubject,
                html:    finalContent.replace(/\n/g, "<br>"),
            });
            $app.newMailClient().send(message);
            successCount++;
        } catch (err) {
            console.log("[Email Error] Failed to send to " + email + ": " + err);
            errorCount++;
        }
    });

    console.log("[Email] Dispatch complete for " + recordId + ". Success: " + successCount + ", Fail: " + errorCount);
}

// --- CRON JOBS ---

// Post-Event Attendance Reports
cronAdd("post_event_report", "0 * * * *", () => {
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
        if (parsed) commSettings = { ...commSettings, ...parsed };
    } catch (e) {}

    events.forEach(event => {
        const rosters = $app.findRecordsByFilter("eventRosters", "event = {:eventId}", "profile.name", 500, 0, { eventId: event.id });
        if (!rosters || rosters.length === 0) return;

        const total = rosters.length;
        const present = rosters.filter(r => r.get("attendance") === "Present").length;
        const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
        const eventDateObj = new Date(event.get("date"));
        const eventDateStr = (eventDateObj.getMonth() + 1) + "/" + eventDateObj.getDate() + "/" + eventDateObj.getFullYear();
        
        const subject = sanitizeEmailSubject(commSettings.reportSubjectTemplate.replace(/{eventTitle}/g, event.get("title")).replace(/{eventDate}/g, eventDateStr));
        const body = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
                <h2>Attendance Report</h2>
                <p>Event: ${escapeHtml(event.get("title"))}</p>
                <p>Date: ${escapeHtml(eventDateStr)}</p>
                <p>Attendance Rate: ${attendanceRate}% (${present}/${total} present)</p>
                <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
                <div style="font-size: 12px; color: #94a3b8; text-align: center;">
                    <p style="margin: 0 0 10px 0;">${escapeHtml(commSettings.mailingAddress)}</p>
                    <p>Choir Management Tool</p>
                </div>
            </div>
        `;

        admins.forEach(admin => {
            try {
                const message = new MailerMessage({
                    from: { address: $app.settings().meta.senderAddress || "no-reply@choir.management", name: "Choir Management Tool" },
                    to: [{ address: admin.get("email") }],
                    subject: subject,
                    html: body
                });
                $app.newMailClient().send(message);
            } catch (e) {}
        });

        // Save log
        try {
            const messageCollection = $app.findCollectionByNameOrId("messages");
            const record = new Record(messageCollection, {
                subject,
                content: body,
                type: "Email",
                status: "Sent",
                recipients: admins.map(a => ({ id: a.id, name: a.get("name") || "Admin", email: a.get("email") })),
                filters: { alreadySent: true, type: "Automated Report", eventId: event.id }
            });
            $app.save(record);
        } catch (e) {}
    });
});

// --- RECORD HOOKS ---

// Automated Email Delivery on Message Creation
onRecordAfterCreateSuccess((e) => {
    try {
        const record = e?.record;
        if (!record) return;

        const status = record.get("status") || "Sent";
        console.log("[Hook] onRecordAfterCreateSuccess for " + record.id + " with status: " + status);
        
        if (status === "Draft") {
            console.log("[Hook] Message " + record.id + " is a draft. Skipping dispatch.");
            return;
        }

        const type = record.get("type");
        if (type !== "Email" && type !== "Both") {
            console.log("[Hook] Message " + record.id + " type is " + type + ". Skipping email dispatch.");
            return;
        }

        const filters = parseJsonField(record.get("filters")) || {};
        if (filters.alreadySent === true) {
            console.log("[Hook] Message " + record.id + " already marked as sent in filters. Skipping.");
            return;
        }

        const subject = record.get("subject") || "Message from Choir Management";
        const content = record.get("content") || "";
        const recipients = parseJsonField(record.get("recipients")) || [];

        if (recipients.length > 0) {
            dispatchEmails(subject, content, recipients, record.id, filters);
        } else {
            console.log("[Hook Error] Message " + record.id + " has no recipients.");
        }
    } catch (hookErr) {
        console.log("[Hook Error] onRecordAfterCreateSuccess failed: " + hookErr);
    }
}, "messages");

// Handle status transitions (Draft -> Sent)
onRecordAfterUpdateSuccess((e) => {
    try {
        const record = e?.record;
        if (!record) return;

        const status = record.get("status");
        const original = e.originalCopy;
        const oldStatus = original ? original.get("status") : "";

        console.log("[Hook] onRecordAfterUpdateSuccess for " + record.id + ". Status transition: " + oldStatus + " -> " + status);

        if (status === "Sent" && oldStatus === "Draft") {
            const type = record.get("type");
            if (type !== "Email" && type !== "Both") return;

            const subject = record.get("subject") || "Message from Choir Management";
            const content = record.get("content") || "";
            const recipients = parseJsonField(record.get("recipients")) || [];
            const filters = parseJsonField(record.get("filters")) || {};

            if (recipients.length > 0) {
                dispatchEmails(subject, content, recipients, record.id, filters);
            } else {
                console.log("[Hook Error] Updated message " + record.id + " has no recipients.");
            }
        }
    } catch (hookErr) {
        console.log("[Hook Error] onRecordAfterUpdateSuccess failed: " + hookErr);
    }
}, "messages");

// SMTP Connection Test Custom Endpoint
routerAdd("POST", "/api/test-smtp", (e) => {
    try {
        const authRecord = e.auth;
        if (!authRecord || authRecord.get("role") !== "admin") {
            return e.json(403, { error: "Forbidden: Admins only" });
        }

        const data = e.requestInfo().body;
        const testEmail = data.email;
        if (!testEmail) return e.json(400, { error: "Missing destination email address." });

        const settings = $app.settings();
        if (!settings.smtp.enabled) {
            return e.json(400, { error: "SMTP is not enabled in PocketBase Admin UI." });
        }

        try {
            const message = new MailerMessage({
                from: { address: settings.meta.senderAddress || "no-reply@choir.management", name: "Choir Management Tool" },
                to: [{ address: testEmail }],
                subject: "SMTP Connection Test Successful!",
                html: "<p>Your server SMTP configuration is working perfectly!</p>",
            });
            $app.newMailClient().send(message);
        } catch (sendErr) {
            return e.json(500, { error: "SMTP Connection failed: " + sendErr.message });
        }

        return e.json(200, { success: true });
    } catch (err) {
        return e.json(500, { error: "Internal Server Error: " + err.message });
    }
});
