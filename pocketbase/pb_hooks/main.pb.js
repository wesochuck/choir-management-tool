// PocketBase Backend Hooks - SOURCE GENERATED (DO NOT EDIT DIRECTLY)
// Source: pocketbase/pb_hooks_src/

// --- CRON JOBS ---

cronAdd("post_event_report", "0 * * * *", () => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: email/attendanceReport.ts ---
    "use strict";
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
    // --- END CALLBACK-LOCAL UTILITIES ---

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
    });
});

cronAdd("process_email_queue_job", "*/2 * * * *", () => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: email/emailRendering.ts ---
    "use strict";
    function renderMarkdown(text) {
        if (!text)
            return "";
        // Escape raw HTML first
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
        html = html.replace(/^(#{1,6})\s+(.*)/gm, (_, hashes, content) => {
            const level = hashes.length;
            // Using inline styles for headings for better email client compatibility
            const fontSize = level === 1 ? '1.8rem' : level === 2 ? '1.5rem' : level === 3 ? '1.25rem' : '1.1rem';
            return `<h${level} style="margin: 16px 0 8px 0; line-height: 1.2; font-size: ${fontSize}; color: #2c3e50;">${content}</h${level}>`;
        });
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
        // Lists (Ordered and Unordered)
        const lines = html.split("\n");
        let inUl = false;
        let inOl = false;
        const processedLines = lines.map(line => {
            const ulMatch = line.match(/^(\*|-)\s+(.*)/);
            const olMatch = line.match(/^(\d+)\.\s+(.*)/);
            if (ulMatch) {
                const content = ulMatch[2];
                let prefix = "";
                if (inOl) {
                    inOl = false;
                    prefix = "</ol>";
                }
                if (!inUl) {
                    inUl = true;
                    return prefix + `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else if (olMatch) {
                const content = olMatch[2];
                let prefix = "";
                if (inUl) {
                    inUl = false;
                    prefix = "</ul>";
                }
                if (!inOl) {
                    inOl = true;
                    return prefix + `<ol style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else {
                let result = line;
                if (inUl) {
                    inUl = false;
                    result = "</ul>" + line;
                }
                if (inOl) {
                    inOl = false;
                    result = "</ol>" + line;
                }
                return result;
            }
        });
        if (inUl)
            processedLines.push("</ul>");
        if (inOl)
            processedLines.push("</ol>");
        html = processedLines.join("\n");
        // Line breaks and paragraphs
        const blocks = html.split(/\n\s*\n/);
        html = blocks.map(block => {
            const trimmed = block.trim();
            if (!trimmed)
                return "";
            if (trimmed.startsWith("<ul"))
                return block;
            if (trimmed.startsWith("<ol"))
                return block;
            if (trimmed.match(/^<h\d/))
                return block;
            if (trimmed.startsWith("<div"))
                return block; // Keep footers/buttons intact
            return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
        }).join("\n");
        return html;
    }

    // --- Utility source: email/emailStyles.ts ---
    "use strict";
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

    // --- Utility source: email/mailjetRenderer.ts ---
    "use strict";
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

    // --- Utility source: email/queueProcessor.ts ---
    "use strict";
    /**
     * Retrieves HMAC secret for signature tokens.
     */
    function getQueueHmacSecret(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return (parsed && parsed.secret) ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function processEmailQueue(app) {
        const settings = app.settings();
        if (!settings.smtp || !settings.smtp.enabled) {
            console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
            return;
        }
        const EMAIL_QUEUE_BATCH_SIZE = 150;
        const EMAIL_QUEUE_MAX_ATTEMPTS = 3;
        const EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION = 6;
        // Stale Processing record recovery
        try {
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Pending',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND (attempts IS NULL OR attempts < {:maxAttempts})
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Failed',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND attempts >= {:maxAttempts}
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
        }
        catch (recoverErr) {
            console.log("[Email Queue] Error recovering stale records: " + recoverErr);
        }
        // Build variables used for layout rendering
        const secret = getQueueHmacSecret(app);
        let baseUrl = "http://localhost:5173";
        let mailingAddress = "123 Choir St, Harmony City, HC 12345";
        let choirName = "";
        try {
            const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
            const comms = parseJsonField(commRecord.get("value"));
            if (comms === null || comms === void 0 ? void 0 : comms.frontendUrl)
                baseUrl = comms.frontendUrl;
            if (comms === null || comms === void 0 ? void 0 : comms.mailingAddress)
                mailingAddress = comms.mailingAddress;
        }
        catch (_a) {
            // use default baseUrl and mailingAddress
        }
        baseUrl = normalizeBaseUrl(baseUrl);
        try {
            const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
            const val = parseJsonField(choirRecord.get("value"));
            if (val)
                choirName = val;
        }
        catch (_b) {
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
        catch (_c) {
            // use default timezone
        }
        let totalClaimed = 0;
        for (let batchNumber = 1; batchNumber <= EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION; batchNumber++) {
            const runId = $security.randomString(20);
            console.log(`[Email Queue] Starting processing run: ${runId} (batch ${batchNumber}/${EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION})`);
            // Atomic SQLite-level claiming
            try {
                app.db().newQuery(`
                    UPDATE emailQueue
                    SET status = 'Processing',
                        processingRunId = {:runId},
                        processingStartedAt = datetime('now')
                    WHERE id IN (
                        SELECT id
                        FROM emailQueue
                        WHERE status = 'Pending'
                          AND (attempts IS NULL OR attempts < {:maxAttempts})
                        ORDER BY created ASC
                        LIMIT {:batchSize}
                    )
                `).bind({
                    runId: runId,
                    maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
                    batchSize: EMAIL_QUEUE_BATCH_SIZE
                }).execute();
            }
            catch (claimErr) {
                console.log("[Email Queue] Error claiming records for run " + runId + ": " + claimErr);
                return;
            }
            const records = app.findRecordsByFilter("emailQueue", "status = 'Processing' && processingRunId = {:runId}", "created", EMAIL_QUEUE_BATCH_SIZE, 0, { runId });
            if (!records || records.length === 0) {
                if (totalClaimed === 0) {
                    console.log("[Email Queue] No records claimed for run: " + runId);
                }
                break;
            }
            totalClaimed += records.length;
            console.log(`[Email Queue] Claimed ${records.length} records for run: ${runId}`);
            records.forEach((record) => {
                try {
                    const rawContent = record.get("rawContent") || "";
                    const recipientId = record.get("recipientId");
                    const recipientEmail = record.get("recipientEmail");
                    const recipientName = record.get("recipientName") || "Singer";
                    const filters = parseJsonField(record.get("filters")) || {};
                    let htmlBody = "";
                    if (filters.contentType === "html") {
                        htmlBody = rawContent;
                    }
                    else {
                        // Temporarily protect placeholders containing underscores from markdown parsing
                        const protectedContent = rawContent
                            .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                            .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                            .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                            .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                            .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                            .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
                        htmlBody = renderMarkdown(protectedContent);
                        // Restore protected placeholders
                        htmlBody = htmlBody
                            .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                            .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                            .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                            .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                            .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                            .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
                    }
                    let subject = record.get("subject") || "";
                    subject = subject.replace(/{singerName}/g, () => sanitizeEmailSubject(recipientName));
                    // Fetch dynamic event details if enqueued under filters
                    let event = null;
                    if (filters && filters.eventId) {
                        try {
                            event = app.findRecordById("events", filters.eventId);
                        }
                        catch (_a) {
                            // event not found
                        }
                    }
                    // Perform template placeholder resolutions (same engine as legacy)
                    htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));
                    htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, () => escapeHtml(mailingAddress));
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
                        catch (_b) {
                            // venue not found
                        }
                        const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                        const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                        // Resolve event placeholders in subject too
                        subject = subject.replace(/{eventTitle}/g, () => sanitizeEmailSubject(eventTitle))
                            .replace(/{eventType}/g, () => sanitizeEmailSubject(eventType))
                            .replace(/{eventDate}/g, () => sanitizeEmailSubject(dateShort));
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
                            catch (_c) {
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
                                    catch (_d) {
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
                        htmlBody = htmlBody.replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
                            .replace(/{eventType}/g, () => escapeHtml(eventType))
                            .replace(/{eventDate}/g, () => escapeHtml(dateShort))
                            .replace(/{eventLocation}/g, () => escapeHtml(venueName))
                            .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
                            .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
                            .replace(/{eventInfo}/g, () => eventInfoHtml)
                            .replace(/{firstRehearsalCalendarLink}/g, () => firstRehearsalHtml)
                            .replace(/{eventCalendarLink}/g, () => eventCalendarHtml);
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
                            htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, () => rsvpHtml).replace(/{rsvpLinks}/g, () => rsvpHtml);
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
                            htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, () => playerHtml).replace(/{playerLink}/g, () => playerHtml);
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
                                const question = pollRecord === null || pollRecord === void 0 ? void 0 : pollRecord.get("question");
                                if (typeof question === "string" && question.trim()) {
                                    pollButtonLabel = question.trim();
                                }
                            }
                            catch (_a) {
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
                        htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, () => unsubscribeUrl);
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
                    record.set("sentAt", new Date().toISOString());
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    record.set("errorMessage", "");
                    console.log(`[Email Queue] Sent record: ${record.id}`);
                }
                catch (err) {
                    const rawAttempts = record.get("attempts");
                    const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
                    const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
                    record.set("attempts", currentAttempts);
                    const message = err instanceof Error ? err.message : String(err);
                    record.set("errorMessage", message);
                    const nextStatus = currentAttempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? "Failed" : "Pending";
                    record.set("status", nextStatus);
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    console.log(`[Email Queue] Failed record: ${record.id}, attempts: ${currentAttempts}, error: ${message}`);
                }
                finally {
                    app.save(record);
                }
            });
            if (records.length < EMAIL_QUEUE_BATCH_SIZE) {
                break;
            }
        }
        if (totalClaimed >= EMAIL_QUEUE_BATCH_SIZE * EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION) {
            console.log("[Email Queue] Max batches reached; additional pending records will continue in the next invocation.");
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

    console.log("[Cron Engine] Evaluating pending outbound message matrices...");
    processEmailQueue($app);
});

// --- RECORD HOOKS ---

onRecordAfterCreateSuccess((e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/messageHookRules.ts ---
    "use strict";
    function shouldQueueMessage(record, oldStatus) {
        if (!record)
            return false;
        const status = record.get("status") || "Sent";
        if (status !== "Sent")
            return false;
        const type = record.get("type");
        if (type !== "Email" && type !== "Both")
            return false;
        // If update, check status transition to prevent duplicate enqueues
        if (oldStatus !== undefined) {
            return oldStatus !== "Sent";
        }
        return true;
    }
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

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: email/emailRendering.ts ---
    "use strict";
    function renderMarkdown(text) {
        if (!text)
            return "";
        // Escape raw HTML first
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
        html = html.replace(/^(#{1,6})\s+(.*)/gm, (_, hashes, content) => {
            const level = hashes.length;
            // Using inline styles for headings for better email client compatibility
            const fontSize = level === 1 ? '1.8rem' : level === 2 ? '1.5rem' : level === 3 ? '1.25rem' : '1.1rem';
            return `<h${level} style="margin: 16px 0 8px 0; line-height: 1.2; font-size: ${fontSize}; color: #2c3e50;">${content}</h${level}>`;
        });
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
        // Lists (Ordered and Unordered)
        const lines = html.split("\n");
        let inUl = false;
        let inOl = false;
        const processedLines = lines.map(line => {
            const ulMatch = line.match(/^(\*|-)\s+(.*)/);
            const olMatch = line.match(/^(\d+)\.\s+(.*)/);
            if (ulMatch) {
                const content = ulMatch[2];
                let prefix = "";
                if (inOl) {
                    inOl = false;
                    prefix = "</ol>";
                }
                if (!inUl) {
                    inUl = true;
                    return prefix + `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else if (olMatch) {
                const content = olMatch[2];
                let prefix = "";
                if (inUl) {
                    inUl = false;
                    prefix = "</ul>";
                }
                if (!inOl) {
                    inOl = true;
                    return prefix + `<ol style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else {
                let result = line;
                if (inUl) {
                    inUl = false;
                    result = "</ul>" + line;
                }
                if (inOl) {
                    inOl = false;
                    result = "</ol>" + line;
                }
                return result;
            }
        });
        if (inUl)
            processedLines.push("</ul>");
        if (inOl)
            processedLines.push("</ol>");
        html = processedLines.join("\n");
        // Line breaks and paragraphs
        const blocks = html.split(/\n\s*\n/);
        html = blocks.map(block => {
            const trimmed = block.trim();
            if (!trimmed)
                return "";
            if (trimmed.startsWith("<ul"))
                return block;
            if (trimmed.startsWith("<ol"))
                return block;
            if (trimmed.match(/^<h\d/))
                return block;
            if (trimmed.startsWith("<div"))
                return block; // Keep footers/buttons intact
            return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
        }).join("\n");
        return html;
    }

    // --- Utility source: email/emailStyles.ts ---
    "use strict";
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

    // --- Utility source: email/mailjetRenderer.ts ---
    "use strict";
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

    // --- Utility source: email/queueProcessor.ts ---
    "use strict";
    /**
     * Retrieves HMAC secret for signature tokens.
     */
    function getQueueHmacSecret(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return (parsed && parsed.secret) ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function processEmailQueue(app) {
        const settings = app.settings();
        if (!settings.smtp || !settings.smtp.enabled) {
            console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
            return;
        }
        const EMAIL_QUEUE_BATCH_SIZE = 150;
        const EMAIL_QUEUE_MAX_ATTEMPTS = 3;
        const EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION = 6;
        // Stale Processing record recovery
        try {
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Pending',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND (attempts IS NULL OR attempts < {:maxAttempts})
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Failed',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND attempts >= {:maxAttempts}
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
        }
        catch (recoverErr) {
            console.log("[Email Queue] Error recovering stale records: " + recoverErr);
        }
        // Build variables used for layout rendering
        const secret = getQueueHmacSecret(app);
        let baseUrl = "http://localhost:5173";
        let mailingAddress = "123 Choir St, Harmony City, HC 12345";
        let choirName = "";
        try {
            const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
            const comms = parseJsonField(commRecord.get("value"));
            if (comms === null || comms === void 0 ? void 0 : comms.frontendUrl)
                baseUrl = comms.frontendUrl;
            if (comms === null || comms === void 0 ? void 0 : comms.mailingAddress)
                mailingAddress = comms.mailingAddress;
        }
        catch (_a) {
            // use default baseUrl and mailingAddress
        }
        baseUrl = normalizeBaseUrl(baseUrl);
        try {
            const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
            const val = parseJsonField(choirRecord.get("value"));
            if (val)
                choirName = val;
        }
        catch (_b) {
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
        catch (_c) {
            // use default timezone
        }
        let totalClaimed = 0;
        for (let batchNumber = 1; batchNumber <= EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION; batchNumber++) {
            const runId = $security.randomString(20);
            console.log(`[Email Queue] Starting processing run: ${runId} (batch ${batchNumber}/${EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION})`);
            // Atomic SQLite-level claiming
            try {
                app.db().newQuery(`
                    UPDATE emailQueue
                    SET status = 'Processing',
                        processingRunId = {:runId},
                        processingStartedAt = datetime('now')
                    WHERE id IN (
                        SELECT id
                        FROM emailQueue
                        WHERE status = 'Pending'
                          AND (attempts IS NULL OR attempts < {:maxAttempts})
                        ORDER BY created ASC
                        LIMIT {:batchSize}
                    )
                `).bind({
                    runId: runId,
                    maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
                    batchSize: EMAIL_QUEUE_BATCH_SIZE
                }).execute();
            }
            catch (claimErr) {
                console.log("[Email Queue] Error claiming records for run " + runId + ": " + claimErr);
                return;
            }
            const records = app.findRecordsByFilter("emailQueue", "status = 'Processing' && processingRunId = {:runId}", "created", EMAIL_QUEUE_BATCH_SIZE, 0, { runId });
            if (!records || records.length === 0) {
                if (totalClaimed === 0) {
                    console.log("[Email Queue] No records claimed for run: " + runId);
                }
                break;
            }
            totalClaimed += records.length;
            console.log(`[Email Queue] Claimed ${records.length} records for run: ${runId}`);
            records.forEach((record) => {
                try {
                    const rawContent = record.get("rawContent") || "";
                    const recipientId = record.get("recipientId");
                    const recipientEmail = record.get("recipientEmail");
                    const recipientName = record.get("recipientName") || "Singer";
                    const filters = parseJsonField(record.get("filters")) || {};
                    let htmlBody = "";
                    if (filters.contentType === "html") {
                        htmlBody = rawContent;
                    }
                    else {
                        // Temporarily protect placeholders containing underscores from markdown parsing
                        const protectedContent = rawContent
                            .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                            .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                            .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                            .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                            .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                            .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
                        htmlBody = renderMarkdown(protectedContent);
                        // Restore protected placeholders
                        htmlBody = htmlBody
                            .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                            .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                            .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                            .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                            .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                            .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
                    }
                    let subject = record.get("subject") || "";
                    subject = subject.replace(/{singerName}/g, () => sanitizeEmailSubject(recipientName));
                    // Fetch dynamic event details if enqueued under filters
                    let event = null;
                    if (filters && filters.eventId) {
                        try {
                            event = app.findRecordById("events", filters.eventId);
                        }
                        catch (_a) {
                            // event not found
                        }
                    }
                    // Perform template placeholder resolutions (same engine as legacy)
                    htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));
                    htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, () => escapeHtml(mailingAddress));
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
                        catch (_b) {
                            // venue not found
                        }
                        const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                        const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                        // Resolve event placeholders in subject too
                        subject = subject.replace(/{eventTitle}/g, () => sanitizeEmailSubject(eventTitle))
                            .replace(/{eventType}/g, () => sanitizeEmailSubject(eventType))
                            .replace(/{eventDate}/g, () => sanitizeEmailSubject(dateShort));
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
                            catch (_c) {
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
                                    catch (_d) {
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
                        htmlBody = htmlBody.replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
                            .replace(/{eventType}/g, () => escapeHtml(eventType))
                            .replace(/{eventDate}/g, () => escapeHtml(dateShort))
                            .replace(/{eventLocation}/g, () => escapeHtml(venueName))
                            .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
                            .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
                            .replace(/{eventInfo}/g, () => eventInfoHtml)
                            .replace(/{firstRehearsalCalendarLink}/g, () => firstRehearsalHtml)
                            .replace(/{eventCalendarLink}/g, () => eventCalendarHtml);
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
                            htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, () => rsvpHtml).replace(/{rsvpLinks}/g, () => rsvpHtml);
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
                            htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, () => playerHtml).replace(/{playerLink}/g, () => playerHtml);
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
                                const question = pollRecord === null || pollRecord === void 0 ? void 0 : pollRecord.get("question");
                                if (typeof question === "string" && question.trim()) {
                                    pollButtonLabel = question.trim();
                                }
                            }
                            catch (_a) {
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
                        htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, () => unsubscribeUrl);
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
                    record.set("sentAt", new Date().toISOString());
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    record.set("errorMessage", "");
                    console.log(`[Email Queue] Sent record: ${record.id}`);
                }
                catch (err) {
                    const rawAttempts = record.get("attempts");
                    const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
                    const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
                    record.set("attempts", currentAttempts);
                    const message = err instanceof Error ? err.message : String(err);
                    record.set("errorMessage", message);
                    const nextStatus = currentAttempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? "Failed" : "Pending";
                    record.set("status", nextStatus);
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    console.log(`[Email Queue] Failed record: ${record.id}, attempts: ${currentAttempts}, error: ${message}`);
                }
                finally {
                    app.save(record);
                }
            });
            if (records.length < EMAIL_QUEUE_BATCH_SIZE) {
                break;
            }
        }
        if (totalClaimed >= EMAIL_QUEUE_BATCH_SIZE * EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION) {
            console.log("[Email Queue] Max batches reached; additional pending records will continue in the next invocation.");
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

    try {
        const record = e?.record;
        if (record && shouldQueueMessage(record)) {
            enqueueBulkMessage($app, record);
            processEmailQueue($app);
        }
    } catch (hookErr) {
        console.log("[Hook Error] onRecordAfterCreateSuccess: " + hookErr);
    }
}, "messages");

onRecordAfterUpdateSuccess((e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/messageHookRules.ts ---
    "use strict";
    function shouldQueueMessage(record, oldStatus) {
        if (!record)
            return false;
        const status = record.get("status") || "Sent";
        if (status !== "Sent")
            return false;
        const type = record.get("type");
        if (type !== "Email" && type !== "Both")
            return false;
        // If update, check status transition to prevent duplicate enqueues
        if (oldStatus !== undefined) {
            return oldStatus !== "Sent";
        }
        return true;
    }
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

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: email/emailRendering.ts ---
    "use strict";
    function renderMarkdown(text) {
        if (!text)
            return "";
        // Escape raw HTML first
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
        html = html.replace(/^(#{1,6})\s+(.*)/gm, (_, hashes, content) => {
            const level = hashes.length;
            // Using inline styles for headings for better email client compatibility
            const fontSize = level === 1 ? '1.8rem' : level === 2 ? '1.5rem' : level === 3 ? '1.25rem' : '1.1rem';
            return `<h${level} style="margin: 16px 0 8px 0; line-height: 1.2; font-size: ${fontSize}; color: #2c3e50;">${content}</h${level}>`;
        });
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
        // Lists (Ordered and Unordered)
        const lines = html.split("\n");
        let inUl = false;
        let inOl = false;
        const processedLines = lines.map(line => {
            const ulMatch = line.match(/^(\*|-)\s+(.*)/);
            const olMatch = line.match(/^(\d+)\.\s+(.*)/);
            if (ulMatch) {
                const content = ulMatch[2];
                let prefix = "";
                if (inOl) {
                    inOl = false;
                    prefix = "</ol>";
                }
                if (!inUl) {
                    inUl = true;
                    return prefix + `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else if (olMatch) {
                const content = olMatch[2];
                let prefix = "";
                if (inUl) {
                    inUl = false;
                    prefix = "</ul>";
                }
                if (!inOl) {
                    inOl = true;
                    return prefix + `<ol style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else {
                let result = line;
                if (inUl) {
                    inUl = false;
                    result = "</ul>" + line;
                }
                if (inOl) {
                    inOl = false;
                    result = "</ol>" + line;
                }
                return result;
            }
        });
        if (inUl)
            processedLines.push("</ul>");
        if (inOl)
            processedLines.push("</ol>");
        html = processedLines.join("\n");
        // Line breaks and paragraphs
        const blocks = html.split(/\n\s*\n/);
        html = blocks.map(block => {
            const trimmed = block.trim();
            if (!trimmed)
                return "";
            if (trimmed.startsWith("<ul"))
                return block;
            if (trimmed.startsWith("<ol"))
                return block;
            if (trimmed.match(/^<h\d/))
                return block;
            if (trimmed.startsWith("<div"))
                return block; // Keep footers/buttons intact
            return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
        }).join("\n");
        return html;
    }

    // --- Utility source: email/emailStyles.ts ---
    "use strict";
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

    // --- Utility source: email/mailjetRenderer.ts ---
    "use strict";
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

    // --- Utility source: email/queueProcessor.ts ---
    "use strict";
    /**
     * Retrieves HMAC secret for signature tokens.
     */
    function getQueueHmacSecret(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return (parsed && parsed.secret) ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function processEmailQueue(app) {
        const settings = app.settings();
        if (!settings.smtp || !settings.smtp.enabled) {
            console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
            return;
        }
        const EMAIL_QUEUE_BATCH_SIZE = 150;
        const EMAIL_QUEUE_MAX_ATTEMPTS = 3;
        const EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION = 6;
        // Stale Processing record recovery
        try {
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Pending',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND (attempts IS NULL OR attempts < {:maxAttempts})
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Failed',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND attempts >= {:maxAttempts}
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
        }
        catch (recoverErr) {
            console.log("[Email Queue] Error recovering stale records: " + recoverErr);
        }
        // Build variables used for layout rendering
        const secret = getQueueHmacSecret(app);
        let baseUrl = "http://localhost:5173";
        let mailingAddress = "123 Choir St, Harmony City, HC 12345";
        let choirName = "";
        try {
            const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
            const comms = parseJsonField(commRecord.get("value"));
            if (comms === null || comms === void 0 ? void 0 : comms.frontendUrl)
                baseUrl = comms.frontendUrl;
            if (comms === null || comms === void 0 ? void 0 : comms.mailingAddress)
                mailingAddress = comms.mailingAddress;
        }
        catch (_a) {
            // use default baseUrl and mailingAddress
        }
        baseUrl = normalizeBaseUrl(baseUrl);
        try {
            const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
            const val = parseJsonField(choirRecord.get("value"));
            if (val)
                choirName = val;
        }
        catch (_b) {
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
        catch (_c) {
            // use default timezone
        }
        let totalClaimed = 0;
        for (let batchNumber = 1; batchNumber <= EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION; batchNumber++) {
            const runId = $security.randomString(20);
            console.log(`[Email Queue] Starting processing run: ${runId} (batch ${batchNumber}/${EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION})`);
            // Atomic SQLite-level claiming
            try {
                app.db().newQuery(`
                    UPDATE emailQueue
                    SET status = 'Processing',
                        processingRunId = {:runId},
                        processingStartedAt = datetime('now')
                    WHERE id IN (
                        SELECT id
                        FROM emailQueue
                        WHERE status = 'Pending'
                          AND (attempts IS NULL OR attempts < {:maxAttempts})
                        ORDER BY created ASC
                        LIMIT {:batchSize}
                    )
                `).bind({
                    runId: runId,
                    maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
                    batchSize: EMAIL_QUEUE_BATCH_SIZE
                }).execute();
            }
            catch (claimErr) {
                console.log("[Email Queue] Error claiming records for run " + runId + ": " + claimErr);
                return;
            }
            const records = app.findRecordsByFilter("emailQueue", "status = 'Processing' && processingRunId = {:runId}", "created", EMAIL_QUEUE_BATCH_SIZE, 0, { runId });
            if (!records || records.length === 0) {
                if (totalClaimed === 0) {
                    console.log("[Email Queue] No records claimed for run: " + runId);
                }
                break;
            }
            totalClaimed += records.length;
            console.log(`[Email Queue] Claimed ${records.length} records for run: ${runId}`);
            records.forEach((record) => {
                try {
                    const rawContent = record.get("rawContent") || "";
                    const recipientId = record.get("recipientId");
                    const recipientEmail = record.get("recipientEmail");
                    const recipientName = record.get("recipientName") || "Singer";
                    const filters = parseJsonField(record.get("filters")) || {};
                    let htmlBody = "";
                    if (filters.contentType === "html") {
                        htmlBody = rawContent;
                    }
                    else {
                        // Temporarily protect placeholders containing underscores from markdown parsing
                        const protectedContent = rawContent
                            .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                            .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                            .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                            .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                            .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                            .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
                        htmlBody = renderMarkdown(protectedContent);
                        // Restore protected placeholders
                        htmlBody = htmlBody
                            .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                            .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                            .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                            .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                            .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                            .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
                    }
                    let subject = record.get("subject") || "";
                    subject = subject.replace(/{singerName}/g, () => sanitizeEmailSubject(recipientName));
                    // Fetch dynamic event details if enqueued under filters
                    let event = null;
                    if (filters && filters.eventId) {
                        try {
                            event = app.findRecordById("events", filters.eventId);
                        }
                        catch (_a) {
                            // event not found
                        }
                    }
                    // Perform template placeholder resolutions (same engine as legacy)
                    htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));
                    htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, () => escapeHtml(mailingAddress));
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
                        catch (_b) {
                            // venue not found
                        }
                        const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                        const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                        // Resolve event placeholders in subject too
                        subject = subject.replace(/{eventTitle}/g, () => sanitizeEmailSubject(eventTitle))
                            .replace(/{eventType}/g, () => sanitizeEmailSubject(eventType))
                            .replace(/{eventDate}/g, () => sanitizeEmailSubject(dateShort));
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
                            catch (_c) {
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
                                    catch (_d) {
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
                        htmlBody = htmlBody.replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
                            .replace(/{eventType}/g, () => escapeHtml(eventType))
                            .replace(/{eventDate}/g, () => escapeHtml(dateShort))
                            .replace(/{eventLocation}/g, () => escapeHtml(venueName))
                            .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
                            .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
                            .replace(/{eventInfo}/g, () => eventInfoHtml)
                            .replace(/{firstRehearsalCalendarLink}/g, () => firstRehearsalHtml)
                            .replace(/{eventCalendarLink}/g, () => eventCalendarHtml);
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
                            htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, () => rsvpHtml).replace(/{rsvpLinks}/g, () => rsvpHtml);
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
                            htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, () => playerHtml).replace(/{playerLink}/g, () => playerHtml);
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
                                const question = pollRecord === null || pollRecord === void 0 ? void 0 : pollRecord.get("question");
                                if (typeof question === "string" && question.trim()) {
                                    pollButtonLabel = question.trim();
                                }
                            }
                            catch (_a) {
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
                        htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, () => unsubscribeUrl);
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
                    record.set("sentAt", new Date().toISOString());
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    record.set("errorMessage", "");
                    console.log(`[Email Queue] Sent record: ${record.id}`);
                }
                catch (err) {
                    const rawAttempts = record.get("attempts");
                    const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
                    const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
                    record.set("attempts", currentAttempts);
                    const message = err instanceof Error ? err.message : String(err);
                    record.set("errorMessage", message);
                    const nextStatus = currentAttempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? "Failed" : "Pending";
                    record.set("status", nextStatus);
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    console.log(`[Email Queue] Failed record: ${record.id}, attempts: ${currentAttempts}, error: ${message}`);
                }
                finally {
                    app.save(record);
                }
            });
            if (records.length < EMAIL_QUEUE_BATCH_SIZE) {
                break;
            }
        }
        if (totalClaimed >= EMAIL_QUEUE_BATCH_SIZE * EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION) {
            console.log("[Email Queue] Max batches reached; additional pending records will continue in the next invocation.");
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

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
    }
}, "messages");

onRecordAfterCreateSuccess((e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: email/emailRendering.ts ---
    "use strict";
    function renderMarkdown(text) {
        if (!text)
            return "";
        // Escape raw HTML first
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
        html = html.replace(/^(#{1,6})\s+(.*)/gm, (_, hashes, content) => {
            const level = hashes.length;
            // Using inline styles for headings for better email client compatibility
            const fontSize = level === 1 ? '1.8rem' : level === 2 ? '1.5rem' : level === 3 ? '1.25rem' : '1.1rem';
            return `<h${level} style="margin: 16px 0 8px 0; line-height: 1.2; font-size: ${fontSize}; color: #2c3e50;">${content}</h${level}>`;
        });
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
        // Lists (Ordered and Unordered)
        const lines = html.split("\n");
        let inUl = false;
        let inOl = false;
        const processedLines = lines.map(line => {
            const ulMatch = line.match(/^(\*|-)\s+(.*)/);
            const olMatch = line.match(/^(\d+)\.\s+(.*)/);
            if (ulMatch) {
                const content = ulMatch[2];
                let prefix = "";
                if (inOl) {
                    inOl = false;
                    prefix = "</ol>";
                }
                if (!inUl) {
                    inUl = true;
                    return prefix + `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else if (olMatch) {
                const content = olMatch[2];
                let prefix = "";
                if (inUl) {
                    inUl = false;
                    prefix = "</ul>";
                }
                if (!inOl) {
                    inOl = true;
                    return prefix + `<ol style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else {
                let result = line;
                if (inUl) {
                    inUl = false;
                    result = "</ul>" + line;
                }
                if (inOl) {
                    inOl = false;
                    result = "</ol>" + line;
                }
                return result;
            }
        });
        if (inUl)
            processedLines.push("</ul>");
        if (inOl)
            processedLines.push("</ol>");
        html = processedLines.join("\n");
        // Line breaks and paragraphs
        const blocks = html.split(/\n\s*\n/);
        html = blocks.map(block => {
            const trimmed = block.trim();
            if (!trimmed)
                return "";
            if (trimmed.startsWith("<ul"))
                return block;
            if (trimmed.startsWith("<ol"))
                return block;
            if (trimmed.match(/^<h\d/))
                return block;
            if (trimmed.startsWith("<div"))
                return block; // Keep footers/buttons intact
            return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
        }).join("\n");
        return html;
    }

    // --- Utility source: email/emailStyles.ts ---
    "use strict";
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

    // --- Utility source: email/mailjetRenderer.ts ---
    "use strict";
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

    // --- Utility source: email/queueProcessor.ts ---
    "use strict";
    /**
     * Retrieves HMAC secret for signature tokens.
     */
    function getQueueHmacSecret(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return (parsed && parsed.secret) ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function processEmailQueue(app) {
        const settings = app.settings();
        if (!settings.smtp || !settings.smtp.enabled) {
            console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
            return;
        }
        const EMAIL_QUEUE_BATCH_SIZE = 150;
        const EMAIL_QUEUE_MAX_ATTEMPTS = 3;
        const EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION = 6;
        // Stale Processing record recovery
        try {
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Pending',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND (attempts IS NULL OR attempts < {:maxAttempts})
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Failed',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND attempts >= {:maxAttempts}
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
        }
        catch (recoverErr) {
            console.log("[Email Queue] Error recovering stale records: " + recoverErr);
        }
        // Build variables used for layout rendering
        const secret = getQueueHmacSecret(app);
        let baseUrl = "http://localhost:5173";
        let mailingAddress = "123 Choir St, Harmony City, HC 12345";
        let choirName = "";
        try {
            const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
            const comms = parseJsonField(commRecord.get("value"));
            if (comms === null || comms === void 0 ? void 0 : comms.frontendUrl)
                baseUrl = comms.frontendUrl;
            if (comms === null || comms === void 0 ? void 0 : comms.mailingAddress)
                mailingAddress = comms.mailingAddress;
        }
        catch (_a) {
            // use default baseUrl and mailingAddress
        }
        baseUrl = normalizeBaseUrl(baseUrl);
        try {
            const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
            const val = parseJsonField(choirRecord.get("value"));
            if (val)
                choirName = val;
        }
        catch (_b) {
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
        catch (_c) {
            // use default timezone
        }
        let totalClaimed = 0;
        for (let batchNumber = 1; batchNumber <= EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION; batchNumber++) {
            const runId = $security.randomString(20);
            console.log(`[Email Queue] Starting processing run: ${runId} (batch ${batchNumber}/${EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION})`);
            // Atomic SQLite-level claiming
            try {
                app.db().newQuery(`
                    UPDATE emailQueue
                    SET status = 'Processing',
                        processingRunId = {:runId},
                        processingStartedAt = datetime('now')
                    WHERE id IN (
                        SELECT id
                        FROM emailQueue
                        WHERE status = 'Pending'
                          AND (attempts IS NULL OR attempts < {:maxAttempts})
                        ORDER BY created ASC
                        LIMIT {:batchSize}
                    )
                `).bind({
                    runId: runId,
                    maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
                    batchSize: EMAIL_QUEUE_BATCH_SIZE
                }).execute();
            }
            catch (claimErr) {
                console.log("[Email Queue] Error claiming records for run " + runId + ": " + claimErr);
                return;
            }
            const records = app.findRecordsByFilter("emailQueue", "status = 'Processing' && processingRunId = {:runId}", "created", EMAIL_QUEUE_BATCH_SIZE, 0, { runId });
            if (!records || records.length === 0) {
                if (totalClaimed === 0) {
                    console.log("[Email Queue] No records claimed for run: " + runId);
                }
                break;
            }
            totalClaimed += records.length;
            console.log(`[Email Queue] Claimed ${records.length} records for run: ${runId}`);
            records.forEach((record) => {
                try {
                    const rawContent = record.get("rawContent") || "";
                    const recipientId = record.get("recipientId");
                    const recipientEmail = record.get("recipientEmail");
                    const recipientName = record.get("recipientName") || "Singer";
                    const filters = parseJsonField(record.get("filters")) || {};
                    let htmlBody = "";
                    if (filters.contentType === "html") {
                        htmlBody = rawContent;
                    }
                    else {
                        // Temporarily protect placeholders containing underscores from markdown parsing
                        const protectedContent = rawContent
                            .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                            .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                            .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                            .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                            .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                            .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
                        htmlBody = renderMarkdown(protectedContent);
                        // Restore protected placeholders
                        htmlBody = htmlBody
                            .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                            .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                            .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                            .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                            .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                            .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
                    }
                    let subject = record.get("subject") || "";
                    subject = subject.replace(/{singerName}/g, () => sanitizeEmailSubject(recipientName));
                    // Fetch dynamic event details if enqueued under filters
                    let event = null;
                    if (filters && filters.eventId) {
                        try {
                            event = app.findRecordById("events", filters.eventId);
                        }
                        catch (_a) {
                            // event not found
                        }
                    }
                    // Perform template placeholder resolutions (same engine as legacy)
                    htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));
                    htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, () => escapeHtml(mailingAddress));
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
                        catch (_b) {
                            // venue not found
                        }
                        const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                        const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                        // Resolve event placeholders in subject too
                        subject = subject.replace(/{eventTitle}/g, () => sanitizeEmailSubject(eventTitle))
                            .replace(/{eventType}/g, () => sanitizeEmailSubject(eventType))
                            .replace(/{eventDate}/g, () => sanitizeEmailSubject(dateShort));
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
                            catch (_c) {
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
                                    catch (_d) {
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
                        htmlBody = htmlBody.replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
                            .replace(/{eventType}/g, () => escapeHtml(eventType))
                            .replace(/{eventDate}/g, () => escapeHtml(dateShort))
                            .replace(/{eventLocation}/g, () => escapeHtml(venueName))
                            .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
                            .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
                            .replace(/{eventInfo}/g, () => eventInfoHtml)
                            .replace(/{firstRehearsalCalendarLink}/g, () => firstRehearsalHtml)
                            .replace(/{eventCalendarLink}/g, () => eventCalendarHtml);
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
                            htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, () => rsvpHtml).replace(/{rsvpLinks}/g, () => rsvpHtml);
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
                            htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, () => playerHtml).replace(/{playerLink}/g, () => playerHtml);
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
                                const question = pollRecord === null || pollRecord === void 0 ? void 0 : pollRecord.get("question");
                                if (typeof question === "string" && question.trim()) {
                                    pollButtonLabel = question.trim();
                                }
                            }
                            catch (_a) {
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
                        htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, () => unsubscribeUrl);
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
                    record.set("sentAt", new Date().toISOString());
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    record.set("errorMessage", "");
                    console.log(`[Email Queue] Sent record: ${record.id}`);
                }
                catch (err) {
                    const rawAttempts = record.get("attempts");
                    const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
                    const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
                    record.set("attempts", currentAttempts);
                    const message = err instanceof Error ? err.message : String(err);
                    record.set("errorMessage", message);
                    const nextStatus = currentAttempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? "Failed" : "Pending";
                    record.set("status", nextStatus);
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    console.log(`[Email Queue] Failed record: ${record.id}, attempts: ${currentAttempts}, error: ${message}`);
                }
                finally {
                    app.save(record);
                }
            });
            if (records.length < EMAIL_QUEUE_BATCH_SIZE) {
                break;
            }
        }
        if (totalClaimed >= EMAIL_QUEUE_BATCH_SIZE * EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION) {
            console.log("[Email Queue] Max batches reached; additional pending records will continue in the next invocation.");
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

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
            formattedTimeSlots = "\n" + formattedList.join("\n");
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
                        frontendUrl = commParsed.frontendUrl.replace(/\/+$/, "");
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

                const cleanSlots = formattedTimeSlots.replace(/\n/g, "<br/>");
                const adminEmailBody = [
                    "<p>A new audition inquiry has been submitted.</p>",
                    "<ul>",
                    "  <li><strong>Name:</strong> " + escapeHtml(audition.get("name") || "") + "</li>",
                    "  <li><strong>Contact:</strong> " + escapeHtml(contact) + "</li>",
                    "  <li><strong>Voice Part:</strong> " + escapeHtml(audition.get("voicePart") || "Not specified") + "</li>",
                    "  <li><strong>Target Performance:</strong> " + escapeHtml(targetPerfName) + "</li>",
                    "  <li><strong>Requested Slots:</strong><br/>" + cleanSlots + "</li>",
                    "  <li><strong>Experience:</strong><br/>" + escapeHtml(audition.get("experience") || "None provided").replace(/\n/g, "<br/>") + "</li>",
                    "</ul>",
                    "<p><a href=\"" + frontendUrl + "/admin/auditions\" style=\"display:inline-block;padding:10px 16px;background-color:#1b4d3e;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;\">Review Auditions Dashboard</a></p>"
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
    }
}, "auditions");

onRecordAfterUpdateSuccess((e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: email/emailRendering.ts ---
    "use strict";
    function renderMarkdown(text) {
        if (!text)
            return "";
        // Escape raw HTML first
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
        html = html.replace(/^(#{1,6})\s+(.*)/gm, (_, hashes, content) => {
            const level = hashes.length;
            // Using inline styles for headings for better email client compatibility
            const fontSize = level === 1 ? '1.8rem' : level === 2 ? '1.5rem' : level === 3 ? '1.25rem' : '1.1rem';
            return `<h${level} style="margin: 16px 0 8px 0; line-height: 1.2; font-size: ${fontSize}; color: #2c3e50;">${content}</h${level}>`;
        });
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
        // Lists (Ordered and Unordered)
        const lines = html.split("\n");
        let inUl = false;
        let inOl = false;
        const processedLines = lines.map(line => {
            const ulMatch = line.match(/^(\*|-)\s+(.*)/);
            const olMatch = line.match(/^(\d+)\.\s+(.*)/);
            if (ulMatch) {
                const content = ulMatch[2];
                let prefix = "";
                if (inOl) {
                    inOl = false;
                    prefix = "</ol>";
                }
                if (!inUl) {
                    inUl = true;
                    return prefix + `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else if (olMatch) {
                const content = olMatch[2];
                let prefix = "";
                if (inUl) {
                    inUl = false;
                    prefix = "</ul>";
                }
                if (!inOl) {
                    inOl = true;
                    return prefix + `<ol style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else {
                let result = line;
                if (inUl) {
                    inUl = false;
                    result = "</ul>" + line;
                }
                if (inOl) {
                    inOl = false;
                    result = "</ol>" + line;
                }
                return result;
            }
        });
        if (inUl)
            processedLines.push("</ul>");
        if (inOl)
            processedLines.push("</ol>");
        html = processedLines.join("\n");
        // Line breaks and paragraphs
        const blocks = html.split(/\n\s*\n/);
        html = blocks.map(block => {
            const trimmed = block.trim();
            if (!trimmed)
                return "";
            if (trimmed.startsWith("<ul"))
                return block;
            if (trimmed.startsWith("<ol"))
                return block;
            if (trimmed.match(/^<h\d/))
                return block;
            if (trimmed.startsWith("<div"))
                return block; // Keep footers/buttons intact
            return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
        }).join("\n");
        return html;
    }

    // --- Utility source: email/emailStyles.ts ---
    "use strict";
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

    // --- Utility source: email/mailjetRenderer.ts ---
    "use strict";
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

    // --- Utility source: email/queueProcessor.ts ---
    "use strict";
    /**
     * Retrieves HMAC secret for signature tokens.
     */
    function getQueueHmacSecret(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return (parsed && parsed.secret) ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function processEmailQueue(app) {
        const settings = app.settings();
        if (!settings.smtp || !settings.smtp.enabled) {
            console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
            return;
        }
        const EMAIL_QUEUE_BATCH_SIZE = 150;
        const EMAIL_QUEUE_MAX_ATTEMPTS = 3;
        const EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION = 6;
        // Stale Processing record recovery
        try {
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Pending',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND (attempts IS NULL OR attempts < {:maxAttempts})
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Failed',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND attempts >= {:maxAttempts}
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
        }
        catch (recoverErr) {
            console.log("[Email Queue] Error recovering stale records: " + recoverErr);
        }
        // Build variables used for layout rendering
        const secret = getQueueHmacSecret(app);
        let baseUrl = "http://localhost:5173";
        let mailingAddress = "123 Choir St, Harmony City, HC 12345";
        let choirName = "";
        try {
            const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
            const comms = parseJsonField(commRecord.get("value"));
            if (comms === null || comms === void 0 ? void 0 : comms.frontendUrl)
                baseUrl = comms.frontendUrl;
            if (comms === null || comms === void 0 ? void 0 : comms.mailingAddress)
                mailingAddress = comms.mailingAddress;
        }
        catch (_a) {
            // use default baseUrl and mailingAddress
        }
        baseUrl = normalizeBaseUrl(baseUrl);
        try {
            const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
            const val = parseJsonField(choirRecord.get("value"));
            if (val)
                choirName = val;
        }
        catch (_b) {
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
        catch (_c) {
            // use default timezone
        }
        let totalClaimed = 0;
        for (let batchNumber = 1; batchNumber <= EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION; batchNumber++) {
            const runId = $security.randomString(20);
            console.log(`[Email Queue] Starting processing run: ${runId} (batch ${batchNumber}/${EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION})`);
            // Atomic SQLite-level claiming
            try {
                app.db().newQuery(`
                    UPDATE emailQueue
                    SET status = 'Processing',
                        processingRunId = {:runId},
                        processingStartedAt = datetime('now')
                    WHERE id IN (
                        SELECT id
                        FROM emailQueue
                        WHERE status = 'Pending'
                          AND (attempts IS NULL OR attempts < {:maxAttempts})
                        ORDER BY created ASC
                        LIMIT {:batchSize}
                    )
                `).bind({
                    runId: runId,
                    maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
                    batchSize: EMAIL_QUEUE_BATCH_SIZE
                }).execute();
            }
            catch (claimErr) {
                console.log("[Email Queue] Error claiming records for run " + runId + ": " + claimErr);
                return;
            }
            const records = app.findRecordsByFilter("emailQueue", "status = 'Processing' && processingRunId = {:runId}", "created", EMAIL_QUEUE_BATCH_SIZE, 0, { runId });
            if (!records || records.length === 0) {
                if (totalClaimed === 0) {
                    console.log("[Email Queue] No records claimed for run: " + runId);
                }
                break;
            }
            totalClaimed += records.length;
            console.log(`[Email Queue] Claimed ${records.length} records for run: ${runId}`);
            records.forEach((record) => {
                try {
                    const rawContent = record.get("rawContent") || "";
                    const recipientId = record.get("recipientId");
                    const recipientEmail = record.get("recipientEmail");
                    const recipientName = record.get("recipientName") || "Singer";
                    const filters = parseJsonField(record.get("filters")) || {};
                    let htmlBody = "";
                    if (filters.contentType === "html") {
                        htmlBody = rawContent;
                    }
                    else {
                        // Temporarily protect placeholders containing underscores from markdown parsing
                        const protectedContent = rawContent
                            .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                            .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                            .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                            .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                            .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                            .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
                        htmlBody = renderMarkdown(protectedContent);
                        // Restore protected placeholders
                        htmlBody = htmlBody
                            .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                            .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                            .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                            .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                            .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                            .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
                    }
                    let subject = record.get("subject") || "";
                    subject = subject.replace(/{singerName}/g, () => sanitizeEmailSubject(recipientName));
                    // Fetch dynamic event details if enqueued under filters
                    let event = null;
                    if (filters && filters.eventId) {
                        try {
                            event = app.findRecordById("events", filters.eventId);
                        }
                        catch (_a) {
                            // event not found
                        }
                    }
                    // Perform template placeholder resolutions (same engine as legacy)
                    htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));
                    htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, () => escapeHtml(mailingAddress));
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
                        catch (_b) {
                            // venue not found
                        }
                        const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                        const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                        // Resolve event placeholders in subject too
                        subject = subject.replace(/{eventTitle}/g, () => sanitizeEmailSubject(eventTitle))
                            .replace(/{eventType}/g, () => sanitizeEmailSubject(eventType))
                            .replace(/{eventDate}/g, () => sanitizeEmailSubject(dateShort));
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
                            catch (_c) {
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
                                    catch (_d) {
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
                        htmlBody = htmlBody.replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
                            .replace(/{eventType}/g, () => escapeHtml(eventType))
                            .replace(/{eventDate}/g, () => escapeHtml(dateShort))
                            .replace(/{eventLocation}/g, () => escapeHtml(venueName))
                            .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
                            .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
                            .replace(/{eventInfo}/g, () => eventInfoHtml)
                            .replace(/{firstRehearsalCalendarLink}/g, () => firstRehearsalHtml)
                            .replace(/{eventCalendarLink}/g, () => eventCalendarHtml);
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
                            htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, () => rsvpHtml).replace(/{rsvpLinks}/g, () => rsvpHtml);
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
                            htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, () => playerHtml).replace(/{playerLink}/g, () => playerHtml);
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
                                const question = pollRecord === null || pollRecord === void 0 ? void 0 : pollRecord.get("question");
                                if (typeof question === "string" && question.trim()) {
                                    pollButtonLabel = question.trim();
                                }
                            }
                            catch (_a) {
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
                        htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, () => unsubscribeUrl);
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
                    record.set("sentAt", new Date().toISOString());
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    record.set("errorMessage", "");
                    console.log(`[Email Queue] Sent record: ${record.id}`);
                }
                catch (err) {
                    const rawAttempts = record.get("attempts");
                    const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
                    const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
                    record.set("attempts", currentAttempts);
                    const message = err instanceof Error ? err.message : String(err);
                    record.set("errorMessage", message);
                    const nextStatus = currentAttempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? "Failed" : "Pending";
                    record.set("status", nextStatus);
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    console.log(`[Email Queue] Failed record: ${record.id}, attempts: ${currentAttempts}, error: ${message}`);
                }
                finally {
                    app.save(record);
                }
            });
            if (records.length < EMAIL_QUEUE_BATCH_SIZE) {
                break;
            }
        }
        if (totalClaimed >= EMAIL_QUEUE_BATCH_SIZE * EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION) {
            console.log("[Email Queue] Max batches reached; additional pending records will continue in the next invocation.");
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

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
    }
}, "auditions");

// --- CUSTOM ENDPOINTS ---

"use strict";
routerAdd("POST", "/api/generate-rsvp-tokens", (e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
// --- Utility source: email/hookJson.ts ---
"use strict";
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
            catch (_a) {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
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
    catch (_a) {
        return null;
    }
}

// --- Utility source: hmacTokens.ts ---
"use strict";
function getHmacSecret() {
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch (_a) {
        return "";
    }
}
function parseSignedToken(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true, c: true };
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
// --- END CALLBACK-LOCAL UTILITIES ---
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden: Admins only" });
    }
    const data = e.requestInfo().body;
    const eventId = data.eventId;
    const profileIds = data.profileIds;
    if (!eventId || !profileIds || !Array.isArray(profileIds)) {
        return e.json(400, { error: "Missing eventId or profileIds array" });
    }
    let secret;
    try {
        secret = getHmacSecret();
        if (!secret)
            throw new Error("Missing secret");
    }
    catch (_a) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }
    const tokens = {};
    profileIds.forEach(pId => {
        const payload = `e=${eventId}&p=${pId}`;
        const signature = $security.hs256(payload, secret);
        tokens[pId] = `${payload}&s=${signature}`;
    });
    return e.json(200, { tokens });
});
routerAdd("POST", "/api/rsvp-details", (e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
// --- Utility source: email/hookJson.ts ---
"use strict";
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
            catch (_a) {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
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
    catch (_a) {
        return null;
    }
}

// --- Utility source: hmacTokens.ts ---
"use strict";
function getHmacSecret() {
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch (_a) {
        return "";
    }
}
function parseSignedToken(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true, c: true };
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
// --- END CALLBACK-LOCAL UTILITIES ---
    const data = e.requestInfo().body;
    const token = data.token;
    if (!token || typeof token !== "string") {
        return e.json(400, { error: "Missing RSVP token. Please open full RSVP link from your email." });
    }
    const parts = parseSignedToken(token, ["e", "p", "s"]);
    if (!parts) {
        return e.json(400, { error: "This RSVP link is invalid. Please request a new RSVP link." });
    }
    let secret;
    try {
        secret = getHmacSecret();
        if (!secret)
            throw new Error("Missing secret");
    }
    catch (_a) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }
    const payload = `e=${parts.e}&p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        console.log("[RSVP Debug] Signature mismatch for event=" + parts.e + ", profile=" + parts.p);
        console.log("[RSVP Debug] Expected: " + expectedSignature + ", Received: " + parts.s);
        return e.json(401, { error: "This RSVP link is invalid or expired. Please request a new RSVP link." });
    }
    try {
        // Fetch all venues once to eliminate N+1 queries in rehearsals loop
        const venueMap = {};
        try {
            const allVenues = $app.findRecordsByFilter("venues", "1 = 1", "", 200);
            if (allVenues) {
                allVenues.forEach(v => {
                    venueMap[v.id] = v;
                });
            }
        }
        catch (venueFetchErr) {
            console.log("[RSVP Error] Failed to fetch venues: " + venueFetchErr);
        }
        const event = $app.findRecordById("events", parts.e);
        if (!event.get("isOpenForRSVP")) {
            return e.json(410, { error: "This RSVP window has closed for this event. Contact choir admins if you need help." });
        }
        let venueName = "";
        let venueAddress = "";
        try {
            const venueId = event.get("venue");
            if (venueId && typeof venueId === "string") {
                const venue = venueMap[venueId] || $app.findRecordById("venues", venueId);
                venueName = venue.get("name") || "";
                venueAddress = venue.get("address") || "";
            }
        }
        catch (venueErr) {
            console.log("[RSVP Details] Failed to resolve event venue: " + venueErr);
        }
        const profile = $app.findRecordById("profiles", parts.p);
        const rehearsals = [];
        if (event.get("type") === "Performance") {
            try {
                const list = $app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 100, 0, { eventId: parts.e });
                list.forEach(reh => {
                    let rVenueName = "";
                    try {
                        const rVenueId = reh.get("venue");
                        if (rVenueId && typeof rVenueId === "string") {
                            const rVenue = venueMap[rVenueId] || $app.findRecordById("venues", rVenueId);
                            rVenueName = rVenue.get("name") || "";
                        }
                    }
                    catch (e) {
                        console.log("[RSVP Details] Failed to resolve rehearsal venue for rehearsal " + reh.id + ": " + e);
                    }
                    rehearsals.push({
                        id: reh.id,
                        title: reh.get("title") || "",
                        type: reh.get("type") || "",
                        date: reh.get("date") || "",
                        details: reh.get("details") || "",
                        expand: {
                            venue: {
                                name: rVenueName
                            }
                        }
                    });
                });
            }
            catch (rehErr) {
                console.log("[RSVP Details] Failed to fetch rehearsals for performance " + parts.e + ": " + rehErr);
            }
        }
        let currentRsvp = "Pending";
        try {
            const roster = $app.findFirstRecordByFilter("eventRosters", "event = {:e} && profile = {:p}", { e: parts.e, p: parts.p });
            currentRsvp = roster.get("rsvp") || "Pending";
        }
        catch (rosterErr) {
            console.log("[RSVP Details] No existing roster found for event " + parts.e + " and profile " + parts.p + ": " + rosterErr);
        }
        return e.json(200, {
            event: {
                id: event.id,
                title: event.get("title") || "",
                type: event.get("type") || "",
                date: event.get("date") || "",
                details: event.get("details") || "",
                location: event.get("location") || "",
                expand: {
                    venue: {
                        name: venueName,
                        address: venueAddress
                    }
                }
            },
            profile: {
                id: profile.id,
                name: profile.get("name") || "",
                voicePart: profile.get("voicePart") || ""
            },
            currentRsvp,
            rehearsals
        });
    }
    catch (err) {
        console.log("[RSVP Details Error] Failed to fetch details: " + err);
        return e.json(404, { error: "We could not find this RSVP record. Link may be expired. Please request a new RSVP link." });
    }
});
routerAdd("POST", "/api/quick-rsvp", (e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
// --- Utility source: email/hookJson.ts ---
"use strict";
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
            catch (_a) {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
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
    catch (_a) {
        return null;
    }
}

// --- Utility source: email/hookText.ts ---
"use strict";
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
function sanitizeHtmlTemplateData(data) {
    const sanitized = {};
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}
function sanitizeEmailSubject(str) {
    if (!str)
        return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}
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
        return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
    }
    catch (_a) {
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

// --- Utility source: email/emailRendering.ts ---
"use strict";
function renderMarkdown(text) {
    if (!text)
        return "";
    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
    html = html.replace(/^(#{1,6})\s+(.*)/gm, (_, hashes, content) => {
        const level = hashes.length;
        // Using inline styles for headings for better email client compatibility
        const fontSize = level === 1 ? '1.8rem' : level === 2 ? '1.5rem' : level === 3 ? '1.25rem' : '1.1rem';
        return `<h${level} style="margin: 16px 0 8px 0; line-height: 1.2; font-size: ${fontSize}; color: #2c3e50;">${content}</h${level}>`;
    });
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
    // Lists (Ordered and Unordered)
    const lines = html.split("\n");
    let inUl = false;
    let inOl = false;
    const processedLines = lines.map(line => {
        const ulMatch = line.match(/^(\*|-)\s+(.*)/);
        const olMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (ulMatch) {
            const content = ulMatch[2];
            let prefix = "";
            if (inOl) {
                inOl = false;
                prefix = "</ol>";
            }
            if (!inUl) {
                inUl = true;
                return prefix + `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else if (olMatch) {
            const content = olMatch[2];
            let prefix = "";
            if (inUl) {
                inUl = false;
                prefix = "</ul>";
            }
            if (!inOl) {
                inOl = true;
                return prefix + `<ol style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        }
        else {
            let result = line;
            if (inUl) {
                inUl = false;
                result = "</ul>" + line;
            }
            if (inOl) {
                inOl = false;
                result = "</ol>" + line;
            }
            return result;
        }
    });
    if (inUl)
        processedLines.push("</ul>");
    if (inOl)
        processedLines.push("</ol>");
    html = processedLines.join("\n");
    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed)
            return "";
        if (trimmed.startsWith("<ul"))
            return block;
        if (trimmed.startsWith("<ol"))
            return block;
        if (trimmed.match(/^<h\d/))
            return block;
        if (trimmed.startsWith("<div"))
            return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
    return html;
}

// --- Utility source: email/emailStyles.ts ---
"use strict";
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

// --- Utility source: email/mailjetRenderer.ts ---
"use strict";
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

// --- Utility source: email/queueProcessor.ts ---
"use strict";
/**
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app) {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    }
    catch (_a) {
        return "";
    }
}
function processEmailQueue(app) {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }
    const EMAIL_QUEUE_BATCH_SIZE = 150;
    const EMAIL_QUEUE_MAX_ATTEMPTS = 3;
    const EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION = 6;
    // Stale Processing record recovery
    try {
        app.db().newQuery(`
            UPDATE emailQueue
            SET status = 'Pending',
                processingRunId = NULL,
                processingStartedAt = NULL
            WHERE status = 'Processing'
              AND processingStartedAt < datetime('now', '-15 minutes')
              AND (attempts IS NULL OR attempts < {:maxAttempts})
        `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
        app.db().newQuery(`
            UPDATE emailQueue
            SET status = 'Failed',
                processingRunId = NULL,
                processingStartedAt = NULL
            WHERE status = 'Processing'
              AND processingStartedAt < datetime('now', '-15 minutes')
              AND attempts >= {:maxAttempts}
        `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
    }
    catch (recoverErr) {
        console.log("[Email Queue] Error recovering stale records: " + recoverErr);
    }
    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField(commRecord.get("value"));
        if (comms === null || comms === void 0 ? void 0 : comms.frontendUrl)
            baseUrl = comms.frontendUrl;
        if (comms === null || comms === void 0 ? void 0 : comms.mailingAddress)
            mailingAddress = comms.mailingAddress;
    }
    catch (_a) {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);
    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField(choirRecord.get("value"));
        if (val)
            choirName = val;
    }
    catch (_b) {
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
    catch (_c) {
        // use default timezone
    }
    let totalClaimed = 0;
    for (let batchNumber = 1; batchNumber <= EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION; batchNumber++) {
        const runId = $security.randomString(20);
        console.log(`[Email Queue] Starting processing run: ${runId} (batch ${batchNumber}/${EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION})`);
        // Atomic SQLite-level claiming
        try {
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Processing',
                    processingRunId = {:runId},
                    processingStartedAt = datetime('now')
                WHERE id IN (
                    SELECT id
                    FROM emailQueue
                    WHERE status = 'Pending'
                      AND (attempts IS NULL OR attempts < {:maxAttempts})
                    ORDER BY created ASC
                    LIMIT {:batchSize}
                )
            `).bind({
                runId: runId,
                maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
                batchSize: EMAIL_QUEUE_BATCH_SIZE
            }).execute();
        }
        catch (claimErr) {
            console.log("[Email Queue] Error claiming records for run " + runId + ": " + claimErr);
            return;
        }
        const records = app.findRecordsByFilter("emailQueue", "status = 'Processing' && processingRunId = {:runId}", "created", EMAIL_QUEUE_BATCH_SIZE, 0, { runId });
        if (!records || records.length === 0) {
            if (totalClaimed === 0) {
                console.log("[Email Queue] No records claimed for run: " + runId);
            }
            break;
        }
        totalClaimed += records.length;
        console.log(`[Email Queue] Claimed ${records.length} records for run: ${runId}`);
        records.forEach((record) => {
            try {
                const rawContent = record.get("rawContent") || "";
                const recipientId = record.get("recipientId");
                const recipientEmail = record.get("recipientEmail");
                const recipientName = record.get("recipientName") || "Singer";
                const filters = parseJsonField(record.get("filters")) || {};
                let htmlBody = "";
                if (filters.contentType === "html") {
                    htmlBody = rawContent;
                }
                else {
                    // Temporarily protect placeholders containing underscores from markdown parsing
                    const protectedContent = rawContent
                        .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                        .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                        .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                        .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                        .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                        .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
                    htmlBody = renderMarkdown(protectedContent);
                    // Restore protected placeholders
                    htmlBody = htmlBody
                        .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                        .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                        .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                        .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                        .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                        .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
                }
                let subject = record.get("subject") || "";
                subject = subject.replace(/{singerName}/g, () => sanitizeEmailSubject(recipientName));
                // Fetch dynamic event details if enqueued under filters
                let event = null;
                if (filters && filters.eventId) {
                    try {
                        event = app.findRecordById("events", filters.eventId);
                    }
                    catch (_a) {
                        // event not found
                    }
                }
                // Perform template placeholder resolutions (same engine as legacy)
                htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));
                htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, () => escapeHtml(mailingAddress));
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
                    catch (_b) {
                        // venue not found
                    }
                    const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                    const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                    // Resolve event placeholders in subject too
                    subject = subject.replace(/{eventTitle}/g, () => sanitizeEmailSubject(eventTitle))
                        .replace(/{eventType}/g, () => sanitizeEmailSubject(eventType))
                        .replace(/{eventDate}/g, () => sanitizeEmailSubject(dateShort));
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
                        catch (_c) {
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
                                catch (_d) {
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
                    htmlBody = htmlBody.replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
                        .replace(/{eventType}/g, () => escapeHtml(eventType))
                        .replace(/{eventDate}/g, () => escapeHtml(dateShort))
                        .replace(/{eventLocation}/g, () => escapeHtml(venueName))
                        .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
                        .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
                        .replace(/{eventInfo}/g, () => eventInfoHtml)
                        .replace(/{firstRehearsalCalendarLink}/g, () => firstRehearsalHtml)
                        .replace(/{eventCalendarLink}/g, () => eventCalendarHtml);
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
                        htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, () => rsvpHtml).replace(/{rsvpLinks}/g, () => rsvpHtml);
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
                        htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, () => playerHtml).replace(/{playerLink}/g, () => playerHtml);
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
                            const question = pollRecord === null || pollRecord === void 0 ? void 0 : pollRecord.get("question");
                            if (typeof question === "string" && question.trim()) {
                                pollButtonLabel = question.trim();
                            }
                        }
                        catch (_a) {
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
                    htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, () => unsubscribeUrl);
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
                record.set("sentAt", new Date().toISOString());
                record.set("processingRunId", null);
                record.set("processingStartedAt", null);
                record.set("errorMessage", "");
                console.log(`[Email Queue] Sent record: ${record.id}`);
            }
            catch (err) {
                const rawAttempts = record.get("attempts");
                const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
                const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
                record.set("attempts", currentAttempts);
                const message = err instanceof Error ? err.message : String(err);
                record.set("errorMessage", message);
                const nextStatus = currentAttempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? "Failed" : "Pending";
                record.set("status", nextStatus);
                record.set("processingRunId", null);
                record.set("processingStartedAt", null);
                console.log(`[Email Queue] Failed record: ${record.id}, attempts: ${currentAttempts}, error: ${message}`);
            }
            finally {
                app.save(record);
            }
        });
        if (records.length < EMAIL_QUEUE_BATCH_SIZE) {
            break;
        }
    }
    if (totalClaimed >= EMAIL_QUEUE_BATCH_SIZE * EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION) {
        console.log("[Email Queue] Max batches reached; additional pending records will continue in the next invocation.");
    }
}

