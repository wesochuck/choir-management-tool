// PocketBase Backend Hooks - SOURCE GENERATED (DO NOT EDIT DIRECTLY)
// Generated on: 2026-05-23T14:12:39.060Z

// --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url)
        return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}
/**
 * Formats a date string in a specific timezone using Intl.
 */
function formatInTimezone(date, timezone, options) {
    if (!date)
        return "";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    try {
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours = -5; // Default to America/New_York (EST)
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        // Determine if DST (Daylight Saving Time) is active in the US
        // DST starts 2nd Sunday of March, ends 1st Sunday of November
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0); // ~2 AM EST
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0); // ~2 AM EDT
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.includes("chicago") || tz.includes("central")) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        }
        else {
            // Default: America/New_York (Eastern)
            offsetHours = isDst ? -4 : -5;
        }
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
        const localDate = new Date(localTimeMs);
        // Format manually using the shifted localDate components
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const wday = weekdays[localDate.getUTCDay()];
        const wdayFull = weekdaysFull[localDate.getUTCDay()];
        const mon = months[localDate.getUTCMonth()];
        const monFull = monthsFull[localDate.getUTCMonth()];
        const day = localDate.getUTCDate();
        const yr = localDate.getUTCFullYear();
        let hr = localDate.getUTCHours();
        const ampm = hr >= 12 ? "PM" : "AM";
        hr = hr % 12;
        if (hr === 0)
            hr = 12;
        const minVal = localDate.getUTCMinutes();
        const min = minVal < 10 ? "0" + minVal : String(minVal);
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
        }
        // Case 4: Date only: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val)
        return "";
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            catch {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val)
        return null;
    const decoded = decodeGoBytes(val);
    if (!decoded)
        return null;
    if (typeof decoded === 'object')
        return decoded;
    try {
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}

/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">$1</a>');
    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList)
        processedLines.push("</ul>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul"))
            return block;
        if (block.trim().startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
function shouldQueueMessage(record, oldStatus) {
    if (!record)
        return false;
    const status = record.get("status") || "Sent";
    if (status === "Draft")
        return false;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both")
        return false;
    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return status === "Sent" && oldStatus === "Draft";
    }
    return true;
}
/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
function enqueueBulkMessage(app, record) {
    const queueCollection = app.findCollectionByNameOrId("emailQueue");
    const recipients = parseJsonField(record.get("recipients")) || [];
    const subject = record.get("subject") || "";
    const content = record.get("content") || "";
    const filters = parseJsonField(record.get("filters")) || {};
    recipients.forEach(recipient => {
        if (!recipient.email)
            return;
        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });
        app.save(queueRecord);
    });
}

/**
 * Renders the HTML body for the attendance report email.
 */
function renderAttendanceReportBody(data) {
    const safe = sanitizeHtmlTemplateData(data);
    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Choir Management Notification</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Retrieves Mailjet credentials from appSettings.
 */
function getMailjetConfig(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'mailjet'");
        const parsed = parseJsonField(record.get("value"));
        return {
            apiKey: parsed?.apiKey || "",
            apiSecret: parsed?.apiSecret || "",
            senderEmail: parsed?.senderEmail || "no-reply@choir.management",
            senderName: parsed?.senderName || "Choir Management Tool"
        };
    }
    catch (e) {
        return { apiKey: "", apiSecret: "", senderEmail: "", senderName: "" };
    }
}
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (err) {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue.
 */
function processEmailQueue(app) {
    const config = getMailjetConfig(app);
    if (!config.apiKey || !config.apiSecret) {
        console.log("[Queue Error] Mailjet configuration missing API keys.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "created", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async HTTP processing
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (e) { }
    baseUrl = normalizeBaseUrl(baseUrl);
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            }
            else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    }
    catch (e) { }
    records.forEach((record) => {
        try {
            const rawContent = record.get("rawContent") || "";
            const recipientId = record.get("recipientId");
            const recipientEmail = record.get("recipientEmail");
            const recipientName = record.get("recipientName") || "Singer";
            const filters = parseJsonField(record.get("filters")) || {};
            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch (e) { }
            }
            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (event) {
                const eventDate = event.get("date");
                const eventTitle = (event.get("title") || event.get("type") || "Event");
                const eventType = (event.get("type") || "Performance");
                const eventDetails = (event.get("details") || "");
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue"));
                    venueName = (venueRecord.get("name") || "TBD");
                }
                catch (e) { }
                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                    .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                    .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));
                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }
            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }
            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
            record.set("htmlBody", finalHtml);
            // Execute raw Mailjet REST request
            const authHeader = "Basic " + $security.base64Encode(config.apiKey + ":" + config.apiSecret);
            const response = $http.send({
                url: "https://api.mailjet.com/v3.1/send",
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Messages: [{
                            From: { Email: config.senderEmail, Name: config.senderName },
                            To: [{ Email: recipientEmail, Name: recipientName }],
                            Subject: subject,
                            HTMLPart: finalHtml
                        }]
                })
            });
            if (response.statusCode === 200 || response.statusCode === 201) {
                record.set("status", "Sent");
            }
            else {
                throw new Error("API responded with code " + response.statusCode + ": " + response.text);
            }
        }
        catch (err) {
            const currentAttempts = record.get("attempts") + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        }
        finally {
            app.save(record);
        }
    });
}

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
    const allowed = {};
    requiredKeys.forEach(k => { allowed[k] = true; });
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

// --- CRON JOBS ---

