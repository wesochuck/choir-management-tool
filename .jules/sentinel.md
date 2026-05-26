## 2026-05-19 - [HIGH] XSS Vulnerability in Communication Preview
**Vulnerability:** User and event data injected directly into message previews without HTML entity escaping. This led to an XSS risk because the data could contain malicious script tags which were rendered using `dangerouslySetInnerHTML`.
**Learning:** `dangerouslySetInnerHTML` must not receive unescaped variables when doing string replacement.
**Prevention:** Added an `escapeHtml` utility and wrapped variables injected into preview content with it to neutralize malicious inputs.