// --- Utility source: hmacTokens.ts ---
"use strict";
function getHmacSecret() {
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch (_a) {
        return "";
    }
}
function parseSignedToken(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true, c: true };
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
// --- END CALLBACK-LOCAL UTILITIES ---
    const data = e.requestInfo().body;
    const token = data.token;
    const rsvp = data.rsvp;
    if (!token || !rsvp || typeof token !== "string") {
        return e.json(400, { error: "Missing RSVP details. Please use full RSVP link from your email." });
    }
    const parts = parseSignedToken(token, ["e", "p", "s"]);
    if (!parts) {
        return e.json(400, { error: "This RSVP link is invalid. Please request a new RSVP link." });
    }
    let secret;
    try {
        secret = getHmacSecret();
        if (!secret)
            throw new Error("Missing secret");
    }
    catch (_a) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }
    const payload = `e=${parts.e}&p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        console.log("[RSVP Debug] Signature mismatch for event=" + parts.e + ", profile=" + parts.p);
        console.log("[RSVP Debug] Expected: " + expectedSignature + ", Received: " + parts.s);
        return e.json(401, { error: "This RSVP link is invalid or expired. Please request a new RSVP link." });
    }
    try {
        const event = $app.findRecordById("events", parts.e);
        if (!event.get("isOpenForRSVP")) {
            return e.json(410, { error: "RSVP window for this event is closed. Contact choir admins for assistance." });
        }
    }
    catch (_b) {
        return e.json(404, { error: "Event not found. RSVP link may be expired." });
    }
    try {
        const matches = $app.findRecordsByFilter("eventRosters", "event = {:e} && profile = {:p}", "", 2, 0, { e: parts.e, p: parts.p }) || [];
        let roster = matches.length > 0 ? matches[0] : null;
        if (!roster) {
            const collection = $app.findCollectionByNameOrId("eventRosters");
            roster = new Record(collection);
            roster.set("event", parts.e);
            roster.set("profile", parts.p);
            roster.set("attendance", "Pending");
            roster.set("folderReturned", false);
        }
        const oldRsvp = roster.get("rsvp");
        const normalizedRsvp = rsvp === "No" ? "No" : "Yes";
        roster.set("rsvp", normalizedRsvp);
        $app.save(roster);
        // Enqueue confirmation email if RSVP changed to Yes
        if (normalizedRsvp === "Yes" && oldRsvp !== "Yes") {
            try {
                const profile = $app.findRecordById("profiles", parts.p);
                const recipientEmail = profile.get("email");
                if (recipientEmail && !profile.get("doNotEmail")) {
                    const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'RSVP Confirmation' && isSystemTemplate = true");
                    const queueCollection = $app.findCollectionByNameOrId("emailQueue");
                    const queueRecord = new Record(queueCollection, {
                        recipientId: profile.id,
                        recipientEmail: recipientEmail,
                        recipientName: profile.get("name") || "Singer",
                        subject: template.get("subject") || "",
                        rawContent: template.get("content") || "",
                        status: "Pending",
                        attempts: 0,
                        filters: JSON.stringify({
                            eventId: parts.e,
                            type: "Automated Confirmation"
                        })
                    });
                    $app.save(queueRecord);
                    processEmailQueue($app);
                }
            }
            catch (emailErr) {
                console.log("[RSVP Confirmation Error] Failed to enqueue automated email: " + emailErr);
            }
        }
    }
    catch (err) {
        let errDetails;
        try {
            errDetails = JSON.stringify(err);
        }
        catch (_c) {
            errDetails = String(err);
        }
        console.log("[RSVP Quick Error] Failed to update RSVP: " + String(err) + " | details=" + errDetails);
        return e.json(500, { error: "Failed to update RSVP." });
    }
    return e.json(200, { success: true });
});
routerAdd("POST", "/api/unsubscribe", (e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
// --- Utility source: email/hookJson.ts ---
"use strict";
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
            catch (_a) {
                // Ignore decoding errors
            }
        }
        return val;
    }
    return String(val);
}
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
    catch (_a) {
        return null;
    }
}

// --- Utility source: hmacTokens.ts ---
"use strict";
function getHmacSecret() {
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    }
    catch (_a) {
        return "";
    }
}
function parseSignedToken(token, requiredKeys) {
    if (!token || typeof token !== "string")
        return null;
    const parts = {};
    const allowed = { s: true, e: true, p: true, a: true, c: true };
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
// --- END CALLBACK-LOCAL UTILITIES ---
    const data = e.requestInfo().body;
    const token = data.token;
    if (!token || typeof token !== "string") {
        return e.json(400, { error: "Missing token" });
    }
    const parts = parseSignedToken(token, ["p", "s"]);
    if (!parts) {
        return e.json(400, { error: "Invalid token format" });
    }
    let secret;
    try {
        secret = getHmacSecret();
        if (!secret)
            throw new Error("Missing secret");
    }
    catch (_a) {
        return e.json(500, { error: "HMAC_SECRET not configured" });
    }
    const payload = `p=${parts.p}`;
    const expectedSignature = $security.hs256(payload, secret);
    if (!$security.equal(parts.s, expectedSignature)) {
        return e.json(401, { error: "Invalid signature" });
    }
    try {
        const profile = $app.findRecordById("profiles", parts.p);
        profile.set("doNotEmail", true);
        $app.save(profile);
    }
    catch (_b) {
        return e.json(404, { error: "Profile not found" });
    }
    return e.json(200, { success: true });
});
routerAdd("POST", "/api/admin/bulk-update-rsvps", (e) => {
    
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden: Admins only" });
    }
    const data = e.requestInfo().body;
    const eventId = data.eventId;
    const updates = data.updates;
    if (!eventId || !updates || !Array.isArray(updates)) {
        return e.json(400, { error: "Missing eventId or updates array" });
    }
    try {
        const rosterCollection = $app.findCollectionByNameOrId("eventRosters");
        const existingRosters = $app.findRecordsByFilter("eventRosters", "event = {:eventId}", "", 1000, 0, { eventId: eventId }) || [];
        const rosterMap = {};
        existingRosters.forEach(r => {
            const profileVal = r.get("profile");
            if (typeof profileVal === "string") {
                rosterMap[profileVal] = r;
            }
        });
        const txApp = $app;
        txApp.runInTransaction((tx) => {
            updates.forEach(u => {
                const existing = rosterMap[u.profileId];
                if (existing) {
                    if (u.rsvp === 'Pending') {
                        const attendance = existing.get("attendance") || "Pending";
                        const folderNumber = (existing.get("folderNumber") || "").trim();
                        const folderReturned = existing.get("folderReturned");
                        const seatId = (existing.get("seatId") || "").trim();
                        const hasOtherData = attendance !== 'Pending' ||
                            folderNumber !== '' ||
                            folderReturned ||
                            seatId !== '';
                        if (!hasOtherData) {
                            tx.delete(existing);
                        }
                        else if (existing.get("rsvp") !== 'Pending') {
                            existing.set("rsvp", "Pending");
                            tx.save(existing);
                        }
                    }
                    else if (existing.get("rsvp") !== u.rsvp) {
                        existing.set("rsvp", u.rsvp);
                        tx.save(existing);
                    }
                }
                else {
                    if (u.rsvp !== 'Pending') {
                        const roster = new Record(rosterCollection);
                        roster.set("event", eventId);
                        roster.set("profile", u.profileId);
                        roster.set("rsvp", u.rsvp);
                        roster.set("attendance", "Pending");
                        roster.set("folderReturned", false);
                        tx.save(roster);
                    }
                }
            });
        });
        return e.json(200, { success: true });
    }
    catch (err) {
        console.log("[Bulk RSVP Hook Error]: " + String(err));
        return e.json(500, { error: "Failed to bulk update RSVPs: " + String(err) });
    }
});
routerAdd("POST", "/api/admin/bulk-upsert-attendance", (e) => {
    
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden: Admins only" });
    }
    const data = e.requestInfo().body;
    const eventId = data.eventId;
    const updates = data.updates;
    if (!eventId) {
        return e.json(400, { error: "Missing eventId" });
    }
    if (!Array.isArray(updates)) {
        return e.json(400, { error: "updates must be an array" });
    }
    const allowedAttendance = {
        Present: true,
        Absent: true,
        Pending: true
    };
    const shouldPromotePendingRsvpToYes = (attendance, rsvp) => {
        return attendance === "Present" && (!rsvp || rsvp === "Pending");
    };
    for (let i = 0; i < updates.length; i++) {
        const update = updates[i] || {};
        if (!update.profileId) {
            return e.json(400, { error: "Each update requires profileId" });
        }
        if (!allowedAttendance[update.attendance]) {
            return e.json(400, { error: "Invalid attendance value" });
        }
    }
    try {
        const rosterCollection = $app.findCollectionByNameOrId("eventRosters");
        const existingRosters = $app.findRecordsByFilter("eventRosters", "event = {:eventId}", "", 1000, 0, { eventId: eventId }) || [];
        const rosterMap = {};
        existingRosters.forEach((roster) => {
            const profileVal = roster.get("profile");
            if (typeof profileVal === "string") {
                rosterMap[profileVal] = roster;
            }
        });
        const changedRosters = [];
        const txApp = $app;
        txApp.runInTransaction((tx) => {
            updates.forEach((update) => {
                const existingRoster = rosterMap[update.profileId];
                if (existingRoster) {
                    const currentAttendance = existingRoster.get("attendance");
                    const currentRsvp = existingRoster.get("rsvp");
                    let changed = false;
                    if (currentAttendance !== update.attendance) {
                        existingRoster.set("attendance", update.attendance);
                        changed = true;
                    }
                    // Match the single attendance update behavior: marking a pending singer Present
                    // also makes them attending so RSVP-driven seating views include them.
                    if (shouldPromotePendingRsvpToYes(update.attendance, currentRsvp)) {
                        existingRoster.set("rsvp", "Yes");
                        changed = true;
                    }
                    if (changed) {
                        tx.save(existingRoster);
                    }
                    changedRosters.push(existingRoster);
                }
                else {
                    const roster = new Record(rosterCollection);
                    roster.set("event", eventId);
                    roster.set("profile", update.profileId);
                    roster.set("rsvp", update.attendance === "Present" ? "Yes" : "Pending");
                    roster.set("attendance", update.attendance);
                    roster.set("folderReturned", false);
                    tx.save(roster);
                    changedRosters.push(roster);
                }
            });
        });
        const payload = changedRosters.map((roster) => ({
            id: roster.id,
            event: roster.get("event"),
            profile: roster.get("profile"),
            attendance: roster.get("attendance"),
            rsvp: roster.get("rsvp"),
            folderNumber: roster.get("folderNumber") || "",
            folderReturned: !!roster.get("folderReturned"),
            seatId: roster.get("seatId") || ""
        }));
        return e.json(200, { rosters: payload });
    }
    catch (err) {
        console.log("[Bulk Attendance Hook Error]: " + String(err));
        return e.json(500, { error: "Failed to bulk upsert attendance: " + String(err) });
    }
});

routerAdd("POST", "/api/queue/process", (e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: email/emailRendering.ts ---
    "use strict";
    function renderMarkdown(text) {
        if (!text)
            return "";
        // Escape raw HTML first
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
        html = html.replace(/^(#{1,6})\s+(.*)/gm, (_, hashes, content) => {
            const level = hashes.length;
            // Using inline styles for headings for better email client compatibility
            const fontSize = level === 1 ? '1.8rem' : level === 2 ? '1.5rem' : level === 3 ? '1.25rem' : '1.1rem';
            return `<h${level} style="margin: 16px 0 8px 0; line-height: 1.2; font-size: ${fontSize}; color: #2c3e50;">${content}</h${level}>`;
        });
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
        // Lists (Ordered and Unordered)
        const lines = html.split("\n");
        let inUl = false;
        let inOl = false;
        const processedLines = lines.map(line => {
            const ulMatch = line.match(/^(\*|-)\s+(.*)/);
            const olMatch = line.match(/^(\d+)\.\s+(.*)/);
            if (ulMatch) {
                const content = ulMatch[2];
                let prefix = "";
                if (inOl) {
                    inOl = false;
                    prefix = "</ol>";
                }
                if (!inUl) {
                    inUl = true;
                    return prefix + `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else if (olMatch) {
                const content = olMatch[2];
                let prefix = "";
                if (inUl) {
                    inUl = false;
                    prefix = "</ul>";
                }
                if (!inOl) {
                    inOl = true;
                    return prefix + `<ol style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            }
            else {
                let result = line;
                if (inUl) {
                    inUl = false;
                    result = "</ul>" + line;
                }
                if (inOl) {
                    inOl = false;
                    result = "</ol>" + line;
                }
                return result;
            }
        });
        if (inUl)
            processedLines.push("</ul>");
        if (inOl)
            processedLines.push("</ol>");
        html = processedLines.join("\n");
        // Line breaks and paragraphs
        const blocks = html.split(/\n\s*\n/);
        html = blocks.map(block => {
            const trimmed = block.trim();
            if (!trimmed)
                return "";
            if (trimmed.startsWith("<ul"))
                return block;
            if (trimmed.startsWith("<ol"))
                return block;
            if (trimmed.match(/^<h\d/))
                return block;
            if (trimmed.startsWith("<div"))
                return block; // Keep footers/buttons intact
            return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
        }).join("\n");
        return html;
    }

    // --- Utility source: email/emailStyles.ts ---
    "use strict";
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

    // --- Utility source: email/mailjetRenderer.ts ---
    "use strict";
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

    // --- Utility source: email/queueProcessor.ts ---
    "use strict";
    /**
     * Retrieves HMAC secret for signature tokens.
     */
    function getQueueHmacSecret(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return (parsed && parsed.secret) ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function processEmailQueue(app) {
        const settings = app.settings();
        if (!settings.smtp || !settings.smtp.enabled) {
            console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
            return;
        }
        const EMAIL_QUEUE_BATCH_SIZE = 150;
        const EMAIL_QUEUE_MAX_ATTEMPTS = 3;
        const EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION = 6;
        // Stale Processing record recovery
        try {
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Pending',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND (attempts IS NULL OR attempts < {:maxAttempts})
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
            app.db().newQuery(`
                UPDATE emailQueue
                SET status = 'Failed',
                    processingRunId = NULL,
                    processingStartedAt = NULL
                WHERE status = 'Processing'
                  AND processingStartedAt < datetime('now', '-15 minutes')
                  AND attempts >= {:maxAttempts}
            `).bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS }).execute();
        }
        catch (recoverErr) {
            console.log("[Email Queue] Error recovering stale records: " + recoverErr);
        }
        // Build variables used for layout rendering
        const secret = getQueueHmacSecret(app);
        let baseUrl = "http://localhost:5173";
        let mailingAddress = "123 Choir St, Harmony City, HC 12345";
        let choirName = "";
        try {
            const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
            const comms = parseJsonField(commRecord.get("value"));
            if (comms === null || comms === void 0 ? void 0 : comms.frontendUrl)
                baseUrl = comms.frontendUrl;
            if (comms === null || comms === void 0 ? void 0 : comms.mailingAddress)
                mailingAddress = comms.mailingAddress;
        }
        catch (_a) {
            // use default baseUrl and mailingAddress
        }
        baseUrl = normalizeBaseUrl(baseUrl);
        try {
            const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
            const val = parseJsonField(choirRecord.get("value"));
            if (val)
                choirName = val;
        }
        catch (_b) {
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
        catch (_c) {
            // use default timezone
        }
        let totalClaimed = 0;
        for (let batchNumber = 1; batchNumber <= EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION; batchNumber++) {
            const runId = $security.randomString(20);
            console.log(`[Email Queue] Starting processing run: ${runId} (batch ${batchNumber}/${EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION})`);
            // Atomic SQLite-level claiming
            try {
                app.db().newQuery(`
                    UPDATE emailQueue
                    SET status = 'Processing',
                        processingRunId = {:runId},
                        processingStartedAt = datetime('now')
                    WHERE id IN (
                        SELECT id
                        FROM emailQueue
                        WHERE status = 'Pending'
                          AND (attempts IS NULL OR attempts < {:maxAttempts})
                        ORDER BY created ASC
                        LIMIT {:batchSize}
                    )
                `).bind({
                    runId: runId,
                    maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
                    batchSize: EMAIL_QUEUE_BATCH_SIZE
                }).execute();
            }
            catch (claimErr) {
                console.log("[Email Queue] Error claiming records for run " + runId + ": " + claimErr);
                return;
            }
            const records = app.findRecordsByFilter("emailQueue", "status = 'Processing' && processingRunId = {:runId}", "created", EMAIL_QUEUE_BATCH_SIZE, 0, { runId });
            if (!records || records.length === 0) {
                if (totalClaimed === 0) {
                    console.log("[Email Queue] No records claimed for run: " + runId);
                }
                break;
            }
            totalClaimed += records.length;
            console.log(`[Email Queue] Claimed ${records.length} records for run: ${runId}`);
            records.forEach((record) => {
                try {
                    const rawContent = record.get("rawContent") || "";
                    const recipientId = record.get("recipientId");
                    const recipientEmail = record.get("recipientEmail");
                    const recipientName = record.get("recipientName") || "Singer";
                    const filters = parseJsonField(record.get("filters")) || {};
                    let htmlBody = "";
                    if (filters.contentType === "html") {
                        htmlBody = rawContent;
                    }
                    else {
                        // Temporarily protect placeholders containing underscores from markdown parsing
                        const protectedContent = rawContent
                            .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                            .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                            .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                            .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%")
                            .replace(/{{PLAYER_LINK}}/g, "%%PLAYERLINK%%")
                            .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => "%%POLLLINK_" + id + "%%");
                        htmlBody = renderMarkdown(protectedContent);
                        // Restore protected placeholders
                        htmlBody = htmlBody
                            .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                            .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                            .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                            .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}")
                            .replace(/%%PLAYERLINK%%/g, "{{PLAYER_LINK}}")
                            .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => "{{POLL_LINK:" + id + "}}");
                    }
                    let subject = record.get("subject") || "";
                    subject = subject.replace(/{singerName}/g, () => sanitizeEmailSubject(recipientName));
                    // Fetch dynamic event details if enqueued under filters
                    let event = null;
                    if (filters && filters.eventId) {
                        try {
                            event = app.findRecordById("events", filters.eventId);
                        }
                        catch (_a) {
                            // event not found
                        }
                    }
                    // Perform template placeholder resolutions (same engine as legacy)
                    htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));
                    htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, () => escapeHtml(mailingAddress));
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
                        catch (_b) {
                            // venue not found
                        }
                        const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                        const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                        // Resolve event placeholders in subject too
                        subject = subject.replace(/{eventTitle}/g, () => sanitizeEmailSubject(eventTitle))
                            .replace(/{eventType}/g, () => sanitizeEmailSubject(eventType))
                            .replace(/{eventDate}/g, () => sanitizeEmailSubject(dateShort));
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
                            catch (_c) {
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
                                    catch (_d) {
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
                        htmlBody = htmlBody.replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
                            .replace(/{eventType}/g, () => escapeHtml(eventType))
                            .replace(/{eventDate}/g, () => escapeHtml(dateShort))
                            .replace(/{eventLocation}/g, () => escapeHtml(venueName))
                            .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
                            .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
                            .replace(/{eventInfo}/g, () => eventInfoHtml)
                            .replace(/{firstRehearsalCalendarLink}/g, () => firstRehearsalHtml)
                            .replace(/{eventCalendarLink}/g, () => eventCalendarHtml);
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
                            htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, () => rsvpHtml).replace(/{rsvpLinks}/g, () => rsvpHtml);
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
                            htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, () => playerHtml).replace(/{playerLink}/g, () => playerHtml);
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
                                const question = pollRecord === null || pollRecord === void 0 ? void 0 : pollRecord.get("question");
                                if (typeof question === "string" && question.trim()) {
                                    pollButtonLabel = question.trim();
                                }
                            }
                            catch (_a) {
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
                        htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, () => unsubscribeUrl);
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
                    record.set("sentAt", new Date().toISOString());
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    record.set("errorMessage", "");
                    console.log(`[Email Queue] Sent record: ${record.id}`);
                }
                catch (err) {
                    const rawAttempts = record.get("attempts");
                    const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
                    const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
                    record.set("attempts", currentAttempts);
                    const message = err instanceof Error ? err.message : String(err);
                    record.set("errorMessage", message);
                    const nextStatus = currentAttempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? "Failed" : "Pending";
                    record.set("status", nextStatus);
                    record.set("processingRunId", null);
                    record.set("processingStartedAt", null);
                    console.log(`[Email Queue] Failed record: ${record.id}, attempts: ${currentAttempts}, error: ${message}`);
                }
                finally {
                    app.save(record);
                }
            });
            if (records.length < EMAIL_QUEUE_BATCH_SIZE) {
                break;
            }
        }
        if (totalClaimed >= EMAIL_QUEUE_BATCH_SIZE * EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION) {
            console.log("[Email Queue] Max batches reached; additional pending records will continue in the next invocation.");
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

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
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

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
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: calendarEndpoint.ts ---
    "use strict";
    function getHmacSecretLocal(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return parsed && parsed.secret ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function parseSignedTokenLocal(token, requiredKeys) {
        if (!token || typeof token !== "string")
            return null;
        const parts = {};
        const allowed = { s: true, e: true, p: true, a: true, c: true };
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
        catch (_a) {
            // ignore error
        }
        return timezone;
    }
    function getChoirNameLocal(app) {
        try {
            const setting = app.findFirstRecordByFilter("appSettings", "key = 'choirName'");
            const parsed = parseJsonField(setting.get("value"));
            const directName = safeTrim(typeof parsed === "string" ? parsed : "");
            if (directName) {
                return directName;
            }
            if (parsed && typeof parsed === "object") {
                const value = parsed.name || parsed.choirName || parsed.value;
                const nestedName = safeTrim(value);
                if (nestedName) {
                    return nestedName;
                }
            }
        }
        catch (_a) {
            // ignore error
        }
        return "Choir";
    }
    function safeTrim(str) {
        if (!str)
            return "";
        return String(str).replace(/^\s+|\s+$/g, "");
    }
    function getLocalDatePart(date, timezone) {
        const offsetInfo = getTimezoneOffsetInfo(date, timezone);
        const localDate = new Date(date.getTime() + (offsetInfo.offsetMinutes * 60 * 1000));
        const y = localDate.getUTCFullYear();
        const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(localDate.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    /**
     * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
     * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
     */
    function parseSafeUtcDate(dateStr, timezone) {
        if (!dateStr)
            return new Date();
        let normalized = safeTrim(dateStr);
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
            let title = "";
            let details = "";
            let uid = "";
            let callTime = "";
            let durationMinutes = 120;
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
                catch (_a) {
                    // Ignore venue resolution error
                }
                locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
                start = parseSafeUtcDate(event.get("date"), timezone);
                durationMinutes = Number(event.get("durationMinutes")) || (event.get("type") === "Performance" ? 150 : 120);
                title = event.get("title") || event.get("type") || "Choir Event";
                details = event.get("details") || "";
                callTime = event.get("callTime") || "";
                uid = `event-${event.id}@choir-management.local`;
            }
            else if (parts.a) {
                const audition = app.findRecordById("auditions", parts.a);
                start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
                durationMinutes = 30; // 30 mins for audition
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
                catch (_b) {
                    // Ignore performance/venue resolution error
                }
                locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
                details = "Please arrive 10 minutes early to warm up.";
            }
            const end = new Date(start.getTime() + (typeof durationMinutes === 'number' ? durationMinutes : 120) * 60 * 1000);
            const dtstamp = new Date();
            const choirName = getChoirNameLocal(app);
            const calendarName = `${choirName} Schedule`;
            const vevents = [];
            if (callTime) {
                const localDatePart = getLocalDatePart(start, timezone);
                const callStart = parseSafeUtcDate(`${localDatePart} ${callTime}`, timezone);
                if (callStart.getTime() < start.getTime()) {
                    vevents.push('BEGIN:VEVENT', `UID:call-${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(callStart)}`, `DTEND:${fmtUtc(start)}`, `SUMMARY:Call: ${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:Arrival and warm-up for ${escapeIcsText(title)}.`, 'END:VEVENT');
                }
            }
            vevents.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(start)}`, `DTEND:${fmtUtc(end)}`, `SUMMARY:${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:${escapeIcsText(details)}`, 'END:VEVENT');
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Choir Management Tool//EN',
                'CALSCALE:GREGORIAN',
                `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
                `X-WR-TIMEZONE:${timezone}`,
                vevents.join('\r\n'),
                'END:VCALENDAR',
                ''
            ].join('\r\n');
            const filenameBase = calendarName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'choir-schedule';
            const fileId = parts.e ? `event-${parts.e}` : `audition-${parts.a}`;
            e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
            e.response.header().set("Content-Disposition", `attachment; filename="${filenameBase}-${fileId}.ics"`);
            return e.string(200, icsContent);
        }
        catch (_c) {
            return e.json(404, { error: "Event or Audition not found" });
        }
    }
    function handleCalendarFeed(e) {
        const token = e.requestInfo().query["token"];
        const app = $app;
        if (!token) {
            return e.json(400, { error: "Missing token" });
        }
        const parts = parseSignedTokenLocal(token, ["p", "c", "s"]);
        if (!parts) {
            return e.json(400, { error: "Invalid token format" });
        }
        const secret = getHmacSecretLocal(app);
        if (!secret) {
            return e.json(500, { error: "Configuration error" });
        }
        // Verify signature over the payload p=<profileId>&c=<calendarSalt>
        const payload = `p=${parts.p}&c=${parts.c}`;
        const expectedSignature = $security.hs256(payload, secret);
        if (!$security.equal(parts.s, expectedSignature)) {
            return e.json(401, { error: "Invalid signature" });
        }
        try {
            // Fetch singer profile
            const profile = app.findRecordById("profiles", parts.p);
            // Double check calendar salt matches
            const activeSalt = profile.get("calendarSalt");
            if (!activeSalt || activeSalt !== parts.c) {
                return e.json(401, { error: "Token has been reset or is invalid" });
            }
            const timezone = getChoirTimezoneLocal(app);
            // Fetch all events (Performance/Rehearsal) - past 30 days up to 1 year in the future.
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ");
            const events = app.findRecordsByFilter("events", `date >= '${thirtyDaysAgo}'`, "-date", 500);
            // Fetch all rosters (RSVPs) for this profile
            const rosters = app.findRecordsByFilter("eventRosters", `profile = '${profile.id}'`, "", 1000);
            // Map event ID to roster record
            const rosterMap = {};
            rosters.forEach(r => {
                rosterMap[r.get("event")] = r;
            });
            // Resolve each event
            const eventsToInclude = [];
            const rsvpStatusMap = {}; // Cache resolved RSVPs
            // Loop through all events to calculate their resolved RSVP status
            events.forEach(event => {
                const eventId = event.id;
                const eventType = event.get("type");
                // Check for direct roster RSVP
                const roster = rosterMap[eventId];
                let resolvedRsvp = roster ? roster.get("rsvp") : "Pending";
                if (eventType === "Rehearsal" && resolvedRsvp === "Pending") {
                    // Rehearsal inherits from parent performance
                    const parentId = event.get("parentPerformanceId");
                    if (parentId) {
                        const parentRoster = rosterMap[parentId];
                        const parentRsvp = parentRoster ? parentRoster.get("rsvp") : "Pending";
                        if (parentRsvp !== "Pending") {
                            resolvedRsvp = parentRsvp;
                        }
                    }
                }
                // Only include if RSVP is Yes (Attending) or Pending
                if (resolvedRsvp === "Yes" || resolvedRsvp === "Pending") {
                    eventsToInclude.push(event);
                    rsvpStatusMap[eventId] = resolvedRsvp;
                }
            });
            // Sort events chronologically (oldest first)
            eventsToInclude.sort((a, b) => {
                return new Date(a.get("date")).getTime() - new Date(b.get("date")).getTime();
            });
            // Build the VEVENT list
            const vevents = [];
            const dtstamp = new Date();
            // Pre-fetch all venues
            const venueMap = {};
            try {
                const allVenues = app.findRecordsByFilter("venues", "1 = 1", "", 500);
                allVenues.forEach(v => {
                    venueMap[v.id] = v;
                });
            }
            catch (_a) {
                // ignore venue pre-fetch failure
            }
            eventsToInclude.forEach((event) => {
                let venueName = "";
                let venueAddress = "";
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = venueMap[venueId] || app.findRecordById("venues", venueId);
                    if (venue) {
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
                const locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
                const start = parseSafeUtcDate(event.get("date"), timezone);
                // Duration: rehearsals default to 2 hours, performances default to 2.5 hours
                const durationMinutes = Number(event.get("durationMinutes")) || (event.get("type") === "Performance" ? 150 : 120);
                const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
                const rsvpText = rsvpStatusMap[event.id] === "Yes" ? "Attending" : "Pending RSVP";
                const typeText = event.get("type");
                const callTime = event.get("callTime");
                // Build premium DESCRIPTION field
                const descParts = [];
                descParts.push(`Type: ${typeText}`);
                descParts.push(`Your Status: ${rsvpText}`);
                if (callTime) {
                    descParts.push(`Call Time: ${callTime}`);
                }
                const details = event.get("details");
                if (details) {
                    descParts.push(`\nDetails:\n${details}`);
                }
                // Set List inclusion
                const setListApproved = event.get("setListApproved");
                if (setListApproved && rsvpStatusMap[event.id] === "Yes") {
                    const rawSetList = event.get("setList");
                    const parsedSetList = parseJsonField(rawSetList);
                    if (parsedSetList && parsedSetList.length > 0) {
                        descParts.push(`\nSet List:`);
                        parsedSetList.forEach((item, index) => {
                            const songTitle = item.title;
                            const songComposer = item.composer || "";
                            const itemStr = songComposer ? `${index + 1}. ${songTitle} (${songComposer})` : `${index + 1}. ${songTitle}`;
                            descParts.push(itemStr);
                        });
                    }
                }
                const description = descParts.join("\n");
                const title = event.get("title");
                const uid = `event-${event.id}@choir-management.local`;
                if (callTime) {
                    const localDatePart = getLocalDatePart(start, timezone);
                    const callStart = parseSafeUtcDate(`${localDatePart} ${callTime}`, timezone);
                    if (callStart.getTime() < start.getTime()) {
                        vevents.push('BEGIN:VEVENT', `UID:call-${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(callStart)}`, `DTEND:${fmtUtc(start)}`, `SUMMARY:Call: ${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:Arrival and warm-up for ${escapeIcsText(title)}.`, 'END:VEVENT');
                    }
                }
                vevents.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(start)}`, `DTEND:${fmtUtc(end)}`, `SUMMARY:${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:${escapeIcsText(description)}`, 'END:VEVENT');
            });
            const choirName = getChoirNameLocal(app);
            const calendarName = `${choirName} Schedule`;
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Choir Management Tool//EN',
                'CALSCALE:GREGORIAN',
                `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
                'X-WR-TIMEZONE:' + timezone,
                vevents.join('\r\n'),
                'END:VCALENDAR',
                ''
            ].join('\r\n');
            const filenameBase = calendarName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'choir-schedule';
            e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
            e.response.header().set("Content-Disposition", `attachment; filename="${filenameBase}-${profile.id}.ics"`);
            e.response.header().set("Cache-Control", "no-store, must-revalidate");
            return e.string(200, icsContent);
        }
        catch (err) {
            return e.json(500, { error: "Failed to generate calendar feed: " + String(err) });
        }
    }
    function handleCalendarFeedUrl(e) {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { error: "Unauthorized" });
        }
        const app = $app;
        try {
            const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
            let salt = profile.get("calendarSalt");
            if (!salt) {
                salt = $security.randomString(16);
                profile.set("calendarSalt", salt);
                app.saveNoValidate(profile);
            }
            const secret = getHmacSecretLocal(app);
            if (!secret) {
                return e.json(500, { error: "Configuration error" });
            }
            const payload = `p=${profile.id}&c=${salt}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            return e.json(200, { token });
        }
        catch (_a) {
            return e.json(404, { error: "Singer profile not found" });
        }
    }
    function handleCalendarFeedReset(e) {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { error: "Unauthorized" });
        }
        const app = $app;
        try {
            const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
            // Generate new salt
            const salt = $security.randomString(16);
            profile.set("calendarSalt", salt);
            app.saveNoValidate(profile);
            const secret = getHmacSecretLocal(app);
            if (!secret) {
                return e.json(500, { error: "Configuration error" });
            }
            const payload = `p=${profile.id}&c=${salt}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            return e.json(200, { token });
        }
        catch (err) {
            return e.json(500, { error: "Failed to reset calendar feed: " + String(err) });
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

    return handleCalendarDownload(e);
});

routerAdd("GET", "/api/calendar/feed", (e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: calendarEndpoint.ts ---
    "use strict";
    function getHmacSecretLocal(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return parsed && parsed.secret ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function parseSignedTokenLocal(token, requiredKeys) {
        if (!token || typeof token !== "string")
            return null;
        const parts = {};
        const allowed = { s: true, e: true, p: true, a: true, c: true };
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
        catch (_a) {
            // ignore error
        }
        return timezone;
    }
    function getChoirNameLocal(app) {
        try {
            const setting = app.findFirstRecordByFilter("appSettings", "key = 'choirName'");
            const parsed = parseJsonField(setting.get("value"));
            const directName = safeTrim(typeof parsed === "string" ? parsed : "");
            if (directName) {
                return directName;
            }
            if (parsed && typeof parsed === "object") {
                const value = parsed.name || parsed.choirName || parsed.value;
                const nestedName = safeTrim(value);
                if (nestedName) {
                    return nestedName;
                }
            }
        }
        catch (_a) {
            // ignore error
        }
        return "Choir";
    }
    function safeTrim(str) {
        if (!str)
            return "";
        return String(str).replace(/^\s+|\s+$/g, "");
    }
    function getLocalDatePart(date, timezone) {
        const offsetInfo = getTimezoneOffsetInfo(date, timezone);
        const localDate = new Date(date.getTime() + (offsetInfo.offsetMinutes * 60 * 1000));
        const y = localDate.getUTCFullYear();
        const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(localDate.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    /**
     * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
     * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
     */
    function parseSafeUtcDate(dateStr, timezone) {
        if (!dateStr)
            return new Date();
        let normalized = safeTrim(dateStr);
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
            let title = "";
            let details = "";
            let uid = "";
            let callTime = "";
            let durationMinutes = 120;
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
                catch (_a) {
                    // Ignore venue resolution error
                }
                locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
                start = parseSafeUtcDate(event.get("date"), timezone);
                durationMinutes = Number(event.get("durationMinutes")) || (event.get("type") === "Performance" ? 150 : 120);
                title = event.get("title") || event.get("type") || "Choir Event";
                details = event.get("details") || "";
                callTime = event.get("callTime") || "";
                uid = `event-${event.id}@choir-management.local`;
            }
            else if (parts.a) {
                const audition = app.findRecordById("auditions", parts.a);
                start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
                durationMinutes = 30; // 30 mins for audition
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
                catch (_b) {
                    // Ignore performance/venue resolution error
                }
                locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
                details = "Please arrive 10 minutes early to warm up.";
            }
            const end = new Date(start.getTime() + (typeof durationMinutes === 'number' ? durationMinutes : 120) * 60 * 1000);
            const dtstamp = new Date();
            const choirName = getChoirNameLocal(app);
            const calendarName = `${choirName} Schedule`;
            const vevents = [];
            if (callTime) {
                const localDatePart = getLocalDatePart(start, timezone);
                const callStart = parseSafeUtcDate(`${localDatePart} ${callTime}`, timezone);
                if (callStart.getTime() < start.getTime()) {
                    vevents.push('BEGIN:VEVENT', `UID:call-${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(callStart)}`, `DTEND:${fmtUtc(start)}`, `SUMMARY:Call: ${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:Arrival and warm-up for ${escapeIcsText(title)}.`, 'END:VEVENT');
                }
            }
            vevents.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(start)}`, `DTEND:${fmtUtc(end)}`, `SUMMARY:${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:${escapeIcsText(details)}`, 'END:VEVENT');
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Choir Management Tool//EN',
                'CALSCALE:GREGORIAN',
                `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
                `X-WR-TIMEZONE:${timezone}`,
                vevents.join('\r\n'),
                'END:VCALENDAR',
                ''
            ].join('\r\n');
            const filenameBase = calendarName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'choir-schedule';
            const fileId = parts.e ? `event-${parts.e}` : `audition-${parts.a}`;
            e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
            e.response.header().set("Content-Disposition", `attachment; filename="${filenameBase}-${fileId}.ics"`);
            return e.string(200, icsContent);
        }
        catch (_c) {
            return e.json(404, { error: "Event or Audition not found" });
        }
    }
    function handleCalendarFeed(e) {
        const token = e.requestInfo().query["token"];
        const app = $app;
        if (!token) {
            return e.json(400, { error: "Missing token" });
        }
        const parts = parseSignedTokenLocal(token, ["p", "c", "s"]);
        if (!parts) {
            return e.json(400, { error: "Invalid token format" });
        }
        const secret = getHmacSecretLocal(app);
        if (!secret) {
            return e.json(500, { error: "Configuration error" });
        }
        // Verify signature over the payload p=<profileId>&c=<calendarSalt>
        const payload = `p=${parts.p}&c=${parts.c}`;
        const expectedSignature = $security.hs256(payload, secret);
        if (!$security.equal(parts.s, expectedSignature)) {
            return e.json(401, { error: "Invalid signature" });
        }
        try {
            // Fetch singer profile
            const profile = app.findRecordById("profiles", parts.p);
            // Double check calendar salt matches
            const activeSalt = profile.get("calendarSalt");
            if (!activeSalt || activeSalt !== parts.c) {
                return e.json(401, { error: "Token has been reset or is invalid" });
            }
            const timezone = getChoirTimezoneLocal(app);
            // Fetch all events (Performance/Rehearsal) - past 30 days up to 1 year in the future.
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ");
            const events = app.findRecordsByFilter("events", `date >= '${thirtyDaysAgo}'`, "-date", 500);
            // Fetch all rosters (RSVPs) for this profile
            const rosters = app.findRecordsByFilter("eventRosters", `profile = '${profile.id}'`, "", 1000);
            // Map event ID to roster record
            const rosterMap = {};
            rosters.forEach(r => {
                rosterMap[r.get("event")] = r;
            });
            // Resolve each event
            const eventsToInclude = [];
            const rsvpStatusMap = {}; // Cache resolved RSVPs
            // Loop through all events to calculate their resolved RSVP status
            events.forEach(event => {
                const eventId = event.id;
                const eventType = event.get("type");
                // Check for direct roster RSVP
                const roster = rosterMap[eventId];
                let resolvedRsvp = roster ? roster.get("rsvp") : "Pending";
                if (eventType === "Rehearsal" && resolvedRsvp === "Pending") {
                    // Rehearsal inherits from parent performance
                    const parentId = event.get("parentPerformanceId");
                    if (parentId) {
                        const parentRoster = rosterMap[parentId];
                        const parentRsvp = parentRoster ? parentRoster.get("rsvp") : "Pending";
                        if (parentRsvp !== "Pending") {
                            resolvedRsvp = parentRsvp;
                        }
                    }
                }
                // Only include if RSVP is Yes (Attending) or Pending
                if (resolvedRsvp === "Yes" || resolvedRsvp === "Pending") {
                    eventsToInclude.push(event);
                    rsvpStatusMap[eventId] = resolvedRsvp;
                }
            });
            // Sort events chronologically (oldest first)
            eventsToInclude.sort((a, b) => {
                return new Date(a.get("date")).getTime() - new Date(b.get("date")).getTime();
            });
            // Build the VEVENT list
            const vevents = [];
            const dtstamp = new Date();
            // Pre-fetch all venues
            const venueMap = {};
            try {
                const allVenues = app.findRecordsByFilter("venues", "1 = 1", "", 500);
                allVenues.forEach(v => {
                    venueMap[v.id] = v;
                });
            }
            catch (_a) {
                // ignore venue pre-fetch failure
            }
            eventsToInclude.forEach((event) => {
                let venueName = "";
                let venueAddress = "";
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = venueMap[venueId] || app.findRecordById("venues", venueId);
                    if (venue) {
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
                const locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
                const start = parseSafeUtcDate(event.get("date"), timezone);
                // Duration: rehearsals default to 2 hours, performances default to 2.5 hours
                const durationMinutes = Number(event.get("durationMinutes")) || (event.get("type") === "Performance" ? 150 : 120);
                const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
                const rsvpText = rsvpStatusMap[event.id] === "Yes" ? "Attending" : "Pending RSVP";
                const typeText = event.get("type");
                const callTime = event.get("callTime");
                // Build premium DESCRIPTION field
                const descParts = [];
                descParts.push(`Type: ${typeText}`);
                descParts.push(`Your Status: ${rsvpText}`);
                if (callTime) {
                    descParts.push(`Call Time: ${callTime}`);
                }
                const details = event.get("details");
                if (details) {
                    descParts.push(`\nDetails:\n${details}`);
                }
                // Set List inclusion
                const setListApproved = event.get("setListApproved");
                if (setListApproved && rsvpStatusMap[event.id] === "Yes") {
                    const rawSetList = event.get("setList");
                    const parsedSetList = parseJsonField(rawSetList);
                    if (parsedSetList && parsedSetList.length > 0) {
                        descParts.push(`\nSet List:`);
                        parsedSetList.forEach((item, index) => {
                            const songTitle = item.title;
                            const songComposer = item.composer || "";
                            const itemStr = songComposer ? `${index + 1}. ${songTitle} (${songComposer})` : `${index + 1}. ${songTitle}`;
                            descParts.push(itemStr);
                        });
                    }
                }
                const description = descParts.join("\n");
                const title = event.get("title");
                const uid = `event-${event.id}@choir-management.local`;
                if (callTime) {
                    const localDatePart = getLocalDatePart(start, timezone);
                    const callStart = parseSafeUtcDate(`${localDatePart} ${callTime}`, timezone);
                    if (callStart.getTime() < start.getTime()) {
                        vevents.push('BEGIN:VEVENT', `UID:call-${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(callStart)}`, `DTEND:${fmtUtc(start)}`, `SUMMARY:Call: ${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:Arrival and warm-up for ${escapeIcsText(title)}.`, 'END:VEVENT');
                    }
                }
                vevents.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(start)}`, `DTEND:${fmtUtc(end)}`, `SUMMARY:${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:${escapeIcsText(description)}`, 'END:VEVENT');
            });
            const choirName = getChoirNameLocal(app);
            const calendarName = `${choirName} Schedule`;
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Choir Management Tool//EN',
                'CALSCALE:GREGORIAN',
                `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
                'X-WR-TIMEZONE:' + timezone,
                vevents.join('\r\n'),
                'END:VCALENDAR',
                ''
            ].join('\r\n');
            const filenameBase = calendarName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'choir-schedule';
            e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
            e.response.header().set("Content-Disposition", `attachment; filename="${filenameBase}-${profile.id}.ics"`);
            e.response.header().set("Cache-Control", "no-store, must-revalidate");
            return e.string(200, icsContent);
        }
        catch (err) {
            return e.json(500, { error: "Failed to generate calendar feed: " + String(err) });
        }
    }
    function handleCalendarFeedUrl(e) {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { error: "Unauthorized" });
        }
        const app = $app;
        try {
            const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
            let salt = profile.get("calendarSalt");
            if (!salt) {
                salt = $security.randomString(16);
                profile.set("calendarSalt", salt);
                app.saveNoValidate(profile);
            }
            const secret = getHmacSecretLocal(app);
            if (!secret) {
                return e.json(500, { error: "Configuration error" });
            }
            const payload = `p=${profile.id}&c=${salt}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            return e.json(200, { token });
        }
        catch (_a) {
            return e.json(404, { error: "Singer profile not found" });
        }
    }
    function handleCalendarFeedReset(e) {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { error: "Unauthorized" });
        }
        const app = $app;
        try {
            const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
            // Generate new salt
            const salt = $security.randomString(16);
            profile.set("calendarSalt", salt);
            app.saveNoValidate(profile);
            const secret = getHmacSecretLocal(app);
            if (!secret) {
                return e.json(500, { error: "Configuration error" });
            }
            const payload = `p=${profile.id}&c=${salt}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            return e.json(200, { token });
        }
        catch (err) {
            return e.json(500, { error: "Failed to reset calendar feed: " + String(err) });
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

    return handleCalendarFeed(e);
});

routerAdd("GET", "/api/singer/calendar-feed-url", (e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: calendarEndpoint.ts ---
    "use strict";
    function getHmacSecretLocal(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return parsed && parsed.secret ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function parseSignedTokenLocal(token, requiredKeys) {
        if (!token || typeof token !== "string")
            return null;
        const parts = {};
        const allowed = { s: true, e: true, p: true, a: true, c: true };
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
        catch (_a) {
            // ignore error
        }
        return timezone;
    }
    function getChoirNameLocal(app) {
        try {
            const setting = app.findFirstRecordByFilter("appSettings", "key = 'choirName'");
            const parsed = parseJsonField(setting.get("value"));
            const directName = safeTrim(typeof parsed === "string" ? parsed : "");
            if (directName) {
                return directName;
            }
            if (parsed && typeof parsed === "object") {
                const value = parsed.name || parsed.choirName || parsed.value;
                const nestedName = safeTrim(value);
                if (nestedName) {
                    return nestedName;
                }
            }
        }
        catch (_a) {
            // ignore error
        }
        return "Choir";
    }
    function safeTrim(str) {
        if (!str)
            return "";
        return String(str).replace(/^\s+|\s+$/g, "");
    }
    function getLocalDatePart(date, timezone) {
        const offsetInfo = getTimezoneOffsetInfo(date, timezone);
        const localDate = new Date(date.getTime() + (offsetInfo.offsetMinutes * 60 * 1000));
        const y = localDate.getUTCFullYear();
        const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(localDate.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    /**
     * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
     * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
     */
    function parseSafeUtcDate(dateStr, timezone) {
        if (!dateStr)
            return new Date();
        let normalized = safeTrim(dateStr);
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
            let title = "";
            let details = "";
            let uid = "";
            let callTime = "";
            let durationMinutes = 120;
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
                catch (_a) {
                    // Ignore venue resolution error
                }
                locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
                start = parseSafeUtcDate(event.get("date"), timezone);
                durationMinutes = Number(event.get("durationMinutes")) || (event.get("type") === "Performance" ? 150 : 120);
                title = event.get("title") || event.get("type") || "Choir Event";
                details = event.get("details") || "";
                callTime = event.get("callTime") || "";
                uid = `event-${event.id}@choir-management.local`;
            }
            else if (parts.a) {
                const audition = app.findRecordById("auditions", parts.a);
                start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
                durationMinutes = 30; // 30 mins for audition
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
                catch (_b) {
                    // Ignore performance/venue resolution error
                }
                locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
                details = "Please arrive 10 minutes early to warm up.";
            }
            const end = new Date(start.getTime() + (typeof durationMinutes === 'number' ? durationMinutes : 120) * 60 * 1000);
            const dtstamp = new Date();
            const choirName = getChoirNameLocal(app);
            const calendarName = `${choirName} Schedule`;
            const vevents = [];
            if (callTime) {
                const localDatePart = getLocalDatePart(start, timezone);
                const callStart = parseSafeUtcDate(`${localDatePart} ${callTime}`, timezone);
                if (callStart.getTime() < start.getTime()) {
                    vevents.push('BEGIN:VEVENT', `UID:call-${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(callStart)}`, `DTEND:${fmtUtc(start)}`, `SUMMARY:Call: ${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:Arrival and warm-up for ${escapeIcsText(title)}.`, 'END:VEVENT');
                }
            }
            vevents.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(start)}`, `DTEND:${fmtUtc(end)}`, `SUMMARY:${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:${escapeIcsText(details)}`, 'END:VEVENT');
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Choir Management Tool//EN',
                'CALSCALE:GREGORIAN',
                `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
                `X-WR-TIMEZONE:${timezone}`,
                vevents.join('\r\n'),
                'END:VCALENDAR',
                ''
            ].join('\r\n');
            const filenameBase = calendarName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'choir-schedule';
            const fileId = parts.e ? `event-${parts.e}` : `audition-${parts.a}`;
            e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
            e.response.header().set("Content-Disposition", `attachment; filename="${filenameBase}-${fileId}.ics"`);
            return e.string(200, icsContent);
        }
        catch (_c) {
            return e.json(404, { error: "Event or Audition not found" });
        }
    }
    function handleCalendarFeed(e) {
        const token = e.requestInfo().query["token"];
        const app = $app;
        if (!token) {
            return e.json(400, { error: "Missing token" });
        }
        const parts = parseSignedTokenLocal(token, ["p", "c", "s"]);
        if (!parts) {
            return e.json(400, { error: "Invalid token format" });
        }
        const secret = getHmacSecretLocal(app);
        if (!secret) {
            return e.json(500, { error: "Configuration error" });
        }
        // Verify signature over the payload p=<profileId>&c=<calendarSalt>
        const payload = `p=${parts.p}&c=${parts.c}`;
        const expectedSignature = $security.hs256(payload, secret);
        if (!$security.equal(parts.s, expectedSignature)) {
            return e.json(401, { error: "Invalid signature" });
        }
        try {
            // Fetch singer profile
            const profile = app.findRecordById("profiles", parts.p);
            // Double check calendar salt matches
            const activeSalt = profile.get("calendarSalt");
            if (!activeSalt || activeSalt !== parts.c) {
                return e.json(401, { error: "Token has been reset or is invalid" });
            }
            const timezone = getChoirTimezoneLocal(app);
            // Fetch all events (Performance/Rehearsal) - past 30 days up to 1 year in the future.
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ");
            const events = app.findRecordsByFilter("events", `date >= '${thirtyDaysAgo}'`, "-date", 500);
            // Fetch all rosters (RSVPs) for this profile
            const rosters = app.findRecordsByFilter("eventRosters", `profile = '${profile.id}'`, "", 1000);
            // Map event ID to roster record
            const rosterMap = {};
            rosters.forEach(r => {
                rosterMap[r.get("event")] = r;
            });
            // Resolve each event
            const eventsToInclude = [];
            const rsvpStatusMap = {}; // Cache resolved RSVPs
            // Loop through all events to calculate their resolved RSVP status
            events.forEach(event => {
                const eventId = event.id;
                const eventType = event.get("type");
                // Check for direct roster RSVP
                const roster = rosterMap[eventId];
                let resolvedRsvp = roster ? roster.get("rsvp") : "Pending";
                if (eventType === "Rehearsal" && resolvedRsvp === "Pending") {
                    // Rehearsal inherits from parent performance
                    const parentId = event.get("parentPerformanceId");
                    if (parentId) {
                        const parentRoster = rosterMap[parentId];
                        const parentRsvp = parentRoster ? parentRoster.get("rsvp") : "Pending";
                        if (parentRsvp !== "Pending") {
                            resolvedRsvp = parentRsvp;
                        }
                    }
                }
                // Only include if RSVP is Yes (Attending) or Pending
                if (resolvedRsvp === "Yes" || resolvedRsvp === "Pending") {
                    eventsToInclude.push(event);
                    rsvpStatusMap[eventId] = resolvedRsvp;
                }
            });
            // Sort events chronologically (oldest first)
            eventsToInclude.sort((a, b) => {
                return new Date(a.get("date")).getTime() - new Date(b.get("date")).getTime();
            });
            // Build the VEVENT list
            const vevents = [];
            const dtstamp = new Date();
            // Pre-fetch all venues
            const venueMap = {};
            try {
                const allVenues = app.findRecordsByFilter("venues", "1 = 1", "", 500);
                allVenues.forEach(v => {
                    venueMap[v.id] = v;
                });
            }
            catch (_a) {
                // ignore venue pre-fetch failure
            }
            eventsToInclude.forEach((event) => {
                let venueName = "";
                let venueAddress = "";
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = venueMap[venueId] || app.findRecordById("venues", venueId);
                    if (venue) {
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
                const locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
                const start = parseSafeUtcDate(event.get("date"), timezone);
                // Duration: rehearsals default to 2 hours, performances default to 2.5 hours
                const durationMinutes = Number(event.get("durationMinutes")) || (event.get("type") === "Performance" ? 150 : 120);
                const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
                const rsvpText = rsvpStatusMap[event.id] === "Yes" ? "Attending" : "Pending RSVP";
                const typeText = event.get("type");
                const callTime = event.get("callTime");
                // Build premium DESCRIPTION field
                const descParts = [];
                descParts.push(`Type: ${typeText}`);
                descParts.push(`Your Status: ${rsvpText}`);
                if (callTime) {
                    descParts.push(`Call Time: ${callTime}`);
                }
                const details = event.get("details");
                if (details) {
                    descParts.push(`\nDetails:\n${details}`);
                }
                // Set List inclusion
                const setListApproved = event.get("setListApproved");
                if (setListApproved && rsvpStatusMap[event.id] === "Yes") {
                    const rawSetList = event.get("setList");
                    const parsedSetList = parseJsonField(rawSetList);
                    if (parsedSetList && parsedSetList.length > 0) {
                        descParts.push(`\nSet List:`);
                        parsedSetList.forEach((item, index) => {
                            const songTitle = item.title;
                            const songComposer = item.composer || "";
                            const itemStr = songComposer ? `${index + 1}. ${songTitle} (${songComposer})` : `${index + 1}. ${songTitle}`;
                            descParts.push(itemStr);
                        });
                    }
                }
                const description = descParts.join("\n");
                const title = event.get("title");
                const uid = `event-${event.id}@choir-management.local`;
                if (callTime) {
                    const localDatePart = getLocalDatePart(start, timezone);
                    const callStart = parseSafeUtcDate(`${localDatePart} ${callTime}`, timezone);
                    if (callStart.getTime() < start.getTime()) {
                        vevents.push('BEGIN:VEVENT', `UID:call-${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(callStart)}`, `DTEND:${fmtUtc(start)}`, `SUMMARY:Call: ${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:Arrival and warm-up for ${escapeIcsText(title)}.`, 'END:VEVENT');
                    }
                }
                vevents.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(start)}`, `DTEND:${fmtUtc(end)}`, `SUMMARY:${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:${escapeIcsText(description)}`, 'END:VEVENT');
            });
            const choirName = getChoirNameLocal(app);
            const calendarName = `${choirName} Schedule`;
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Choir Management Tool//EN',
                'CALSCALE:GREGORIAN',
                `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
                'X-WR-TIMEZONE:' + timezone,
                vevents.join('\r\n'),
                'END:VCALENDAR',
                ''
            ].join('\r\n');
            const filenameBase = calendarName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'choir-schedule';
            e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
            e.response.header().set("Content-Disposition", `attachment; filename="${filenameBase}-${profile.id}.ics"`);
            e.response.header().set("Cache-Control", "no-store, must-revalidate");
            return e.string(200, icsContent);
        }
        catch (err) {
            return e.json(500, { error: "Failed to generate calendar feed: " + String(err) });
        }
    }
    function handleCalendarFeedUrl(e) {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { error: "Unauthorized" });
        }
        const app = $app;
        try {
            const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
            let salt = profile.get("calendarSalt");
            if (!salt) {
                salt = $security.randomString(16);
                profile.set("calendarSalt", salt);
                app.saveNoValidate(profile);
            }
            const secret = getHmacSecretLocal(app);
            if (!secret) {
                return e.json(500, { error: "Configuration error" });
            }
            const payload = `p=${profile.id}&c=${salt}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            return e.json(200, { token });
        }
        catch (_a) {
            return e.json(404, { error: "Singer profile not found" });
        }
    }
    function handleCalendarFeedReset(e) {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { error: "Unauthorized" });
        }
        const app = $app;
        try {
            const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
            // Generate new salt
            const salt = $security.randomString(16);
            profile.set("calendarSalt", salt);
            app.saveNoValidate(profile);
            const secret = getHmacSecretLocal(app);
            if (!secret) {
                return e.json(500, { error: "Configuration error" });
            }
            const payload = `p=${profile.id}&c=${salt}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            return e.json(200, { token });
        }
        catch (err) {
            return e.json(500, { error: "Failed to reset calendar feed: " + String(err) });
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

    return handleCalendarFeedUrl(e);
});

routerAdd("POST", "/api/singer/calendar-feed-url/reset", (e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: email/hookText.ts ---
    "use strict";
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
    function sanitizeHtmlTemplateData(data) {
        const sanitized = {};
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            sanitized[key] = escapeHtml(value == null ? "" : String(value));
        }
        return sanitized;
    }
    function sanitizeEmailSubject(str) {
        if (!str)
            return "";
        return String(str).replace(/[\r\n]+/g, " ").trim();
    }
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
            return new Intl.DateTimeFormat("en-US", Object.assign(Object.assign({}, options), { timeZone: timezone })).format(d);
        }
        catch (_a) {
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

    // --- Utility source: calendarEndpoint.ts ---
    "use strict";
    function getHmacSecretLocal(app) {
        try {
            const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
            const parsed = parseJsonField(record.get("value"));
            return parsed && parsed.secret ? parsed.secret : "";
        }
        catch (_a) {
            return "";
        }
    }
    function parseSignedTokenLocal(token, requiredKeys) {
        if (!token || typeof token !== "string")
            return null;
        const parts = {};
        const allowed = { s: true, e: true, p: true, a: true, c: true };
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
        catch (_a) {
            // ignore error
        }
        return timezone;
    }
    function getChoirNameLocal(app) {
        try {
            const setting = app.findFirstRecordByFilter("appSettings", "key = 'choirName'");
            const parsed = parseJsonField(setting.get("value"));
            const directName = safeTrim(typeof parsed === "string" ? parsed : "");
            if (directName) {
                return directName;
            }
            if (parsed && typeof parsed === "object") {
                const value = parsed.name || parsed.choirName || parsed.value;
                const nestedName = safeTrim(value);
                if (nestedName) {
                    return nestedName;
                }
            }
        }
        catch (_a) {
            // ignore error
        }
        return "Choir";
    }
    function safeTrim(str) {
        if (!str)
            return "";
        return String(str).replace(/^\s+|\s+$/g, "");
    }
    function getLocalDatePart(date, timezone) {
        const offsetInfo = getTimezoneOffsetInfo(date, timezone);
        const localDate = new Date(date.getTime() + (offsetInfo.offsetMinutes * 60 * 1000));
        const y = localDate.getUTCFullYear();
        const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(localDate.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    /**
     * Robustly parses a date string in Goja VM to guarantee UTC timezone alignment.
     * Supports strict ISO-8601 strings and legacy formatted text strings defensively.
     */
    function parseSafeUtcDate(dateStr, timezone) {
        if (!dateStr)
            return new Date();
        let normalized = safeTrim(dateStr);
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
            let title = "";
            let details = "";
            let uid = "";
            let callTime = "";
            let durationMinutes = 120;
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
                catch (_a) {
                    // Ignore venue resolution error
                }
                locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
                start = parseSafeUtcDate(event.get("date"), timezone);
                durationMinutes = Number(event.get("durationMinutes")) || (event.get("type") === "Performance" ? 150 : 120);
                title = event.get("title") || event.get("type") || "Choir Event";
                details = event.get("details") || "";
                callTime = event.get("callTime") || "";
                uid = `event-${event.id}@choir-management.local`;
            }
            else if (parts.a) {
                const audition = app.findRecordById("auditions", parts.a);
                start = parseSafeUtcDate(audition.get("scheduledTimeSlot"), timezone);
                durationMinutes = 30; // 30 mins for audition
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
                catch (_b) {
                    // Ignore performance/venue resolution error
                }
                locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : "";
                details = "Please arrive 10 minutes early to warm up.";
            }
            const end = new Date(start.getTime() + (typeof durationMinutes === 'number' ? durationMinutes : 120) * 60 * 1000);
            const dtstamp = new Date();
            const choirName = getChoirNameLocal(app);
            const calendarName = `${choirName} Schedule`;
            const vevents = [];
            if (callTime) {
                const localDatePart = getLocalDatePart(start, timezone);
                const callStart = parseSafeUtcDate(`${localDatePart} ${callTime}`, timezone);
                if (callStart.getTime() < start.getTime()) {
                    vevents.push('BEGIN:VEVENT', `UID:call-${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(callStart)}`, `DTEND:${fmtUtc(start)}`, `SUMMARY:Call: ${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:Arrival and warm-up for ${escapeIcsText(title)}.`, 'END:VEVENT');
                }
            }
            vevents.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(start)}`, `DTEND:${fmtUtc(end)}`, `SUMMARY:${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:${escapeIcsText(details)}`, 'END:VEVENT');
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Choir Management Tool//EN',
                'CALSCALE:GREGORIAN',
                `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
                `X-WR-TIMEZONE:${timezone}`,
                vevents.join('\r\n'),
                'END:VCALENDAR',
                ''
            ].join('\r\n');
            const filenameBase = calendarName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'choir-schedule';
            const fileId = parts.e ? `event-${parts.e}` : `audition-${parts.a}`;
            e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
            e.response.header().set("Content-Disposition", `attachment; filename="${filenameBase}-${fileId}.ics"`);
            return e.string(200, icsContent);
        }
        catch (_c) {
            return e.json(404, { error: "Event or Audition not found" });
        }
    }
    function handleCalendarFeed(e) {
        const token = e.requestInfo().query["token"];
        const app = $app;
        if (!token) {
            return e.json(400, { error: "Missing token" });
        }
        const parts = parseSignedTokenLocal(token, ["p", "c", "s"]);
        if (!parts) {
            return e.json(400, { error: "Invalid token format" });
        }
        const secret = getHmacSecretLocal(app);
        if (!secret) {
            return e.json(500, { error: "Configuration error" });
        }
        // Verify signature over the payload p=<profileId>&c=<calendarSalt>
        const payload = `p=${parts.p}&c=${parts.c}`;
        const expectedSignature = $security.hs256(payload, secret);
        if (!$security.equal(parts.s, expectedSignature)) {
            return e.json(401, { error: "Invalid signature" });
        }
        try {
            // Fetch singer profile
            const profile = app.findRecordById("profiles", parts.p);
            // Double check calendar salt matches
            const activeSalt = profile.get("calendarSalt");
            if (!activeSalt || activeSalt !== parts.c) {
                return e.json(401, { error: "Token has been reset or is invalid" });
            }
            const timezone = getChoirTimezoneLocal(app);
            // Fetch all events (Performance/Rehearsal) - past 30 days up to 1 year in the future.
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ");
            const events = app.findRecordsByFilter("events", `date >= '${thirtyDaysAgo}'`, "-date", 500);
            // Fetch all rosters (RSVPs) for this profile
            const rosters = app.findRecordsByFilter("eventRosters", `profile = '${profile.id}'`, "", 1000);
            // Map event ID to roster record
            const rosterMap = {};
            rosters.forEach(r => {
                rosterMap[r.get("event")] = r;
            });
            // Resolve each event
            const eventsToInclude = [];
            const rsvpStatusMap = {}; // Cache resolved RSVPs
            // Loop through all events to calculate their resolved RSVP status
            events.forEach(event => {
                const eventId = event.id;
                const eventType = event.get("type");
                // Check for direct roster RSVP
                const roster = rosterMap[eventId];
                let resolvedRsvp = roster ? roster.get("rsvp") : "Pending";
                if (eventType === "Rehearsal" && resolvedRsvp === "Pending") {
                    // Rehearsal inherits from parent performance
                    const parentId = event.get("parentPerformanceId");
                    if (parentId) {
                        const parentRoster = rosterMap[parentId];
                        const parentRsvp = parentRoster ? parentRoster.get("rsvp") : "Pending";
                        if (parentRsvp !== "Pending") {
                            resolvedRsvp = parentRsvp;
                        }
                    }
                }
                // Only include if RSVP is Yes (Attending) or Pending
                if (resolvedRsvp === "Yes" || resolvedRsvp === "Pending") {
                    eventsToInclude.push(event);
                    rsvpStatusMap[eventId] = resolvedRsvp;
                }
            });
            // Sort events chronologically (oldest first)
            eventsToInclude.sort((a, b) => {
                return new Date(a.get("date")).getTime() - new Date(b.get("date")).getTime();
            });
            // Build the VEVENT list
            const vevents = [];
            const dtstamp = new Date();
            // Pre-fetch all venues
            const venueMap = {};
            try {
                const allVenues = app.findRecordsByFilter("venues", "1 = 1", "", 500);
                allVenues.forEach(v => {
                    venueMap[v.id] = v;
                });
            }
            catch (_a) {
                // ignore venue pre-fetch failure
            }
            eventsToInclude.forEach((event) => {
                let venueName = "";
                let venueAddress = "";
                const venueId = event.get("venue");
                if (venueId) {
                    const venue = venueMap[venueId] || app.findRecordById("venues", venueId);
                    if (venue) {
                        venueName = venue.get("name") || "";
                        venueAddress = venue.get("address") || "";
                    }
                }
                const locationStr = venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : (event.get("location") || "");
                const start = parseSafeUtcDate(event.get("date"), timezone);
                // Duration: rehearsals default to 2 hours, performances default to 2.5 hours
                const durationMinutes = Number(event.get("durationMinutes")) || (event.get("type") === "Performance" ? 150 : 120);
                const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
                const rsvpText = rsvpStatusMap[event.id] === "Yes" ? "Attending" : "Pending RSVP";
                const typeText = event.get("type");
                const callTime = event.get("callTime");
                // Build premium DESCRIPTION field
                const descParts = [];
                descParts.push(`Type: ${typeText}`);
                descParts.push(`Your Status: ${rsvpText}`);
                if (callTime) {
                    descParts.push(`Call Time: ${callTime}`);
                }
                const details = event.get("details");
                if (details) {
                    descParts.push(`\nDetails:\n${details}`);
                }
                // Set List inclusion
                const setListApproved = event.get("setListApproved");
                if (setListApproved && rsvpStatusMap[event.id] === "Yes") {
                    const rawSetList = event.get("setList");
                    const parsedSetList = parseJsonField(rawSetList);
                    if (parsedSetList && parsedSetList.length > 0) {
                        descParts.push(`\nSet List:`);
                        parsedSetList.forEach((item, index) => {
                            const songTitle = item.title;
                            const songComposer = item.composer || "";
                            const itemStr = songComposer ? `${index + 1}. ${songTitle} (${songComposer})` : `${index + 1}. ${songTitle}`;
                            descParts.push(itemStr);
                        });
                    }
                }
                const description = descParts.join("\n");
                const title = event.get("title");
                const uid = `event-${event.id}@choir-management.local`;
                if (callTime) {
                    const localDatePart = getLocalDatePart(start, timezone);
                    const callStart = parseSafeUtcDate(`${localDatePart} ${callTime}`, timezone);
                    if (callStart.getTime() < start.getTime()) {
                        vevents.push('BEGIN:VEVENT', `UID:call-${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(callStart)}`, `DTEND:${fmtUtc(start)}`, `SUMMARY:Call: ${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:Arrival and warm-up for ${escapeIcsText(title)}.`, 'END:VEVENT');
                    }
                }
                vevents.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmtUtc(dtstamp)}`, `DTSTART:${fmtUtc(start)}`, `DTEND:${fmtUtc(end)}`, `SUMMARY:${escapeIcsText(title)}`, `LOCATION:${escapeIcsText(locationStr)}`, `DESCRIPTION:${escapeIcsText(description)}`, 'END:VEVENT');
            });
            const choirName = getChoirNameLocal(app);
            const calendarName = `${choirName} Schedule`;
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Choir Management Tool//EN',
                'CALSCALE:GREGORIAN',
                `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
                'X-WR-TIMEZONE:' + timezone,
                vevents.join('\r\n'),
                'END:VCALENDAR',
                ''
            ].join('\r\n');
            const filenameBase = calendarName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'choir-schedule';
            e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
            e.response.header().set("Content-Disposition", `attachment; filename="${filenameBase}-${profile.id}.ics"`);
            e.response.header().set("Cache-Control", "no-store, must-revalidate");
            return e.string(200, icsContent);
        }
        catch (err) {
            return e.json(500, { error: "Failed to generate calendar feed: " + String(err) });
        }
    }
    function handleCalendarFeedUrl(e) {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { error: "Unauthorized" });
        }
        const app = $app;
        try {
            const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
            let salt = profile.get("calendarSalt");
            if (!salt) {
                salt = $security.randomString(16);
                profile.set("calendarSalt", salt);
                app.saveNoValidate(profile);
            }
            const secret = getHmacSecretLocal(app);
            if (!secret) {
                return e.json(500, { error: "Configuration error" });
            }
            const payload = `p=${profile.id}&c=${salt}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            return e.json(200, { token });
        }
        catch (_a) {
            return e.json(404, { error: "Singer profile not found" });
        }
    }
    function handleCalendarFeedReset(e) {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { error: "Unauthorized" });
        }
        const app = $app;
        try {
            const profile = app.findFirstRecordByFilter("profiles", `user = '${authRecord.id}'`);
            // Generate new salt
            const salt = $security.randomString(16);
            profile.set("calendarSalt", salt);
            app.saveNoValidate(profile);
            const secret = getHmacSecretLocal(app);
            if (!secret) {
                return e.json(500, { error: "Configuration error" });
            }
            const payload = `p=${profile.id}&c=${salt}`;
            const signature = $security.hs256(payload, secret);
            const token = `${payload}&s=${signature}`;
            return e.json(200, { token });
        }
        catch (err) {
            return e.json(500, { error: "Failed to reset calendar feed: " + String(err) });
        }
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

    return handleCalendarFeedReset(e);
});

