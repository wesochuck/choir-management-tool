## 2024-05-18 - [Fix XSS in DashboardView Announcements]
**Vulnerability:** XSS via unescaped `ann.content` in `dangerouslySetInnerHTML`.
**Learning:** `DashboardView` directly used PocketBase content in DOM without sanitizing. The utility `renderMarkdown` in `communicationUtils.ts` has built-in sanitization (escapes HTML).
**Prevention:** Ensure user content is wrapped with `renderMarkdown()` before injecting it with `dangerouslySetInnerHTML` in the React views.
