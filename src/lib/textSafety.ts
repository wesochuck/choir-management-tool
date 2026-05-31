type HtmlSanitizableValue = string | number | boolean | null | undefined;

/**
 * Escapes HTML characters in a string to prevent user-controlled text from
 * becoming markup when interpolated into trusted HTML templates.
 *
 * Keep this behavior aligned with pocketbase/pb_hooks_src/email/hookText.ts.
 */
export function escapeHtml(value: unknown): string {
  if (value == null) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes all scalar fields in a template data object for safe HTML interpolation.
 *
 * Keep this behavior aligned with pocketbase/pb_hooks_src/email/hookText.ts.
 */
export function sanitizeHtmlTemplateData<T extends Record<string, HtmlSanitizableValue>>(
  data: T,
): Record<keyof T, string> {
  const sanitized = {} as Record<keyof T, string>;
  const entries = Object.entries(data) as [keyof T, HtmlSanitizableValue][];

  for (const [key, value] of entries) {
    sanitized[key] = escapeHtml(value == null ? '' : String(value));
  }

  return sanitized;
}

/**
 * Sanitizes a string for use in an email subject line.
 * This is not HTML escaping; it prevents header/newline injection while keeping
 * normal subject text readable.
 *
 * Keep this behavior aligned with pocketbase/pb_hooks_src/email/hookText.ts.
 */
export function sanitizeEmailSubject(value: unknown): string {
  if (value == null) return '';

  return String(value).replace(/[\r\n]+/g, ' ').trim();
}
