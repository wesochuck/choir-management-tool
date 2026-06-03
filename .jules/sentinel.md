## 2025-02-28 - [XSS Bypass via Control Characters]
**Vulnerability:** The HTML sanitizer `sanitizeHtml` was vulnerable to XSS bypass using encoded control characters and spaces in URIs (e.g., `java&#x09;script:`).
**Learning:** Naive `.trim()` and regex matching for `javascript:` are insufficient for URL sanitization because browsers ignore ASCII control characters within URL protocols, allowing them to bypass basic blocklists.
**Prevention:** Always strip ASCII control characters and spaces (`/[\x00-\x20]/g`) from URL attribute values before validating them against restricted protocols like `javascript:`, `data:`, or `vbscript:`.