cronAdd("post_event_report", "0 * * * *", () => {
    // Shared Utils for Cron
    // --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url)
        return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}
/**
 * Formats a date string in a specific timezone using Intl.
 */
function formatInTimezone(date, timezone, options) {
    if (!date)
        return "";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    try {
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours = -5; // Default to America/New_York (EST)
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        // Determine if DST (Daylight Saving Time) is active in the US
        // DST starts 2nd Sunday of March, ends 1st Sunday of November
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0); // ~2 AM EST
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0); // ~2 AM EDT
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.includes("chicago") || tz.includes("central")) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        }
        else {
            // Default: America/New_York (Eastern)
            offsetHours = isDst ? -4 : -5;
        }
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
        const localDate = new Date(localTimeMs);
        // Format manually using the shifted localDate components
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const wday = weekdays[localDate.getUTCDay()];
        const wdayFull = weekdaysFull[localDate.getUTCDay()];
        const mon = months[localDate.getUTCMonth()];
        const monFull = monthsFull[localDate.getUTCMonth()];
        const day = localDate.getUTCDate();
        const yr = localDate.getUTCFullYear();
        let hr = localDate.getUTCHours();
        const ampm = hr >= 12 ? "PM" : "AM";
        hr = hr % 12;
        if (hr === 0)
            hr = 12;
        const minVal = localDate.getUTCMinutes();
        const min = minVal < 10 ? "0" + minVal : String(minVal);
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
        }
        // Case 4: Date only: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val)
        return "";
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            catch {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val)
        return null;
    const decoded = decodeGoBytes(val);
    if (!decoded)
        return null;
    if (typeof decoded === 'object')
        return decoded;
    try {
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}

/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">$1</a>');
    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList)
        processedLines.push("</ul>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul"))
            return block;
        if (block.trim().startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
function shouldQueueMessage(record, oldStatus) {
    if (!record)
        return false;
    const status = record.get("status") || "Sent";
    if (status === "Draft")
        return false;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both")
        return false;
    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return status === "Sent" && oldStatus === "Draft";
    }
    return true;
}
/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
function enqueueBulkMessage(app, record) {
    const queueCollection = app.findCollectionByNameOrId("emailQueue");
    const recipients = parseJsonField(record.get("recipients")) || [];
    const subject = record.get("subject") || "";
    const content = record.get("content") || "";
    const filters = parseJsonField(record.get("filters")) || {};
    recipients.forEach(recipient => {
        if (!recipient.email)
            return;
        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });
        app.save(queueRecord);
    });
}

/**
 * Renders the HTML body for the attendance report email.
 */
function renderAttendanceReportBody(data) {
    const safe = sanitizeHtmlTemplateData(data);
    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Choir Management Notification</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Retrieves Mailjet credentials from appSettings.
 */
function getMailjetConfig(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'mailjet'");
        const parsed = parseJsonField(record.get("value"));
        return {
            apiKey: parsed?.apiKey || "",
            apiSecret: parsed?.apiSecret || "",
            senderEmail: parsed?.senderEmail || "no-reply@choir.management",
            senderName: parsed?.senderName || "Choir Management Tool"
        };
    }
    catch (e) {
        return { apiKey: "", apiSecret: "", senderEmail: "", senderName: "" };
    }
}
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (err) {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue.
 */
function processEmailQueue(app) {
    const config = getMailjetConfig(app);
    if (!config.apiKey || !config.apiSecret) {
        console.log("[Queue Error] Mailjet configuration missing API keys.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "created", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async HTTP processing
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (e) { }
    baseUrl = normalizeBaseUrl(baseUrl);
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            }
            else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    }
    catch (e) { }
    records.forEach((record) => {
        try {
            const rawContent = record.get("rawContent") || "";
            const recipientId = record.get("recipientId");
            const recipientEmail = record.get("recipientEmail");
            const recipientName = record.get("recipientName") || "Singer";
            const filters = parseJsonField(record.get("filters")) || {};
            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch (e) { }
            }
            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (event) {
                const eventDate = event.get("date");
                const eventTitle = (event.get("title") || event.get("type") || "Event");
                const eventType = (event.get("type") || "Performance");
                const eventDetails = (event.get("details") || "");
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue"));
                    venueName = (venueRecord.get("name") || "TBD");
                }
                catch (e) { }
                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                    .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                    .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));
                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }
            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }
            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
            record.set("htmlBody", finalHtml);
            // Execute raw Mailjet REST request
            const authHeader = "Basic " + $security.base64Encode(config.apiKey + ":" + config.apiSecret);
            const response = $http.send({
                url: "https://api.mailjet.com/v3.1/send",
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Messages: [{
                            From: { Email: config.senderEmail, Name: config.senderName },
                            To: [{ Email: recipientEmail, Name: recipientName }],
                            Subject: subject,
                            HTMLPart: finalHtml
                        }]
                })
            });
            if (response.statusCode === 200 || response.statusCode === 201) {
                record.set("status", "Sent");
            }
            else {
                throw new Error("API responded with code " + response.statusCode + ": " + response.text);
            }
        }
        catch (err) {
            const currentAttempts = record.get("attempts") + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        }
        finally {
            app.save(record);
        }
    });
}

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
    const allowed = {};
    requiredKeys.forEach(k => { allowed[k] = true; });
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
    // --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url)
        return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}
/**
 * Formats a date string in a specific timezone using Intl.
 */
function formatInTimezone(date, timezone, options) {
    if (!date)
        return "";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    try {
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours = -5; // Default to America/New_York (EST)
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        // Determine if DST (Daylight Saving Time) is active in the US
        // DST starts 2nd Sunday of March, ends 1st Sunday of November
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0); // ~2 AM EST
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0); // ~2 AM EDT
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.includes("chicago") || tz.includes("central")) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        }
        else {
            // Default: America/New_York (Eastern)
            offsetHours = isDst ? -4 : -5;
        }
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
        const localDate = new Date(localTimeMs);
        // Format manually using the shifted localDate components
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const wday = weekdays[localDate.getUTCDay()];
        const wdayFull = weekdaysFull[localDate.getUTCDay()];
        const mon = months[localDate.getUTCMonth()];
        const monFull = monthsFull[localDate.getUTCMonth()];
        const day = localDate.getUTCDate();
        const yr = localDate.getUTCFullYear();
        let hr = localDate.getUTCHours();
        const ampm = hr >= 12 ? "PM" : "AM";
        hr = hr % 12;
        if (hr === 0)
            hr = 12;
        const minVal = localDate.getUTCMinutes();
        const min = minVal < 10 ? "0" + minVal : String(minVal);
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
        }
        // Case 4: Date only: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val)
        return "";
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            catch {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val)
        return null;
    const decoded = decodeGoBytes(val);
    if (!decoded)
        return null;
    if (typeof decoded === 'object')
        return decoded;
    try {
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}

