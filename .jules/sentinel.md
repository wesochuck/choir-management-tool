## 2026-07-19 - Keep Sensitive Data Out of Local Storage

**Vulnerability:** Browser `localStorage` is readable and writable by any script running in the application origin. Client-side obfuscation cannot make values confidential or tamper-resistant because the decoding logic and keys are shipped to the browser.

**Learning:** Reversible encoding such as XOR or Base64 must not be described or treated as encryption. It does not mitigate XSS, malicious extensions, shared-device access, or developer-tools inspection.

**Prevention:** Store only non-sensitive preferences and UI state in `localStorage`. `safeLocalStorage` rejects keys that appear to contain authentication tokens, sessions, passwords, secrets, or credentials. Sensitive authentication state must use secure server-managed mechanisms such as `HttpOnly`, `Secure`, and appropriately scoped cookies.
## 2024-05-24 - Remove Plaintext Logging of Decoded Auth Tokens
 **Vulnerability:** Sensitive authentication tokens were being decoded using `atob` and their payload (including potentially sensitive model and role data) was logged in plaintext via `console.error` during 400 response errors in the PocketBase client.
 **Learning:** Debug logging added during development can inadvertently expose sensitive data in production environments if not carefully reviewed and removed.
 **Prevention:** Ensure all debug logging involving authentication tokens, PII, or secure contexts is stripped before committing code. Utilize secure logging mechanisms and rely on network tabs or secure audit logs for production debugging instead of console output.
## 2026-07-17 - Prevent PocketBase Filter Injection

**Vulnerability:** Found a filter/NoSQL injection risk in `src/services/duesService.ts` where query strings for PocketBase were constructed using manual string concatenation and escaping (e.g., `` season = "${seasonId.replace(/"/g, '\\"')}" ``). This could allow a malicious user to craft a `seasonId` that breaks the filter boundary.
**Learning:** Manual string escaping for database or API filters is error-prone and often insufficient against complex injection payloads. The project relies heavily on string-based filters for PocketBase, which were vulnerable before PocketBase added a parameterization helper.
**Prevention:** Always use the official `pb.filter()` helper method introduced in PocketBase v0.27.0 to safely bind and parameterize variables in query strings (e.g., `pb.filter('season = {:id}', { id })`).
