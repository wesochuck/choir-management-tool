## 2024-05-24 - [Sanitize Markdown Links to Prevent XSS]
**Vulnerability:** Markdown link parsing allowed `javascript:` protocols, leading to potential Cross-Site Scripting (XSS) when rendered in HTML previews. Furthermore, dynamic variables (like singer name or event details) were interpolated into the preview template without HTML escaping.
**Learning:** `dangerouslySetInnerHTML` was being used to render the message preview. While raw HTML interpolation is sometimes necessary, all variables and parsed links feeding into it must be strictly sanitized to defend against injection attacks.
**Prevention:**
1. Always validate protocols in user-provided URLs. Restrict to safe lists (e.g. `http:`, `https:`, `mailto:`).
2. Explicitly escape dynamic data (e.g. `&`, `<`, `>`, `"`, `'`) before injecting it into HTML templates.