/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">$1</a>');
    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList)
        processedLines.push("</ul>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul"))
            return block;
        if (block.trim().startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
function shouldQueueMessage(record, oldStatus) {
    if (!record)
        return false;
    const status = record.get("status") || "Sent";
    if (status === "Draft")
        return false;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both")
        return false;
    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return status === "Sent" && oldStatus === "Draft";
    }
    return true;
}
/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
function enqueueBulkMessage(app, record) {
    const queueCollection = app.findCollectionByNameOrId("emailQueue");
    const recipients = parseJsonField(record.get("recipients")) || [];
    const subject = record.get("subject") || "";
    const content = record.get("content") || "";
    const filters = parseJsonField(record.get("filters")) || {};
    recipients.forEach(recipient => {
        if (!recipient.email)
            return;
        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });
        app.save(queueRecord);
    });
}

/**
 * Renders the HTML body for the attendance report email.
 */
function renderAttendanceReportBody(data) {
    const safe = sanitizeHtmlTemplateData(data);
    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Choir Management Notification</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Retrieves Mailjet credentials from appSettings.
 */
function getMailjetConfig(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'mailjet'");
        const parsed = parseJsonField(record.get("value"));
        return {
            apiKey: parsed?.apiKey || "",
            apiSecret: parsed?.apiSecret || "",
            senderEmail: parsed?.senderEmail || "no-reply@choir.management",
            senderName: parsed?.senderName || "Choir Management Tool"
        };
    }
    catch (e) {
        return { apiKey: "", apiSecret: "", senderEmail: "", senderName: "" };
    }
}
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (err) {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue.
 */
function processEmailQueue(app) {
    const config = getMailjetConfig(app);
    if (!config.apiKey || !config.apiSecret) {
        console.log("[Queue Error] Mailjet configuration missing API keys.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "created", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async HTTP processing
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (e) { }
    baseUrl = normalizeBaseUrl(baseUrl);
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            }
            else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    }
    catch (e) { }
    records.forEach((record) => {
        try {
            const rawContent = record.get("rawContent") || "";
            const recipientId = record.get("recipientId");
            const recipientEmail = record.get("recipientEmail");
            const recipientName = record.get("recipientName") || "Singer";
            const filters = parseJsonField(record.get("filters")) || {};
            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch (e) { }
            }
            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (event) {
                const eventDate = event.get("date");
                const eventTitle = (event.get("title") || event.get("type") || "Event");
                const eventType = (event.get("type") || "Performance");
                const eventDetails = (event.get("details") || "");
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue"));
                    venueName = (venueRecord.get("name") || "TBD");
                }
                catch (e) { }
                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                    .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                    .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));
                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }
            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }
            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
            record.set("htmlBody", finalHtml);
            // Execute raw Mailjet REST request
            const authHeader = "Basic " + $security.base64Encode(config.apiKey + ":" + config.apiSecret);
            const response = $http.send({
                url: "https://api.mailjet.com/v3.1/send",
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Messages: [{
                            From: { Email: config.senderEmail, Name: config.senderName },
                            To: [{ Email: recipientEmail, Name: recipientName }],
                            Subject: subject,
                            HTMLPart: finalHtml
                        }]
                })
            });
            if (response.statusCode === 200 || response.statusCode === 201) {
                record.set("status", "Sent");
            }
            else {
                throw new Error("API responded with code " + response.statusCode + ": " + response.text);
            }
        }
        catch (err) {
            const currentAttempts = record.get("attempts") + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        }
        finally {
            app.save(record);
        }
    });
}

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
    const allowed = {};
    requiredKeys.forEach(k => { allowed[k] = true; });
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

    console.log("[Cron Engine] Evaluating pending outbound message matrices...");
    processEmailQueue($app);
});

// --- RECORD HOOKS ---

onRecordAfterCreateSuccess((e) => {
    // Shared Utils for Hook
    // --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url)
        return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}
/**
 * Formats a date string in a specific timezone using Intl.
 */
function formatInTimezone(date, timezone, options) {
    if (!date)
        return "";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    try {
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours = -5; // Default to America/New_York (EST)
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        // Determine if DST (Daylight Saving Time) is active in the US
        // DST starts 2nd Sunday of March, ends 1st Sunday of November
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0); // ~2 AM EST
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0); // ~2 AM EDT
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.includes("chicago") || tz.includes("central")) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        }
        else {
            // Default: America/New_York (Eastern)
            offsetHours = isDst ? -4 : -5;
        }
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
        const localDate = new Date(localTimeMs);
        // Format manually using the shifted localDate components
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const wday = weekdays[localDate.getUTCDay()];
        const wdayFull = weekdaysFull[localDate.getUTCDay()];
        const mon = months[localDate.getUTCMonth()];
        const monFull = monthsFull[localDate.getUTCMonth()];
        const day = localDate.getUTCDate();
        const yr = localDate.getUTCFullYear();
        let hr = localDate.getUTCHours();
        const ampm = hr >= 12 ? "PM" : "AM";
        hr = hr % 12;
        if (hr === 0)
            hr = 12;
        const minVal = localDate.getUTCMinutes();
        const min = minVal < 10 ? "0" + minVal : String(minVal);
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
        }
        // Case 4: Date only: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val)
        return "";
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            catch {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val)
        return null;
    const decoded = decodeGoBytes(val);
    if (!decoded)
        return null;
    if (typeof decoded === 'object')
        return decoded;
    try {
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}