routerAdd("GET", "/api/singer/seating-profiles", (e) => {
    // --- CALLBACK-LOCAL UTILITIES (generated from detected bundles) ---
    // --- Utility source: email/hookJson.ts ---
    "use strict";
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
                catch (_a) {
                    // Ignore decoding errors
                }
            }
            return val;
        }
        return String(val);
    }
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
        catch (_a) {
            return null;
        }
    }

    // --- Utility source: singerSeatingEndpoint.ts ---
    "use strict";
    function getRecordString(record, field) {
        const value = record.get(field);
        return typeof value === "string" ? value : "";
    }
    function getChartAssignments(record) {
        const parsed = parseJsonField(record.get("assignments"));
        if (parsed && typeof parsed === "object" && parsed.assignments && typeof parsed.assignments === "object") {
            return parsed.assignments;
        }
        const rawAssignments = parseJsonField(record.get("assignments"));
        return rawAssignments && typeof rawAssignments === "object" ? rawAssignments : {};
    }
    function getSingerProfileForAuth(app, authId) {
        try {
            return app.findFirstRecordByFilter("profiles", "user = {:userId}", { userId: authId });
        }
        catch (_a) {
            return null;
        }
    }
    function isSingerOnEventRoster(app, eventId, profileId) {
        try {
            app.findFirstRecordByFilter("eventRosters", "event = {:eventId} && profile = {:profileId}", { eventId, profileId });
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    function handleSingerSeatingProfiles(e) {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { error: "Authentication required" });
        }
        const query = e.requestInfo().query;
        const eventId = typeof query["eventId"] === "string" ? query["eventId"] : "";
        const chartId = typeof query["chartId"] === "string" ? query["chartId"] : "";
        if (!eventId || !chartId) {
            return e.json(400, { error: "Missing eventId or chartId" });
        }
        const app = $app;
        const requestProfile = getSingerProfileForAuth(app, authRecord.id);
        if (!requestProfile || !isSingerOnEventRoster(app, eventId, requestProfile.id)) {
            return e.json(403, { error: "Forbidden" });
        }
        let chart;
        try {
            chart = app.findRecordById("pbc_seating_001", chartId);
        }
        catch (_a) {
            return e.json(404, { error: "Seating chart not found" });
        }
        if (getRecordString(chart, "performance") !== eventId) {
            return e.json(403, { error: "Forbidden" });
        }
        const assignments = getChartAssignments(chart);
        const profileIds = Array.from(new Set(Object.values(assignments).filter(id => typeof id === "string" && id.length > 0)));
        const profiles = profileIds.map(profileId => {
            try {
                const profile = app.findRecordById("profiles", profileId);
                return {
                    id: profile.id,
                    name: getRecordString(profile, "name"),
                    voicePart: getRecordString(profile, "voicePart"),
                };
            }
            catch (_a) {
                return null;
            }
        }).filter((profile) => profile !== null);
        return e.json(200, { profiles });
    }
    // --- END CALLBACK-LOCAL UTILITIES ---

    return handleSingerSeatingProfiles(e);
});
