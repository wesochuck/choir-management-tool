## 2024-05-24 - [Fix Stored XSS in Email Preview]
**Vulnerability:** User-controlled inputs like `{singerName}` or `{eventLocation}` in communication templates were directly substituted into HTML and rendered via `dangerouslySetInnerHTML` in `CommunicationView.tsx` without escaping.
**Learning:** React safely handles basic variable bindings (escaping automatically), but when rendering template content in an HTML context using `dangerouslySetInnerHTML`, you MUST manually sanitize or escape inputs. Adding external dependencies (like DOMPurify) should only be done if strictly necessary or approved.
**Prevention:** Introduce and enforce usage of a manual `escapeHtml` utility for variables being substituted into strings that will eventually be fed into `dangerouslySetInnerHTML`.