/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">$1</a>');
    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList)
        processedLines.push("</ul>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul"))
            return block;
        if (block.trim().startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
function shouldQueueMessage(record, oldStatus) {
    if (!record)
        return false;
    const status = record.get("status") || "Sent";
    if (status === "Draft")
        return false;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both")
        return false;
    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return status === "Sent" && oldStatus === "Draft";
    }
    return true;
}
/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
function enqueueBulkMessage(app, record) {
    const queueCollection = app.findCollectionByNameOrId("emailQueue");
    const recipients = parseJsonField(record.get("recipients")) || [];
    const subject = record.get("subject") || "";
    const content = record.get("content") || "";
    const filters = parseJsonField(record.get("filters")) || {};
    recipients.forEach(recipient => {
        if (!recipient.email)
            return;
        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });
        app.save(queueRecord);
    });
}

/**
 * Renders the HTML body for the attendance report email.
 */
function renderAttendanceReportBody(data) {
    const safe = sanitizeHtmlTemplateData(data);
    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Choir Management Notification</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Retrieves Mailjet credentials from appSettings.
 */
function getMailjetConfig(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'mailjet'");
        const parsed = parseJsonField(record.get("value"));
        return {
            apiKey: parsed?.apiKey || "",
            apiSecret: parsed?.apiSecret || "",
            senderEmail: parsed?.senderEmail || "no-reply@choir.management",
            senderName: parsed?.senderName || "Choir Management Tool"
        };
    }
    catch (e) {
        return { apiKey: "", apiSecret: "", senderEmail: "", senderName: "" };
    }
}
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (err) {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue.
 */
function processEmailQueue(app) {
    const config = getMailjetConfig(app);
    if (!config.apiKey || !config.apiSecret) {
        console.log("[Queue Error] Mailjet configuration missing API keys.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "created", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async HTTP processing
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (e) { }
    baseUrl = normalizeBaseUrl(baseUrl);
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            }
            else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    }
    catch (e) { }
    records.forEach((record) => {
        try {
            const rawContent = record.get("rawContent") || "";
            const recipientId = record.get("recipientId");
            const recipientEmail = record.get("recipientEmail");
            const recipientName = record.get("recipientName") || "Singer";
            const filters = parseJsonField(record.get("filters")) || {};
            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch (e) { }
            }
            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (event) {
                const eventDate = event.get("date");
                const eventTitle = (event.get("title") || event.get("type") || "Event");
                const eventType = (event.get("type") || "Performance");
                const eventDetails = (event.get("details") || "");
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue"));
                    venueName = (venueRecord.get("name") || "TBD");
                }
                catch (e) { }
                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                    .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                    .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));
                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }
            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }
            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
            record.set("htmlBody", finalHtml);
            // Execute raw Mailjet REST request
            const authHeader = "Basic " + $security.base64Encode(config.apiKey + ":" + config.apiSecret);
            const response = $http.send({
                url: "https://api.mailjet.com/v3.1/send",
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Messages: [{
                            From: { Email: config.senderEmail, Name: config.senderName },
                            To: [{ Email: recipientEmail, Name: recipientName }],
                            Subject: subject,
                            HTMLPart: finalHtml
                        }]
                })
            });
            if (response.statusCode === 200 || response.statusCode === 201) {
                record.set("status", "Sent");
            }
            else {
                throw new Error("API responded with code " + response.statusCode + ": " + response.text);
            }
        }
        catch (err) {
            const currentAttempts = record.get("attempts") + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        }
        finally {
            app.save(record);
        }
    });
}

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
    const allowed = {};
    requiredKeys.forEach(k => { allowed[k] = true; });
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
    // --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url)
        return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}
/**
 * Formats a date string in a specific timezone using Intl.
 */
function formatInTimezone(date, timezone, options) {
    if (!date)
        return "";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    try {
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours = -5; // Default to America/New_York (EST)
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        // Determine if DST (Daylight Saving Time) is active in the US
        // DST starts 2nd Sunday of March, ends 1st Sunday of November
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0); // ~2 AM EST
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0); // ~2 AM EDT
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.includes("chicago") || tz.includes("central")) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        }
        else {
            // Default: America/New_York (Eastern)
            offsetHours = isDst ? -4 : -5;
        }
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
        const localDate = new Date(localTimeMs);
        // Format manually using the shifted localDate components
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const wday = weekdays[localDate.getUTCDay()];
        const wdayFull = weekdaysFull[localDate.getUTCDay()];
        const mon = months[localDate.getUTCMonth()];
        const monFull = monthsFull[localDate.getUTCMonth()];
        const day = localDate.getUTCDate();
        const yr = localDate.getUTCFullYear();
        let hr = localDate.getUTCHours();
        const ampm = hr >= 12 ? "PM" : "AM";
        hr = hr % 12;
        if (hr === 0)
            hr = 12;
        const minVal = localDate.getUTCMinutes();
        const min = minVal < 10 ? "0" + minVal : String(minVal);
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
        }
        // Case 4: Date only: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val)
        return "";
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            catch {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val)
        return null;
    const decoded = decodeGoBytes(val);
    if (!decoded)
        return null;
    if (typeof decoded === 'object')
        return decoded;
    try {
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}

/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">$1</a>');
    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList)
        processedLines.push("</ul>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul"))
            return block;
        if (block.trim().startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
function shouldQueueMessage(record, oldStatus) {
    if (!record)
        return false;
    const status = record.get("status") || "Sent";
    if (status === "Draft")
        return false;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both")
        return false;
    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return status === "Sent" && oldStatus === "Draft";
    }
    return true;
}
/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
function enqueueBulkMessage(app, record) {
    const queueCollection = app.findCollectionByNameOrId("emailQueue");
    const recipients = parseJsonField(record.get("recipients")) || [];
    const subject = record.get("subject") || "";
    const content = record.get("content") || "";
    const filters = parseJsonField(record.get("filters")) || {};
    recipients.forEach(recipient => {
        if (!recipient.email)
            return;
        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });
        app.save(queueRecord);
    });
}

/**
 * Renders the HTML body for the attendance report email.
 */
