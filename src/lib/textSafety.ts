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

/**
 * Safely sanitizes HTML content to prevent XSS attacks.
 * Allows a safe subset of tags (p, br, strong, em, u, h1, h2, h3, h4, h5, h6, ul, ol, li, a, blockquote, div, span).
 * Strips all script tags, iframe, object, embed, style, etc.
 * Strips all event handlers (on*) and javascript: / data: URIs in href/src.
 */
export function sanitizeHtml(htmlStr: string): string {
  if (!htmlStr) return '';

  // Use DOMParser if available (client-side or test jsdom environment)
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    try {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(htmlStr, 'text/html');
      
      const allowedTags = new Set([
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'blockquote', 'div', 'span'
      ]);

      const allowedAttrs = new Set(['class', 'style', 'href', 'target', 'rel', 'id']);

      const discardContentTags = new Set([
        'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template'
      ]);

      const cleanNode = (node: Node): Node | null => {
        // Text nodes are safe
        if (node.nodeType === 3) { // Node.TEXT_NODE
          return doc.createTextNode(node.nodeValue || '');
        }
        
        // Element nodes need scanning
        if (node.nodeType === 1) { // Node.ELEMENT_NODE
          const el = node as Element;
          const tagName = el.tagName.toLowerCase();
          
          if (discardContentTags.has(tagName)) {
            return null;
          }
          
          if (!allowedTags.has(tagName)) {
            // Strip tag, but recursively clean and keep children
            const fragment = doc.createDocumentFragment();
            for (let i = 0; i < el.childNodes.length; i++) {
              const cleaned = cleanNode(el.childNodes[i]);
              if (cleaned) {
                fragment.appendChild(cleaned);
              }
            }
            return fragment;
          }

          // Create cleaned element
          const cleanEl = doc.createElement(tagName);
          
          // Copy and clean attributes
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            const attrName = attr.name.toLowerCase();
            
            // Block event handlers (on*)
            if (attrName.startsWith('on')) {
              continue;
            }
            
            // Block javascript: and data: protocol URIs in links/sources
            if (attrName === 'href' || attrName === 'src') {
              const val = attr.value.trim();
              if (/^(javascript|data|vbscript):/i.test(val)) {
                continue;
              }
            }
            
            if (allowedAttrs.has(attrName)) {
              cleanEl.setAttribute(attrName, attr.value);
            }
          }

          // Recursively clean children
          for (let i = 0; i < el.childNodes.length; i++) {
            const cleaned = cleanNode(el.childNodes[i]);
            if (cleaned) {
              cleanEl.appendChild(cleaned);
            }
          }
          
          return cleanEl;
        }
        
        return null;
      };

      const cleanBody = doc.body;
      const cleanFragment = doc.createDocumentFragment();
      for (let i = 0; i < cleanBody.childNodes.length; i++) {
        const cleaned = cleanNode(cleanBody.childNodes[i]);
        if (cleaned) {
          cleanFragment.appendChild(cleaned);
        }
      }

      const tempDiv = doc.createElement('div');
      tempDiv.appendChild(cleanFragment);
      return tempDiv.innerHTML;
    } catch (e) {
      console.error('HTML Sanitization failed, falling back to escaped text', e);
      return escapeHtml(htmlStr);
    }
  }

  // Fallback: if DOMParser is not available, we must escape everything for safety
  return escapeHtml(htmlStr);
}

