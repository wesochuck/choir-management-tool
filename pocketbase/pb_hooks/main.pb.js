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
    return String(url).trim().replace(/\/+$/g, "");
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val) return "";
    if (typeof val === 'string') return val;

    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            } catch (err) {}
        }
        return val;
    }

    return String(val);
}

/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val) return null;
    const decoded = decodeGoBytes(val);
    if (!decoded) return null;

    if (typeof decoded === 'object') return decoded;

    try {
        return JSON.parse(decoded);
    } catch (err) {
        return null;
    }
}

// --- CORE DISPATCH LOGIC ---

/**
 * Dispatches emails to recipients using system SMTP.
 */
function dispatchEmails(subject, content, recipients, recordId, filters) {
    console.log("[Email] Starting dispatch for " + recordId + ". Recipients: " + recipients.length);
    
    const settings = $app.settings();
    const fromAddress = settings.meta.senderAddress || "no-reply@choir.management";
    const fromName = settings.meta.senderName || "Choir Management Tool";

    let secret = "";
    try {
        const secretRecord = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(secretRecord.get("value"));
        secret = parsed ? parsed.secret : "";
    } catch (err) {}

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

    let event = null;
    if (filters && filters.eventId) {
        try {
            event = $app.findRecordById("events", filters.eventId);
        } catch (e) {}
    }

    let successCount = 0;
    let errorCount = 0;

    recipients.forEach((r, idx) => {
        const email = r.email;
        if (!email) {
            console.log("[Email Skip] No email for " + (r.name || idx));
            return;
        }

        let finalSubject = subject;
        let finalContent = content;

        // --- PLACEHOLDER RESOLUTION ---
        const singerName = r.name || "Singer";
        finalSubject = finalSubject.replace(/{singerName}/g, sanitizeEmailSubject(singerName));

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

        // Compliance & Buttons
        finalContent = finalContent.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
        if (finalContent.includes("{{UNSUBSCRIBE_LINK}}") && secret) {
            const payload = `p=${r.id}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            finalContent = finalContent.replace(/{{UNSUBSCRIBE_LINK}}/g, `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`);
        }
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

        const htmlBody = finalContent
            .replace(/{singerName}/g, escapeHtml(singerName))
            .replace(/\n/g, "<br>");

        try {
            const message = new MailerMessage({
                from: { address: fromAddress, name: fromName },
                to: [{ address: email }],
                subject: finalSubject,
                html: htmlBody
            });
            $app.newMailClient().send(message);
            successCount++;
        } catch (err) {
            console.log("[Email Error] Failed to send to " + email + ": " + err);
            errorCount++;
        }
    });

    console.log("[Email] Finished dispatch. Success: " + successCount + ", Fail: " + errorCount);
}

// --- CRON JOBS ---

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
        if (parsed) {
            if (parsed.mailingAddress) commSettings.mailingAddress = parsed.mailingAddress;
            if (parsed.reportSubjectTemplate) commSettings.reportSubjectTemplate = parsed.reportSubjectTemplate;
            if (parsed.reportBodyTemplate) commSettings.reportBodyTemplate = parsed.reportBodyTemplate;
        }
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

onRecordAfterCreateSuccess((e) => {
    function decodeGoBytes(val) {
        if (!val) return "";
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
            if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
                try {
                    let str = "";
                    for (let i = 0; i < val.length; i++) {
                        str += String.fromCharCode(val[i]);
                    }
                    return str;
                } catch (err) {}
            }
            return val;
        }
        return String(val);
    }

    function parseJsonField(val) {
        if (!val) return null;
        const decoded = decodeGoBytes(val);
        if (!decoded) return null;
        if (typeof decoded === 'object') return decoded;
        try {
            return JSON.parse(decoded);
        } catch (err) {
            return null;
        }
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function sanitizeEmailSubject(str) {
        if (!str) return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }

    function normalizeBaseUrl(url) {
        if (!url) return "http://localhost:5173";
        return String(url).trim().replace(/\/+$/g, "");
    }

    function dispatchEmails(subject, content, recipients, recordId, filters) {
        console.log("[Email] Starting dispatch for " + recordId + ". Recipients: " + recipients.length);
        const settings = $app.settings();
        const fromAddress = settings.meta.senderAddress || "no-reply@choir.management";
        const fromName = settings.meta.senderName || "Choir Management Tool";
        let secret = "";
        try {
            const secretRecord = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(secretRecord.get("value"));
            secret = parsed ? parsed.secret : "";
        } catch (err) {}

        let baseUrl = "http://localhost:5173";
        let mailingAddress = "123 Choir St, Harmony City, HC 12345";
        try {
            const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
            const p = parseJsonField(setting.get("value"));
            if (p) {
                if (p.frontendUrl) baseUrl = p.frontendUrl;
                if (p.mailingAddress) mailingAddress = p.mailingAddress;
            }
        } catch (settingsErr) {}
        baseUrl = normalizeBaseUrl(baseUrl);

        let event = null;
        if (filters && filters.eventId) {
            try {
                event = $app.findRecordById("events", filters.eventId);
            } catch (eventErr) {}
        }

        let successCount = 0;
        let errorCount = 0;
        recipients.forEach((r, idx) => {
            const email = r.email;
            if (!email) {
                console.log("[Email Skip] No email for " + (r.name || idx));
                return;
            }

            let finalSubject = subject;
            let finalContent = content;
            const singerName = r.name || "Singer";
            finalSubject = finalSubject.replace(/{singerName}/g, sanitizeEmailSubject(singerName));

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
                } catch (venueErr) {}

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

            finalContent = finalContent.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (finalContent.includes("{{UNSUBSCRIBE_LINK}}") && secret) {
                const payload = `p=${r.id}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                finalContent = finalContent.replace(/{{UNSUBSCRIBE_LINK}}/g, `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`);
            }
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

            const htmlBody = finalContent
                .replace(/{singerName}/g, escapeHtml(singerName))
                .replace(/\n/g, "<br>");

            try {
                const message = new MailerMessage({
                    from: { address: fromAddress, name: fromName },
                    to: [{ address: email }],
                    subject: finalSubject,
                    html: htmlBody
                });
                $app.newMailClient().send(message);
                successCount++;
            } catch (sendErr) {
                console.log("[Email Error] Failed to send to " + email + ": " + sendErr);
                errorCount++;
            }
        });
        console.log("[Email] Finished dispatch. Success: " + successCount + ", Fail: " + errorCount);
    }

    try {
        const record = e && e.record;
        if (!record) return;

        const status = record.get("status") || "Sent";
        if (status === "Draft") return;

        const type = record.get("type");
        if (type !== "Email" && type !== "Both") return;

        const filters = parseJsonField(record.get("filters")) || {};
        if (filters.alreadySent === true) return;

        const subject = record.get("subject") || "Message from Choir Management";
        const content = record.get("content") || "";
        const recipients = parseJsonField(record.get("recipients")) || [];

        if (recipients && recipients.length > 0) {
            dispatchEmails(subject, content, recipients, record.id, filters);
        }
    } catch (hookErr) {
        console.log("[Hook Error] onRecordAfterCreateSuccess: " + hookErr);
    }
}, "messages");

