## 2025-02-14 - Prevent XSS in HTML string interpolation
**Vulnerability:** User-provided variables were directly interpolated into HTML strings in `resolvePreviewContent` without escaping, leaving the frontend vulnerable to Cross-Site Scripting (XSS) when rendered via `dangerouslySetInnerHTML`.
**Learning:** Initial Markdown-to-HTML conversion correctly escapes HTML, but subsequent substitution of dynamic placeholders allows malicious code to bypass the sanitization.
**Prevention:** Always apply an HTML escaping function (like `escapeHtml`) to dynamic user content *before* substituting it into HTML templates or placeholders.
