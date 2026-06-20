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
/**
 * Sanitizes a string for use in an email subject line.
 * This is not HTML escaping; it prevents header/newline injection while keeping
 * normal subject text readable.
 *
 * Keep this behavior aligned with pocketbase/pb_hooks_src/email/hookText.ts.
 */
import DOMPurify from 'dompurify';

export function sanitizeEmailSubject(value: unknown): string {
  if (value == null) return '';

  return String(value)
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Safely sanitizes HTML content to prevent XSS attacks.
 * Allows a safe subset of tags (p, br, strong, em, u, h1, h2, h3, h4, h5, h6, ul, ol, li, a, blockquote, div, span).
 * Strips all script tags, iframe, object, embed, style, etc.
 * Strips all event handlers (on*) and javascript: / data: URIs in href/src.
 */
export function sanitizeHtml(htmlStr: string): string {
  if (!htmlStr) return '';

  // Use DOMPurify if available (client-side or where window is available)
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    try {
      // DOMPurify can be a factory function in Node/SSR/testing environment
      const purify =
        DOMPurify && typeof DOMPurify.sanitize === 'function'
          ? DOMPurify
          : (DOMPurify as unknown as (w: Window) => typeof DOMPurify)(window);

      return purify.sanitize(htmlStr, {
        ALLOWED_TAGS: [
          'p',
          'br',
          'strong',
          'em',
          'u',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'ul',
          'ol',
          'li',
          'a',
          'blockquote',
          'div',
          'span',
        ],
        ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel', 'id'],
        // Block all URI schemes that could be malicious
        ALLOW_DATA_ATTR: false,
      }) as string;
    } catch (e) {
      console.error('HTML Sanitization failed, falling back to escaped text', e);
      return escapeHtml(htmlStr);
    }
  }

  // Fallback: if DOMParser is not available (e.g. backend/SSR), we must escape everything for safety
  // DOMPurify needs a DOM. We can use jsdom if we want, but since this project is largely
  // frontend or relies on escapeHtml fallback, we stick to the existing behavior.
  return escapeHtml(htmlStr);
}
