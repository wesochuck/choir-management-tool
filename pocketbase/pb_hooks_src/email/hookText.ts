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
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return "";
        return new Intl.DateTimeFormat("en-US", {
            ...options,
            timeZone: timezone
        }).format(d);
    } catch {
        // Fallback if Intl fails
        return new Date(date).toLocaleString();
    }
}