function renderAttendanceReportBody(data) {
    const safe = sanitizeHtmlTemplateData(data);
    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Choir Management Notification</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Retrieves Mailjet credentials from appSettings.
 */
function getMailjetConfig(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'mailjet'");
        const parsed = parseJsonField(record.get("value"));
        return {
            apiKey: parsed?.apiKey || "",
            apiSecret: parsed?.apiSecret || "",
            senderEmail: parsed?.senderEmail || "no-reply@choir.management",
            senderName: parsed?.senderName || "Choir Management Tool"
        };
    }
    catch (e) {
        return { apiKey: "", apiSecret: "", senderEmail: "", senderName: "" };
    }
}
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (err) {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue.
 */
function processEmailQueue(app) {
    const config = getMailjetConfig(app);
    if (!config.apiKey || !config.apiSecret) {
        console.log("[Queue Error] Mailjet configuration missing API keys.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "created", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async HTTP processing
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (e) { }
    baseUrl = normalizeBaseUrl(baseUrl);
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            }
            else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    }
    catch (e) { }
    records.forEach((record) => {
        try {
            const rawContent = record.get("rawContent") || "";
            const recipientId = record.get("recipientId");
            const recipientEmail = record.get("recipientEmail");
            const recipientName = record.get("recipientName") || "Singer";
            const filters = parseJsonField(record.get("filters")) || {};
            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch (e) { }
            }
            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (event) {
                const eventDate = event.get("date");
                const eventTitle = (event.get("title") || event.get("type") || "Event");
                const eventType = (event.get("type") || "Performance");
                const eventDetails = (event.get("details") || "");
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue"));
                    venueName = (venueRecord.get("name") || "TBD");
                }
                catch (e) { }
                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                    .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                    .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));
                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }
            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }
            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
            record.set("htmlBody", finalHtml);
            // Execute raw Mailjet REST request
            const authHeader = "Basic " + $security.base64Encode(config.apiKey + ":" + config.apiSecret);
            const response = $http.send({
                url: "https://api.mailjet.com/v3.1/send",
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Messages: [{
                            From: { Email: config.senderEmail, Name: config.senderName },
                            To: [{ Email: recipientEmail, Name: recipientName }],
                            Subject: subject,
                            HTMLPart: finalHtml
                        }]
                })
            });
            if (response.statusCode === 200 || response.statusCode === 201) {
                record.set("status", "Sent");
            }
            else {
                throw new Error("API responded with code " + response.statusCode + ": " + response.text);
            }
        }
        catch (err) {
            const currentAttempts = record.get("attempts") + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        }
        finally {
            app.save(record);
        }
    });
}

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
    const allowed = {};
    requiredKeys.forEach(k => { allowed[k] = true; });
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
    
    try {
        const record = e?.record;
        const original = e.originalCopy;
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
    // --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url)
        return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}
/**
 * Formats a date string in a specific timezone using Intl.
 */
function formatInTimezone(date, timezone, options) {
    if (!date)
        return "";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    try {
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours = -5; // Default to America/New_York (EST)
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        // Determine if DST (Daylight Saving Time) is active in the US
        // DST starts 2nd Sunday of March, ends 1st Sunday of November
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0); // ~2 AM EST
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0); // ~2 AM EDT
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.includes("chicago") || tz.includes("central")) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        }
        else {
            // Default: America/New_York (Eastern)
            offsetHours = isDst ? -4 : -5;
        }
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
        const localDate = new Date(localTimeMs);
        // Format manually using the shifted localDate components
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const wday = weekdays[localDate.getUTCDay()];
        const wdayFull = weekdaysFull[localDate.getUTCDay()];
        const mon = months[localDate.getUTCMonth()];
        const monFull = monthsFull[localDate.getUTCMonth()];
        const day = localDate.getUTCDate();
        const yr = localDate.getUTCFullYear();
        let hr = localDate.getUTCHours();
        const ampm = hr >= 12 ? "PM" : "AM";
        hr = hr % 12;
        if (hr === 0)
            hr = 12;
        const minVal = localDate.getUTCMinutes();
        const min = minVal < 10 ? "0" + minVal : String(minVal);
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
        }
        // Case 4: Date only: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val)
        return "";
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            catch {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val)
        return null;
    const decoded = decodeGoBytes(val);
    if (!decoded)
        return null;
    if (typeof decoded === 'object')
        return decoded;
    try {
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}

/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">$1</a>');
    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList)
        processedLines.push("</ul>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul"))
            return block;
        if (block.trim().startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
function shouldQueueMessage(record, oldStatus) {
    if (!record)
        return false;
    const status = record.get("status") || "Sent";
    if (status === "Draft")
        return false;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both")
        return false;
    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return status === "Sent" && oldStatus === "Draft";
    }
    return true;
}
/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
function enqueueBulkMessage(app, record) {
    const queueCollection = app.findCollectionByNameOrId("emailQueue");
    const recipients = parseJsonField(record.get("recipients")) || [];
    const subject = record.get("subject") || "";
    const content = record.get("content") || "";
    const filters = parseJsonField(record.get("filters")) || {};
    recipients.forEach(recipient => {
        if (!recipient.email)
            return;
        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });
        app.save(queueRecord);
    });
}

/**
 * Renders the HTML body for the attendance report email.
 */
