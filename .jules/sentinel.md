## 2025-02-28 - [XSS Bypass via Control Characters]
**Vulnerability:** The HTML sanitizer `sanitizeHtml` was vulnerable to XSS bypass using encoded control characters and spaces in URIs (e.g., `java&#x09;script:`).
**Learning:** Naive `.trim()` and regex matching for `javascript:` are insufficient for URL sanitization because browsers ignore ASCII control characters within URL protocols, allowing them to bypass basic blocklists.
**Prevention:** Always strip ASCII control characters and spaces (`/[\x00-\x20]/g`) from URL attribute values before validating them against restricted protocols like `javascript:`, `data:`, or `vbscript:`.

## 2025-02-28 - [XSS via Missing Template Escaping]
**Vulnerability:** Template placeholders (like `{eventTitle}` and `{singerName}`) were replaced with raw, unescaped user input during HTML email/preview generation in the frontend `resolvePreviewContent` function, allowing Stored XSS if the underlying entity data contained malicious HTML.
**Learning:** `dangerouslySetInnerHTML` is used for rendering previews. While the markdown body is sanitized during its rendering step, any placeholders resolved *after* markdown parsing are injected raw.
**Prevention:** When performing string replacement for dynamic template placeholders (e.g. replacing `{singerName}` with a user-provided string) into HTML contexts, the dynamic payload must always be passed through an HTML escaper (`escapeHtml`) before substitution.
