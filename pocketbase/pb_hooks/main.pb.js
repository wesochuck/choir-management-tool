// PocketBase Backend Hooks - SOURCE GENERATED (DO NOT EDIT DIRECTLY)
// Source: pocketbase/pb_hooks_src/

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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}
function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}
function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
}
function isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes) {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isEuropeDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}
function isSydneyDst(date) {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}
function getTimezoneOffsetInfo(date, timezone) {
    const tz = String(timezone || "").toLowerCase();
    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }
    const usZone = (standardOffsetMinutes, daylightOffsetMinutes, standardAbbreviation, daylightAbbreviation) => {
        const isDst = isUsDst(date, standardOffsetMinutes, daylightOffsetMinutes);
        return {
            offsetMinutes: isDst ? daylightOffsetMinutes : standardOffsetMinutes,
            abbreviation: isDst ? daylightAbbreviation : standardAbbreviation,
        };
    };
    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) {
        return usZone(-300, -240, "EST", "EDT");
    }
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
        return usZone(-360, -300, "CST", "CDT");
    }
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
        return usZone(-420, -360, "MST", "MDT");
    }
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) {
        return usZone(-540, -480, "AKST", "AKDT");
    }
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
        return { offsetMinutes: -420, abbreviation: "MST" };
    }
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) {
        return { offsetMinutes: -600, abbreviation: "HST" };
    }
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) {
        return usZone(-480, -420, "PST", "PDT");
    }
    if (tz.indexOf("london") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 60 : 0, abbreviation: isDst ? "BST" : "GMT" };
    }
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
        const isDst = isEuropeDst(date);
        return { offsetMinutes: isDst ? 120 : 60, abbreviation: isDst ? "CEST" : "CET" };
    }
    if (tz.indexOf("tokyo") >= 0) {
        return { offsetMinutes: 540, abbreviation: "JST" };
    }
    if (tz.indexOf("sydney") >= 0) {
        const isDst = isSydneyDst(date);
        return { offsetMinutes: isDst ? 660 : 600, abbreviation: isDst ? "AEDT" : "AEST" };
    }
    return { offsetMinutes: 0, abbreviation: "UTC" };
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
        // Bypass Intl.DateTimeFormat in Goja VM (PocketBase backend)
        if (typeof process === 'undefined' && typeof window === 'undefined') {
            throw new Error("Goja VM: use custom formatting");
        }
        // Try native Intl first (V8 / browser / Node.js)
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    }
    catch {
        const offsetInfo = getTimezoneOffsetInfo(d, timezone);
        // Shift date by offset to get target local time in UTC coordinates
        const localTimeMs = d.getTime() + (offsetInfo.offsetMinutes * 60 * 1000);
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
        const timezoneSuffix = options.timeZoneName ? " " + offsetInfo.abbreviation : "";
        // Build formats based on options requested:
        // Case 1: Just time (hour + minute)
        if (options.hour && !options.day) {
            return hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 2: Long date format: "Sunday, June 14, 2026"
        if (options.weekday === "long" && options.year) {
            return wdayFull + ", " + monFull + " " + day + ", " + yr;
        }
        // Case 3: Short format with time: "Sun, Jun 14, 7:00 PM"
        if (options.weekday === "short" && options.hour) {
            return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
        }
        // Case 4: Date only with weekday: "Sun, Jun 14"
        if (options.weekday === "short" && !options.hour) {
            return wday + ", " + mon + " " + day;
        }
        // Case 5: Date only without weekday: "Jun 14, 2026"
        if (options.month && !options.hour) {
            const m = options.month === "long" ? monFull : mon;
            return m + " " + day + (options.year ? ", " + yr : "");
        }
        // Generic fallback: "06/14/2026, 7:00 PM"
        const doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
        const doubleDigitDay = (day < 10) ? "0" + day : String(day);
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm + timezoneSuffix;
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });
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
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
function compileMailjetHtml(contentHtml, mailingAddress, unsubscribeUrl, headerTitle) {
    const displayTitle = headerTitle || "Choir Management";
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
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
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
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter("emailQueue", "status = 'Pending' && attempts < 3", "", 50, // Process in controlled batches of 50
    0);
    if (!records || records.length === 0)
        return;
    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r) => {
        r.set("status", "Processing");
        app.save(r);
    });
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms?.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch {
        // use default choirName
    }
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
    catch {
        // use default timezone
    }
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
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
            let htmlBody = renderMarkdown(protectedContent);
            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
            let subject = record.get("subject") || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));
            // Fetch dynamic event details if enqueued under filters
            let event = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                }
                catch {
                    // event not found
                }
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
                catch {
                    // venue not found
                }
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
                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date");
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
                                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            }
                            firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                            `.trim();
                        }
                    }
                    catch {
                        // Ignore rehearsals fetching or formatting errors
                    }
                }
                // Optionally generate an "Add to Calendar" link for the event itself (or audition)
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
                    let slotDateLong = dateLong;
                    let slotTimeStr = timeStr;
                    if (secret) {
                        const auditionId = filters.auditionId;
                        if (auditionId) {
                            const payload = `a=${auditionId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                            try {
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot");
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                                }
                            }
                            catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        }
                        else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
                            icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                        }
                    }
                    eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                    `.trim();
                }
                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                    .replace(/{eventType}/g, escapeHtml(eventType))
                    .replace(/{eventDate}/g, escapeHtml(dateShort))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                    .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                    .replace(/{eventInfo}/g, eventInfoHtml)
                    .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                    .replace(/{eventCalendarLink}/g, eventCalendarHtml);
                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
                if ((htmlBody.includes("{{PLAYER_LINK}}") || htmlBody.includes("{playerLink}")) && secret) {
                    const payload = `e=${event.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;
                    const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, playerHtml).replace(/{playerLink}/g, playerHtml);
                }
            }
            else {
                // If there's no event context, clear out the player link placeholders
                htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, "")
                    .replace(/{playerLink}/g, "");
            }
            // Resolve poll links: {{POLL_LINK:pollId}}
            if (htmlBody.includes("{{POLL_LINK:") && secret) {
                htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
                    const payload = "l=" + pollId + "&p=" + recipientId;
                    const signature = $security.hs256(payload, secret);
                    const token = payload + "&s=" + signature;
                    const pollLink = baseUrl + "/poll?token=" + encodeURIComponent(token);
                    let pollButtonLabel = "Answer our quick question";
                    try {
                        const pollRecord = app.findRecordById("polls", pollId);
                        const question = pollRecord?.get("question");
                        if (typeof question === "string" && question.trim()) {
                            pollButtonLabel = question.trim();
                        }
                    }
                    catch {
                        // keep safe fallback label if poll lookup fails
                    }
                    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
                });
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);
            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: {
                    address: settings.meta.senderAddress || "no-reply@choir.management",
                    name: settings.meta.senderName || "Choir Management Tool"
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });
            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        }
        catch (err) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
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

