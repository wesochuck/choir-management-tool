## 2024-05-27 - [Fix XSS Vulnerability in HTML Previews]
**Vulnerability:** XSS vulnerability in `src/lib/communicationUtils.ts` via `resolvePreviewContent`. User input (like name, event details) was directly injected into template strings without escaping and then rendered using `dangerouslySetInnerHTML`.
**Learning:** React escapes text content natively, but when bypassing it with `dangerouslySetInnerHTML`, all dynamic input must be manually escaped. This is especially critical for data originating from other users or systems (like event titles).
**Prevention:** Always use an HTML escaping function (like the new `escapeHtml` utility) before interpolating dynamic string data into an HTML string that will be parsed as HTML.