function renderAttendanceReportBody(data) {
    const safe = sanitizeHtmlTemplateData(data);
    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Choir Management Notification</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Retrieves Mailjet credentials from appSettings.
 */
function getMailjetConfig(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'mailjet'");
        const parsed = parseJsonField(record.get("value"));
        return {
            apiKey: parsed?.apiKey || "",
            apiSecret: parsed?.apiSecret || "",
            senderEmail: parsed?.senderEmail || "no-reply@choir.management",
            senderName: parsed?.senderName || "Choir Management Tool"
        };
    }
    catch (e) {
        return { apiKey: "", apiSecret: "", senderEmail: "", senderName: "" };
    }
}
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (err) {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue.
 */
function processEmailQueue(app) {
    const config = getMailjetConfig(app);
    if (!config.apiKey || !config.apiSecret) {
        console.log("[Queue Error] Mailjet configuration missing API keys.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "created", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async HTTP processing
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (e) { }
    baseUrl = normalizeBaseUrl(baseUrl);
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            }
            else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    }
    catch (e) { }
    records.forEach((record) => {
        try {
            const rawContent = record.get("rawContent") || "";
            const recipientId = record.get("recipientId");
            const recipientEmail = record.get("recipientEmail");
            const recipientName = record.get("recipientName") || "Singer";
            const filters = parseJsonField(record.get("filters")) || {};
            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch (e) { }
            }
            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (event) {
                const eventDate = event.get("date");
                const eventTitle = (event.get("title") || event.get("type") || "Event");
                const eventType = (event.get("type") || "Performance");
                const eventDetails = (event.get("details") || "");
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue"));
                    venueName = (venueRecord.get("name") || "TBD");
                }
                catch (e) { }
                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                    .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                    .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));
                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }
            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }
            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
            record.set("htmlBody", finalHtml);
            // Execute raw Mailjet REST request
            const authHeader = "Basic " + $security.base64Encode(config.apiKey + ":" + config.apiSecret);
            const response = $http.send({
                url: "https://api.mailjet.com/v3.1/send",
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Messages: [{
                            From: { Email: config.senderEmail, Name: config.senderName },
                            To: [{ Email: recipientEmail, Name: recipientName }],
                            Subject: subject,
                            HTMLPart: finalHtml
                        }]
                })
            });
            if (response.statusCode === 200 || response.statusCode === 201) {
                record.set("status", "Sent");
            }
            else {
                throw new Error("API responded with code " + response.statusCode + ": " + response.text);
            }
        }
        catch (err) {
            const currentAttempts = record.get("attempts") + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        }
        finally {
            app.save(record);
        }
    });
}

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
    const allowed = {};
    requiredKeys.forEach(k => { allowed[k] = true; });
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
    // --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url)
        return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}
/**
 * Formats a date string in a specific timezone using Intl.
 */
function formatInTimezone(date, timezone, options) {
    if (!date)
        return "";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    try {
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours = -5; // Default to America/New_York (EST)
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        // Determine if DST (Daylight Saving Time) is active in the US
        // DST starts 2nd Sunday of March, ends 1st Sunday of November
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0); // ~2 AM EST
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0); // ~2 AM EDT
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.includes("chicago") || tz.includes("central")) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        }
        else {
            // Default: America/New_York (Eastern)
            offsetHours = isDst ? -4 : -5;
        }
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
        const localDate = new Date(localTimeMs);
        // Format manually using the shifted localDate components
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const wday = weekdays[localDate.getUTCDay()];
        const wdayFull = weekdaysFull[localDate.getUTCDay()];
        const mon = months[localDate.getUTCMonth()];
        const monFull = monthsFull[localDate.getUTCMonth()];
        const day = localDate.getUTCDate();
        const yr = localDate.getUTCFullYear();
        let hr = localDate.getUTCHours();
        const ampm = hr >= 12 ? "PM" : "AM";
        hr = hr % 12;
        if (hr === 0)
            hr = 12;
        const minVal = localDate.getUTCMinutes();
        const min = minVal < 10 ? "0" + minVal : String(minVal);
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
        }
        // Case 4: Date only: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val)
        return "";
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            catch {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val)
        return null;
    const decoded = decodeGoBytes(val);
    if (!decoded)
        return null;
    if (typeof decoded === 'object')
        return decoded;
    try {
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}

/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">$1</a>');
    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList)
        processedLines.push("</ul>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul"))
            return block;
        if (block.trim().startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
function shouldQueueMessage(record, oldStatus) {
    if (!record)
        return false;
    const status = record.get("status") || "Sent";
    if (status === "Draft")
        return false;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both")
        return false;
    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return status === "Sent" && oldStatus === "Draft";
    }
    return true;
}
/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
function enqueueBulkMessage(app, record) {
    const queueCollection = app.findCollectionByNameOrId("emailQueue");
    const recipients = parseJsonField(record.get("recipients")) || [];
    const subject = record.get("subject") || "";
    const content = record.get("content") || "";
    const filters = parseJsonField(record.get("filters")) || {};
    recipients.forEach(recipient => {
        if (!recipient.email)
            return;
        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });
        app.save(queueRecord);
    });
}

/**
 * Renders the HTML body for the attendance report email.
 */
function renderAttendanceReportBody(data) {
    const safe = sanitizeHtmlTemplateData(data);
    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Choir Management Notification</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Retrieves Mailjet credentials from appSettings.
 */
function getMailjetConfig(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'mailjet'");
        const parsed = parseJsonField(record.get("value"));
        return {
            apiKey: parsed?.apiKey || "",
            apiSecret: parsed?.apiSecret || "",
            senderEmail: parsed?.senderEmail || "no-reply@choir.management",
            senderName: parsed?.senderName || "Choir Management Tool"
        };
    }
    catch (e) {
        return { apiKey: "", apiSecret: "", senderEmail: "", senderName: "" };
    }
}
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (err) {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue.
 */
function processEmailQueue(app) {
    const config = getMailjetConfig(app);
    if (!config.apiKey || !config.apiSecret) {
        console.log("[Queue Error] Mailjet configuration missing API keys.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "created", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async HTTP processing
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (e) { }
    baseUrl = normalizeBaseUrl(baseUrl);
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            }
            else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    }
    catch (e) { }
    records.forEach((record) => {
        try {
            const rawContent = record.get("rawContent") || "";
            const recipientId = record.get("recipientId");
            const recipientEmail = record.get("recipientEmail");
            const recipientName = record.get("recipientName") || "Singer";
            const filters = parseJsonField(record.get("filters")) || {};
            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch (e) { }
            }
            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (event) {
                const eventDate = event.get("date");
                const eventTitle = (event.get("title") || event.get("type") || "Event");
                const eventType = (event.get("type") || "Performance");
                const eventDetails = (event.get("details") || "");
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue"));
                    venueName = (venueRecord.get("name") || "TBD");
                }
                catch (e) { }
                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                    .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                    .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));
                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }
            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }
            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
            record.set("htmlBody", finalHtml);
            // Execute raw Mailjet REST request
            const authHeader = "Basic " + $security.base64Encode(config.apiKey + ":" + config.apiSecret);
            const response = $http.send({
                url: "https://api.mailjet.com/v3.1/send",
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Messages: [{
                            From: { Email: config.senderEmail, Name: config.senderName },
                            To: [{ Email: recipientEmail, Name: recipientName }],
                            Subject: subject,
                            HTMLPart: finalHtml
                        }]
                })
            });
            if (response.statusCode === 200 || response.statusCode === 201) {
                record.set("status", "Sent");
            }
            else {
                throw new Error("API responded with code " + response.statusCode + ": " + response.text);
            }
        }
        catch (err) {
            const currentAttempts = record.get("attempts") + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        }
        finally {
            app.save(record);
        }
    });
}

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
    const allowed = {};
    requiredKeys.forEach(k => { allowed[k] = true; });
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
    // --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url)
        return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}