onRecordAfterUpdateSuccess((e) => {
    function decodeGoBytes(val) {
        if (!val) return "";
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
            if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
                try {
                    let str = "";
                    for (let i = 0; i < val.length; i++) {
                        str += String.fromCharCode(val[i]);
                    }
                    return str;
                } catch (err) {}
            }
            return val;
        }
        return String(val);
    }

    function parseJsonField(val) {
        if (!val) return null;
        const decoded = decodeGoBytes(val);
        if (!decoded) return null;
        if (typeof decoded === 'object') return decoded;
        try {
            return JSON.parse(decoded);
        } catch (err) {
            return null;
        }
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function sanitizeEmailSubject(str) {
        if (!str) return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }

    function normalizeBaseUrl(url) {
        if (!url) return "http://localhost:5173";
        return String(url).trim().replace(/\/+$/g, "");
    }

    function dispatchEmails(subject, content, recipients, recordId, filters) {
        console.log("[Email] Starting dispatch for " + recordId + ". Recipients: " + recipients.length);
        const settings = $app.settings();
        const fromAddress = settings.meta.senderAddress || "no-reply@choir.management";
        const fromName = settings.meta.senderName || "Choir Management Tool";
        let secret = "";
        try {
            const secretRecord = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(secretRecord.get("value"));
            secret = parsed ? parsed.secret : "";
        } catch (err) {}

        let baseUrl = "http://localhost:5173";
        let mailingAddress = "123 Choir St, Harmony City, HC 12345";
        try {
            const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
            const p = parseJsonField(setting.get("value"));
            if (p) {
                if (p.frontendUrl) baseUrl = p.frontendUrl;
                if (p.mailingAddress) mailingAddress = p.mailingAddress;
            }
        } catch (settingsErr) {}
        baseUrl = normalizeBaseUrl(baseUrl);

        let event = null;
        if (filters && filters.eventId) {
            try {
                event = $app.findRecordById("events", filters.eventId);
            } catch (eventErr) {}
        }

        let successCount = 0;
        let errorCount = 0;
        recipients.forEach((r, idx) => {
            const email = r.email;
            if (!email) {
                console.log("[Email Skip] No email for " + (r.name || idx));
                return;
            }

            let finalSubject = subject;
            let finalContent = content;
            const singerName = r.name || "Singer";
            finalSubject = finalSubject.replace(/{singerName}/g, sanitizeEmailSubject(singerName));

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
                } catch (venueErr) {}

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

            finalContent = finalContent.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (finalContent.includes("{{UNSUBSCRIBE_LINK}}") && secret) {
                const payload = `p=${r.id}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                finalContent = finalContent.replace(/{{UNSUBSCRIBE_LINK}}/g, `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`);
            }
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

            const htmlBody = finalContent
                .replace(/{singerName}/g, escapeHtml(singerName))
                .replace(/\n/g, "<br>");

            try {
                const message = new MailerMessage({
                    from: { address: fromAddress, name: fromName },
                    to: [{ address: email }],
                    subject: finalSubject,
                    html: htmlBody
                });
                $app.newMailClient().send(message);
                successCount++;
            } catch (sendErr) {
                console.log("[Email Error] Failed to send to " + email + ": " + sendErr);
                errorCount++;
            }
        });
        console.log("[Email] Finished dispatch. Success: " + successCount + ", Fail: " + errorCount);
    }

    try {
        const record = e && e.record;
        if (!record) return;

        const status = record.get("status");
        const original = e.originalCopy;
        const oldStatus = original ? original.get("status") : "";

        if (status === "Sent" && oldStatus === "Draft") {
            const type = record.get("type");
            if (type !== "Email" && type !== "Both") return;

            const subject = record.get("subject") || "Message from Choir Management";
            const content = record.get("content") || "";
            const recipients = parseJsonField(record.get("recipients")) || [];
            const filters = parseJsonField(record.get("filters")) || {};

            if (recipients && recipients.length > 0) {
                dispatchEmails(subject, content, recipients, record.id, filters);
            }
        }
    } catch (hookErr) {
        console.log("[Hook Error] onRecordAfterUpdateSuccess: " + hookErr);
    }
}, "messages");

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