function getHmacSecretLocal(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch {
        return "";
    }
}
function parseSignedTokenLocal(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true };
    token.split("&").forEach(segment => {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            return;
        const key = segment.slice(0, idx);
        if (!allowed[key])
            return;
        parts[key] = segment.slice(idx + 1);
    });
    for (let i = 0; i < requiredKeys.length; i++) {
        if (!parts[requiredKeys[i]])
            return null;
    }
    return parts;
}
function escapeIcsText(value = '') {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}
function fmtUtc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function getChoirTimezoneLocal(app) {
    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const parsed = parseJsonField(tzSetting.get("value"));
        if (parsed) {
            if (typeof parsed === "string")
                timezone = parsed;
            else if (typeof parsed === "object" && parsed.timezone)
                timezone = parsed.timezone;
        }
    }
    catch {
        // ignore error
    }
    return timezone;
}
/**
 * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
 * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
 */
function parseSafeUtcDate(dateStr, timezone) {
    if (!dateStr)
        return new Date();
    let normalized = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        normalized = normalized.replace(" ", "T");
        if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += "Z";
        }
        return new Date(normalized);
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2001) {
            d.setFullYear(new Date().getFullYear());
        }
        let offsetHours;
        const tz = String(timezone || "").toLowerCase();
        const year = d.getUTCFullYear();
        const march1 = new Date(Date.UTC(year, 2, 1));
        const dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
        const dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
        const dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
        const isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;
        if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
            offsetHours = isDst ? -5 : -6;
        }
        else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
            offsetHours = isDst ? -6 : -7;
        }
        else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
            offsetHours = isDst ? -7 : -8;
        }
        else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
            offsetHours = -7;
        }
        else {
            offsetHours = isDst ? -4 : -5;
        }
        return new Date(d.getTime() - offsetHours * 60 * 60 * 1000);
    }
    return d;
}
function handleCalendarDownload(e) {
    const token = e.requestInfo().query["token"];
    const app = $app;
    if (!token) {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedTokenLocal(token, ["s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    const secret = getHmacSecretLocal(app);
    if (!secret) {
        return e.json(500, { error: "Configuration error" });
    }
    // Determine payload signature
    let payload;
    if (parts.e && parts.p) {
        payload = `e=${parts.e}&p=${parts.p}`;
    }
    else if (parts.a) {
        payload = `a=${parts.a}`;
    }
    else {
        return e.json(400, { error: "Invalid token structure" });
    }
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const timezone = getChoirTimezoneLocal(app);
        let venueName = "";
        let venueAddress = "";
        let locationStr = "";
        let start = new Date();
        let durationHours = 2;
        let title = "";
        let details = "";
        let uid = "";
        if (parts.e) {
            const event = app.findRecordById("events", parts.e);
            try {
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = app.findRecordById("venues", venueId);
                    venueName = venue.get("name") || "";
                    venueAddress = venue.get("address") || "";
                }
            }
            catch {
                // Ignore venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
            start = parseSafeUtcDate(event.get("date"), timezone);
            title = event.get("title") || event.get("type") || "Choir Event";
            details = event.get("details") || "";
            uid = `event-${event.id}@choir-management.local`;
        }
        else if (parts.a) {
            const audition = app.findRecordById("auditions", parts.a);
            start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
            durationHours = 0.5; // 30 mins for audition
            title = `Choir Audition: ${audition.get("name")}`;
            uid = `audition-${audition.id}@choir-management.local`;
            try {
                const eventId = audition.get("performance");
                if (eventId) {
                    const event = app.findRecordById("events", eventId);
                    const venueId = event.get("venue");
                    if (venueId) {
                        const venue = app.findRecordById("venues", venueId);
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
            }
            catch {
                // Ignore performance/venue resolution error
            }
            locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
            details = "Please arrive 10 minutes early to warm up.";
        }
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const dtstamp = new Date();
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Choir Management Tool//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${fmtUtc(dtstamp)}`,
            `DTSTART:${fmtUtc(start)}`,
            `DTEND:${fmtUtc(end)}`,
            `SUMMARY:${escapeIcsText(title)}`,
            `LOCATION:${escapeIcsText(locationStr)}`,
            `DESCRIPTION:${escapeIcsText(details)}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
        e.response.header().set("Content-Disposition", `attachment; filename="${uid.split('@')[0]}.ics"`);
        return e.string(200, icsContent);
    }
    catch {
        return e.json(404, { error: "Event or Audition not found" });
    }
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
    return handleCalendarDownload(e);
});