/**
 * Formats a date string in a specific timezone using Intl.
 */
function formatInTimezone(date, timezone, options) {
    if (!date)
        return "";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    try {
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours = -5; // Default to America/New_York (EST)
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        // Determine if DST (Daylight Saving Time) is active in the US
        // DST starts 2nd Sunday of March, ends 1st Sunday of November
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0); // ~2 AM EST
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0); // ~2 AM EDT
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.includes("chicago") || tz.includes("central")) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        }
        else {
            // Default: America/New_York (Eastern)
            offsetHours = isDst ? -4 : -5;
        }
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
        const localDate = new Date(localTimeMs);
        // Format manually using the shifted localDate components
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const wday = weekdays[localDate.getUTCDay()];
        const wdayFull = weekdaysFull[localDate.getUTCDay()];
        const mon = months[localDate.getUTCMonth()];
        const monFull = monthsFull[localDate.getUTCMonth()];
        const day = localDate.getUTCDate();
        const yr = localDate.getUTCFullYear();
        let hr = localDate.getUTCHours();
        const ampm = hr >= 12 ? "PM" : "AM";
        hr = hr % 12;
        if (hr === 0)
            hr = 12;
        const minVal = localDate.getUTCMinutes();
        const min = minVal < 10 ? "0" + minVal : String(minVal);
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
        }
        // Case 4: Date only: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val)
        return "";
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            catch {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val)
        return null;
    const decoded = decodeGoBytes(val);
    if (!decoded)
        return null;
    if (typeof decoded === 'object')
        return decoded;
    try {
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}

/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">$1</a>');
    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList)
        processedLines.push("</ul>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul"))
            return block;
        if (block.trim().startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
function shouldQueueMessage(record, oldStatus) {
    if (!record)
        return false;
    const status = record.get("status") || "Sent";
    if (status === "Draft")
        return false;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both")
        return false;
    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return status === "Sent" && oldStatus === "Draft";
    }
    return true;
}
/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
function enqueueBulkMessage(app, record) {
    const queueCollection = app.findCollectionByNameOrId("emailQueue");
    const recipients = parseJsonField(record.get("recipients")) || [];
    const subject = record.get("subject") || "";
    const content = record.get("content") || "";
    const filters = parseJsonField(record.get("filters")) || {};
    recipients.forEach(recipient => {
        if (!recipient.email)
            return;
        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });
        app.save(queueRecord);
    });
}

/**
 * Renders the HTML body for the attendance report email.
 */
function renderAttendanceReportBody(data) {
    const safe = sanitizeHtmlTemplateData(data);
    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Choir Management Notification</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Retrieves Mailjet credentials from appSettings.
 */
function getMailjetConfig(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'mailjet'");
        const parsed = parseJsonField(record.get("value"));
        return {
            apiKey: parsed?.apiKey || "",
            apiSecret: parsed?.apiSecret || "",
            senderEmail: parsed?.senderEmail || "no-reply@choir.management",
            senderName: parsed?.senderName || "Choir Management Tool"
        };
    }
    catch (e) {
        return { apiKey: "", apiSecret: "", senderEmail: "", senderName: "" };
    }
}
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (err) {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue.
 */
function processEmailQueue(app) {
    const config = getMailjetConfig(app);
    if (!config.apiKey || !config.apiSecret) {
        console.log("[Queue Error] Mailjet configuration missing API keys.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "created", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async HTTP processing
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (e) { }
    baseUrl = normalizeBaseUrl(baseUrl);
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            }
            else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    }
    catch (e) { }
    records.forEach((record) => {
        try {
            const rawContent = record.get("rawContent") || "";
            const recipientId = record.get("recipientId");
            const recipientEmail = record.get("recipientEmail");
            const recipientName = record.get("recipientName") || "Singer";
            const filters = parseJsonField(record.get("filters")) || {};
            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch (e) { }
            }
            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (event) {
                const eventDate = event.get("date");
                const eventTitle = (event.get("title") || event.get("type") || "Event");
                const eventType = (event.get("type") || "Performance");
                const eventDetails = (event.get("details") || "");
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue"));
                    venueName = (venueRecord.get("name") || "TBD");
                }
                catch (e) { }
                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                    .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                    .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));
                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }
            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }
            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
            record.set("htmlBody", finalHtml);
            // Execute raw Mailjet REST request
            const authHeader = "Basic " + $security.base64Encode(config.apiKey + ":" + config.apiSecret);
            const response = $http.send({
                url: "https://api.mailjet.com/v3.1/send",
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Messages: [{
                            From: { Email: config.senderEmail, Name: config.senderName },
                            To: [{ Email: recipientEmail, Name: recipientName }],
                            Subject: subject,
                            HTMLPart: finalHtml
                        }]
                })
            });
            if (response.statusCode === 200 || response.statusCode === 201) {
                record.set("status", "Sent");
            }
            else {
                throw new Error("API responded with code " + response.statusCode + ": " + response.text);
            }
        }
        catch (err) {
            const currentAttempts = record.get("attempts") + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        }
        finally {
            app.save(record);
        }
    });
}

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
    const allowed = {};
    requiredKeys.forEach(k => { allowed[k] = true; });
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
    // --- SHARED UTILITIES ---
