## 2024-05-28 - XSS in Message Previews
**Vulnerability:** XSS vulnerability in message previews due to unescaped dynamic placeholders (like `{eventTitle}`, `{singerName}`) being interpolated into Markdown after the initial HTML escaping phase, and then rendered via `dangerouslySetInnerHTML`.
**Learning:** Always escape dynamic content when interpolating it into HTML templates, even if the base template has already been sanitized, as the data itself could carry malicious payloads.
**Prevention:** Use a native `escapeHtml` function on all dynamic string substitutions before injection.
