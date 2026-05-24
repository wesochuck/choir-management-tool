/**
 * Escapes HTML characters in a string to prevent XSS.
 */
export function escapeHtml(str: string): string {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

type HtmlSanitizableValue = string | number | boolean | null | undefined;

/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 */
export function sanitizeHtmlTemplateData<T extends Record<string, HtmlSanitizableValue>>(
    data: T
): Record<keyof T, string> {
    const sanitized = {} as Record<keyof T, string>;
    const entries = Object.entries(data) as [keyof T, HtmlSanitizableValue][];
    for (const [key, value] of entries) {
        sanitized[key] = escapeHtml(value == null ? "" : String(value));
    }
    return sanitized;
}

/**
 * Sanitizes a string for use in an email subject line.
 */
export function sanitizeEmailSubject(str: string): string {
    if (!str) return "";
    return String(str).replace(/[\r\n]+/g, " ").trim();
}

/**
 * Ensures a base URL has no trailing slash.
 */
export function normalizeBaseUrl(url?: string): string {
    if (!url) return "http://localhost:5173";
    return String(url).trim().replace(/\/+$/g, "");
}

type TimezoneOffsetInfo = {
    offsetMinutes: number;
    abbreviation: string;
};

function nthSundayOfMonth(year: number, monthIndex: number, occurrence: number): number {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
}

function lastSundayOfMonth(year: number, monthIndex: number): number {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
}

function firstSundayOfMonth(year: number, monthIndex: number): number {
    return nthSundayOfMonth(year, monthIndex, 1);
}

function isUsDst(date: Date, standardOffsetMinutes: number, daylightOffsetMinutes: number): boolean {
    const year = date.getUTCFullYear();
    const dstStartDay = nthSundayOfMonth(year, 2, 2);
    const dstEndDay = nthSundayOfMonth(year, 10, 1);
    const dstStart = Date.UTC(year, 2, dstStartDay, 2, 0, 0, 0) - standardOffsetMinutes * 60 * 1000;
    const dstEnd = Date.UTC(year, 10, dstEndDay, 2, 0, 0, 0) - daylightOffsetMinutes * 60 * 1000;
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}

function isEuropeDst(date: Date): boolean {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 1, 0, 0, 0);
    const dstEnd = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 1, 0, 0, 0);
    return date.getTime() >= dstStart && date.getTime() < dstEnd;
}

function isSydneyDst(date: Date): boolean {
    const year = date.getUTCFullYear();
    const dstStart = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0) - 10 * 60 * 60 * 1000;
    const dstEnd = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0) - 11 * 60 * 60 * 1000;
    return date.getTime() >= dstStart || date.getTime() < dstEnd;
}

export function getTimezoneOffsetInfo(date: Date, timezone: string): TimezoneOffsetInfo {
    const tz = String(timezone || "").toLowerCase();

    if (tz === "utc" || tz === "etc/utc" || tz === "gmt") {
        return { offsetMinutes: 0, abbreviation: "UTC" };
    }

    const usZone = (
        standardOffsetMinutes: number,
        daylightOffsetMinutes: number,
        standardAbbreviation: string,
        daylightAbbreviation: string
    ): TimezoneOffsetInfo => {
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
export function formatInTimezone(date: string | Date, timezone: string, options: Intl.DateTimeFormatOptions): string {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

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
    } catch {
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
        if (hr === 0) hr = 12;
        
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