// WARNING: This section is automatically inlined by the generator.
// Edit sources in pocketbase/pb_hooks_src/ instead.
/**
 * Escapes HTML characters in a string to prevent XSS.
 */
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
/**
 * Sanitizes a string for use in an email subject line.
 */
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
/**
 * Ensures a base URL has no trailing slash.
 */
function normalizeBaseUrl(url) {
    if (!url)
        return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}
/**
 * Formats a date string in a specific timezone using Intl.
 */
function formatInTimezone(date, timezone, options) {
    if (!date)
        return "";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    try {
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours = -5; // Default to America/New_York (EST)
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        // Determine if DST (Daylight Saving Time) is active in the US
        // DST starts 2nd Sunday of March, ends 1st Sunday of November
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0); // ~2 AM EST
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0); // ~2 AM EDT
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.includes("chicago") || tz.includes("central")) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        }
        else {
            // Default: America/New_York (Eastern)
            offsetHours = isDst ? -4 : -5;
        }
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
        const localDate = new Date(localTimeMs);
        // Format manually using the shifted localDate components
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const wday = weekdays[localDate.getUTCDay()];
        const wdayFull = weekdaysFull[localDate.getUTCDay()];
        const mon = months[localDate.getUTCMonth()];
        const monFull = monthsFull[localDate.getUTCMonth()];
        const day = localDate.getUTCDate();
        const yr = localDate.getUTCFullYear();
        let hr = localDate.getUTCHours();
        const ampm = hr >= 12 ? "PM" : "AM";
        hr = hr % 12;
        if (hr === 0)
            hr = 12;
        const minVal = localDate.getUTCMinutes();
        const min = minVal < 10 ? "0" + minVal : String(minVal);
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
        }
        // Case 4: Date only: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}

/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
function decodeGoBytes(val) {
    if (!val)
        return "";
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object') {
        // Check if it's a byte array (only numbers)
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            catch {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
/**
 * Safely parses a JSON field from a PocketBase record.
 */
function parseJsonField(val) {
    if (!val)
        return null;
    const decoded = decodeGoBytes(val);
    if (!decoded)
        return null;
    if (typeof decoded === 'object')
        return decoded;
    try {
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}

/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">$1</a>');
    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList)
        processedLines.push("</ul>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul"))
            return block;
        if (block.trim().startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
function shouldQueueMessage(record, oldStatus) {
    if (!record)
        return false;
    const status = record.get("status") || "Sent";
    if (status === "Draft")
        return false;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both")
        return false;
    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return status === "Sent" && oldStatus === "Draft";
    }
    return true;
}
/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
function enqueueBulkMessage(app, record) {
    const queueCollection = app.findCollectionByNameOrId("emailQueue");
    const recipients = parseJsonField(record.get("recipients")) || [];
    const subject = record.get("subject") || "";
    const content = record.get("content") || "";
    const filters = parseJsonField(record.get("filters")) || {};
    recipients.forEach(recipient => {
        if (!recipient.email)
            return;
        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });
        app.save(queueRecord);
    });
}

/**
 * Renders the HTML body for the attendance report email.
 */
function renderAttendanceReportBody(data) {
    const safe = sanitizeHtmlTemplateData(data);
    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Choir Management Notification</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Retrieves Mailjet credentials from appSettings.
 */
function getMailjetConfig(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'mailjet'");
        const parsed = parseJsonField(record.get("value"));
        return {
            apiKey: parsed?.apiKey || "",
            apiSecret: parsed?.apiSecret || "",
            senderEmail: parsed?.senderEmail || "no-reply@choir.management",
            senderName: parsed?.senderName || "Choir Management Tool"
        };
    }
    catch (e) {
        return { apiKey: "", apiSecret: "", senderEmail: "", senderName: "" };
    }
}
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (err) {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue.
 */
function processEmailQueue(app) {
    const config = getMailjetConfig(app);
    if (!config.apiKey || !config.apiSecret) {
        console.log("[Queue Error] Mailjet configuration missing API keys.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "created", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async HTTP processing
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (e) { }
    baseUrl = normalizeBaseUrl(baseUrl);
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            }
            else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    }
    catch (e) { }
    records.forEach((record) => {
        try {
            const rawContent = record.get("rawContent") || "";
            const recipientId = record.get("recipientId");
            const recipientEmail = record.get("recipientEmail");
            const recipientName = record.get("recipientName") || "Singer";
            const filters = parseJsonField(record.get("filters")) || {};
            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch (e) { }
            }
            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
            if (event) {
                const eventDate = event.get("date");
                const eventTitle = (event.get("title") || event.get("type") || "Event");
                const eventType = (event.get("type") || "Performance");
                const eventDetails = (event.get("details") || "");
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue"));
                    venueName = (venueRecord.get("name") || "TBD");
                }
                catch (e) { }
                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                    .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                    .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));
                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }
            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }
            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
            record.set("htmlBody", finalHtml);
            // Execute raw Mailjet REST request
            const authHeader = "Basic " + $security.base64Encode(config.apiKey + ":" + config.apiSecret);
            const response = $http.send({
                url: "https://api.mailjet.com/v3.1/send",
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Messages: [{
                            From: { Email: config.senderEmail, Name: config.senderName },
                            To: [{ Email: recipientEmail, Name: recipientName }],
                            Subject: subject,
                            HTMLPart: finalHtml
                        }]
                })
            });
            if (response.statusCode === 200 || response.statusCode === 201) {
                record.set("status", "Sent");
            }
            else {
                throw new Error("API responded with code " + response.statusCode + ": " + response.text);
            }
        }
        catch (err) {
            const currentAttempts = record.get("attempts") + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        }
        finally {
            app.save(record);
        }
    });
}

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
    const allowed = {};
    requiredKeys.forEach(k => { allowed[k] = true; });
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