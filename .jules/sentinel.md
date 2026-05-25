## 2024-05-24 - [Fix XSS Vulnerability in Markdown Link Rendering]
**Vulnerability:** The `renderMarkdown` function in `src/lib/communicationUtils.ts` directly interpolates URLs from markdown links `[text](url)` into the `href` attribute of an anchor tag without validating the protocol or escaping double quotes.
**Learning:** This could allow an attacker to inject `javascript:` URLs or break out of the `href` attribute with double quotes (attribute injection bypass) to execute arbitrary JavaScript.
**Prevention:** Always validate URL protocols against an allowlist (e.g., `http:`, `https:`, `mailto:`, or relative paths). Always escape double quotes `"` to `&quot;` to prevent attribute breakout.
