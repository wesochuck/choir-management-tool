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
        // Fallback for Goja VM (PocketBase backend)
        let offsetHours: number;
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
        } else if (tz.includes("denver") || tz.includes("mountain")) {
            offsetHours = isDst ? -6 : -7;
        } else if (tz.includes("los_angeles") || tz.includes("pacific")) {
            offsetHours = isDst ? -7 : -8;
        } else if (tz.includes("phoenix") || tz.includes("arizona")) {
            offsetHours = -7; // Arizona does not observe DST
        } else {
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
        if (hr === 0) hr = 12;
        
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
        return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
    }
}
