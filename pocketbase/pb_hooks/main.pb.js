// PocketBase Backend Hooks - SOURCE GENERATED (DO NOT EDIT DIRECTLY)
// Generated on: 2026-05-23T12:20:51.493Z

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
 * Logic to determine if a message should be dispatched on create.
 */
function shouldDispatchOnCreate(record) {
    if (!record)
        return false;
    const status = record.status || "Sent";
    if (status === "Draft")
        return false;
    const type = record.type;
    if (type !== "Email" && type !== "Both")
        return false;
    const filters = record.filters || {};
    if (filters.alreadySent === true)
        return false;
    return true;
}
/**
 * Logic to determine if a message should be dispatched on update.
 */
function shouldDispatchOnUpdate(record, oldStatus) {
    if (!record)
        return false;
    const status = record.status;
    if (status === "Sent" && oldStatus === "Draft") {
        const type = record.type;
        if (type !== "Email" && type !== "Both")
            return false;
        return true;
    }
    return false;
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


function dispatchEmails(subject, content, recipients, recordId, filters) {
    console.log("[Email] Starting dispatch for " + recordId + ". Recipients: " + recipients.length);
    
    const settings = $app.settings();
    const fromAddress = settings.meta.senderAddress || "no-reply@choir.management";
    const fromName = settings.meta.senderName || "Choir Management Tool";

    const secret = getHmacSecret();

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

    let timezone = "America/New_York";
    try {
        const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const tzP = parseJsonField(tzSetting.get("value"));
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            } else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    } catch (e) {}

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

        const singerName = r.name || "Singer";

        // --- SUBJECT RESOLUTION ---
        let finalSubject = subject.replace(/{singerName}/g, sanitizeEmailSubject(singerName));

        if (event) {
            const eventDate = event.get("date");
            const eventTitle = event.get("title") || event.get("type") || "Event";
            const eventType = event.get("type") || "Performance";
            
            // Format for subject (simpler)
            const eventDateStr = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

            finalSubject = finalSubject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                                     .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                                     .replace(/{eventDate}/g, sanitizeEmailSubject(eventDateStr));
        }

        // --- BODY RENDERING (Step 1: Markdown to HTML) ---
        const contentText = String(content || "");
        const hasExistingFooter =
            /you are receiving this because you are an active member of the choir/i.test(contentText) ||
            /unsubscribe from these emails/i.test(contentText) ||
            /{{UNSUBSCRIBE_LINK}}/.test(contentText);
        let htmlBody = renderMarkdown(contentText);

        // --- BODY RENDERING (Step 2: Compliance Footer) ---
        if (!hasExistingFooter) {
            htmlBody += `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9f0eb; font-family: sans-serif; font-size: 12px; color: #94a3b8; text-align: center;">
  <p style="margin: 0 0 10px 0;">{{MAILING_ADDRESS}}</p>
  <p style="margin: 0;">
    You are receiving this because you are an active member of the choir. 
    <br>
    <a href="{{UNSUBSCRIBE_LINK}}" style="color: #4a7c59; text-decoration: underline;">Unsubscribe from these emails</a>
  </p>
</div>
`;
        }

        // --- BODY RENDERING (Step 3: Placeholder Resolution - Allows HTML injection) ---
        htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(singerName));
        htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));

        if (htmlBody.includes("{{UNSUBSCRIBE_LINK}}") && secret) {
            const payload = `p=${r.id}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`);
        }

        if (event) {
            const eventDate = event.get("date");
            const eventTitle = event.get("title") || event.get("type") || "Event";
            const eventType = event.get("type") || "Performance";
            const eventDetails = event.get("details") || "";
            let venueName = "TBD";
            try {
                const venueRecord = $app.findRecordById("venues", event.get("venue"));
                venueName = venueRecord.get("name") || "TBD";
            } catch (e) {}

            const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
            const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

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
                const payload = `e=${event.id}&p=${r.id}`;
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
 * Logic to determine if a message should be dispatched on create.
 */
function shouldDispatchOnCreate(record) {
    if (!record)
        return false;
    const status = record.status || "Sent";
    if (status === "Draft")
        return false;
    const type = record.type;
    if (type !== "Email" && type !== "Both")
        return false;
    const filters = record.filters || {};
    if (filters.alreadySent === true)
        return false;
    return true;
}
/**
 * Logic to determine if a message should be dispatched on update.
 */
function shouldDispatchOnUpdate(record, oldStatus) {
    if (!record)
        return false;
    const status = record.status;
    if (status === "Sent" && oldStatus === "Draft") {
        const type = record.type;
        if (type !== "Email" && type !== "Both")
            return false;
        return true;
    }
    return false;
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
 * Logic to determine if a message should be dispatched on create.
 */
function shouldDispatchOnCreate(record) {
    if (!record)
        return false;
    const status = record.status || "Sent";
    if (status === "Draft")
        return false;
    const type = record.type;
    if (type !== "Email" && type !== "Both")
        return false;
    const filters = record.filters || {};
    if (filters.alreadySent === true)
        return false;
    return true;
}
/**
 * Logic to determine if a message should be dispatched on update.
 */
function shouldDispatchOnUpdate(record, oldStatus) {
    if (!record)
        return false;
    const status = record.status;
    if (status === "Sent" && oldStatus === "Draft") {
        const type = record.type;
        if (type !== "Email" && type !== "Both")
            return false;
        return true;
    }
    return false;
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
    
    
function dispatchEmails(subject, content, recipients, recordId, filters) {
    console.log("[Email] Starting dispatch for " + recordId + ". Recipients: " + recipients.length);
    
    const settings = $app.settings();
    const fromAddress = settings.meta.senderAddress || "no-reply@choir.management";
    const fromName = settings.meta.senderName || "Choir Management Tool";

    const secret = getHmacSecret();

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

    let timezone = "America/New_York";
    try {
        const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const tzP = parseJsonField(tzSetting.get("value"));
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            } else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    } catch (e) {}

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

        const singerName = r.name || "Singer";

        // --- SUBJECT RESOLUTION ---
        let finalSubject = subject.replace(/{singerName}/g, sanitizeEmailSubject(singerName));

        if (event) {
            const eventDate = event.get("date");
            const eventTitle = event.get("title") || event.get("type") || "Event";
            const eventType = event.get("type") || "Performance";
            
            // Format for subject (simpler)
            const eventDateStr = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

            finalSubject = finalSubject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                                     .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                                     .replace(/{eventDate}/g, sanitizeEmailSubject(eventDateStr));
        }

        // --- BODY RENDERING (Step 1: Markdown to HTML) ---
        const contentText = String(content || "");
        const hasExistingFooter =
            /you are receiving this because you are an active member of the choir/i.test(contentText) ||
            /unsubscribe from these emails/i.test(contentText) ||
            /{{UNSUBSCRIBE_LINK}}/.test(contentText);
        let htmlBody = renderMarkdown(contentText);

        // --- BODY RENDERING (Step 2: Compliance Footer) ---
        if (!hasExistingFooter) {
            htmlBody += `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9f0eb; font-family: sans-serif; font-size: 12px; color: #94a3b8; text-align: center;">
  <p style="margin: 0 0 10px 0;">{{MAILING_ADDRESS}}</p>
  <p style="margin: 0;">
    You are receiving this because you are an active member of the choir. 
    <br>
    <a href="{{UNSUBSCRIBE_LINK}}" style="color: #4a7c59; text-decoration: underline;">Unsubscribe from these emails</a>
  </p>
</div>
`;
        }

        // --- BODY RENDERING (Step 3: Placeholder Resolution - Allows HTML injection) ---
        htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(singerName));
        htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));

        if (htmlBody.includes("{{UNSUBSCRIBE_LINK}}") && secret) {
            const payload = `p=${r.id}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`);
        }

        if (event) {
            const eventDate = event.get("date");
            const eventTitle = event.get("title") || event.get("type") || "Event";
            const eventType = event.get("type") || "Performance";
            const eventDetails = event.get("details") || "";
            let venueName = "TBD";
            try {
                const venueRecord = $app.findRecordById("venues", event.get("venue"));
                venueName = venueRecord.get("name") || "TBD";
            } catch (e) {}

            const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
            const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

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
                const payload = `e=${event.id}&p=${r.id}`;
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


    try {
        const record = e?.record;
        if (!record) return;

        if (shouldDispatchOnCreate({
            status: record.get("status"),
            type: record.get("type"),
            filters: parseJsonField(record.get("filters"))
        })) {
            const subject = record.get("subject") || "Message from Choir Management";
            const content = record.get("content") || "";
            const recipients = parseJsonField(record.get("recipients")) || [];

            if (recipients && recipients.length > 0) {
                dispatchEmails(subject, content, recipients, record.id, parseJsonField(record.get("filters")));
            }
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
 * Logic to determine if a message should be dispatched on create.
 */
function shouldDispatchOnCreate(record) {
    if (!record)
        return false;
    const status = record.status || "Sent";
    if (status === "Draft")
        return false;
    const type = record.type;
    if (type !== "Email" && type !== "Both")
        return false;
    const filters = record.filters || {};
    if (filters.alreadySent === true)
        return false;
    return true;
}
/**
 * Logic to determine if a message should be dispatched on update.
 */
function shouldDispatchOnUpdate(record, oldStatus) {
    if (!record)
        return false;
    const status = record.status;
    if (status === "Sent" && oldStatus === "Draft") {
        const type = record.type;
        if (type !== "Email" && type !== "Both")
            return false;
        return true;
    }
    return false;
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
    
    
function dispatchEmails(subject, content, recipients, recordId, filters) {
    console.log("[Email] Starting dispatch for " + recordId + ". Recipients: " + recipients.length);
    
    const settings = $app.settings();
    const fromAddress = settings.meta.senderAddress || "no-reply@choir.management";
    const fromName = settings.meta.senderName || "Choir Management Tool";

    const secret = getHmacSecret();

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

    let timezone = "America/New_York";
    try {
        const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const tzP = parseJsonField(tzSetting.get("value"));
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            } else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    } catch (e) {}

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

        const singerName = r.name || "Singer";

        // --- SUBJECT RESOLUTION ---
        let finalSubject = subject.replace(/{singerName}/g, sanitizeEmailSubject(singerName));

        if (event) {
            const eventDate = event.get("date");
            const eventTitle = event.get("title") || event.get("type") || "Event";
            const eventType = event.get("type") || "Performance";
            
            // Format for subject (simpler)
            const eventDateStr = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

            finalSubject = finalSubject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                                     .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                                     .replace(/{eventDate}/g, sanitizeEmailSubject(eventDateStr));
        }

        // --- BODY RENDERING (Step 1: Markdown to HTML) ---
        const contentText = String(content || "");
        const hasExistingFooter =
            /you are receiving this because you are an active member of the choir/i.test(contentText) ||
            /unsubscribe from these emails/i.test(contentText) ||
            /{{UNSUBSCRIBE_LINK}}/.test(contentText);
        let htmlBody = renderMarkdown(contentText);

        // --- BODY RENDERING (Step 2: Compliance Footer) ---
        if (!hasExistingFooter) {
            htmlBody += `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9f0eb; font-family: sans-serif; font-size: 12px; color: #94a3b8; text-align: center;">
  <p style="margin: 0 0 10px 0;">{{MAILING_ADDRESS}}</p>
  <p style="margin: 0;">
    You are receiving this because you are an active member of the choir. 
    <br>
    <a href="{{UNSUBSCRIBE_LINK}}" style="color: #4a7c59; text-decoration: underline;">Unsubscribe from these emails</a>
  </p>
</div>
`;
        }

        // --- BODY RENDERING (Step 3: Placeholder Resolution - Allows HTML injection) ---
        htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(singerName));
        htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));

        if (htmlBody.includes("{{UNSUBSCRIBE_LINK}}") && secret) {
            const payload = `p=${r.id}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`);
        }

        if (event) {
            const eventDate = event.get("date");
            const eventTitle = event.get("title") || event.get("type") || "Event";
            const eventType = event.get("type") || "Performance";
            const eventDetails = event.get("details") || "";
            let venueName = "TBD";
            try {
                const venueRecord = $app.findRecordById("venues", event.get("venue"));
                venueName = venueRecord.get("name") || "TBD";
            } catch (e) {}

            const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
            const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

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
                const payload = `e=${event.id}&p=${r.id}`;
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


    try {
        const record = e?.record;
        if (!record) return;

        const original = e.originalCopy;
        const oldStatus = original ? original.get("status") : "";

        if (shouldDispatchOnUpdate({
            status: record.get("status"),
            type: record.get("type")
        }, oldStatus)) {
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

// NOTE: eventRosters profile-status hooks live in pocketbase/pb_hooks/status.pb.js.
// Do not emit them here to avoid callback-scope issues and duplicate registrations.

// --- CUSTOM ENDPOINTS ---
// NOTE: RSVP and player endpoints remain in dedicated pb_hooks files
// (rsvp.pb.js and player.pb.js) to avoid duplicate route registration.

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
 * Logic to determine if a message should be dispatched on create.
 */
function shouldDispatchOnCreate(record) {
    if (!record)
        return false;
    const status = record.status || "Sent";
    if (status === "Draft")
        return false;
    const type = record.type;
    if (type !== "Email" && type !== "Both")
        return false;
    const filters = record.filters || {};
    if (filters.alreadySent === true)
        return false;
    return true;
}
/**
 * Logic to determine if a message should be dispatched on update.
 */
function shouldDispatchOnUpdate(record, oldStatus) {
    if (!record)
        return false;
    const status = record.status;
    if (status === "Sent" && oldStatus === "Draft") {
        const type = record.type;
        if (type !== "Email" && type !== "Both")
            return false;
        return true;
    }
    return false;
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