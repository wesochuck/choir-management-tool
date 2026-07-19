## 2026-07-19 - Keep Sensitive Data Out of Local Storage

**Vulnerability:** Browser `localStorage` is readable and writable by any script running in the application origin. Client-side obfuscation cannot make values confidential or tamper-resistant because the decoding logic and keys are shipped to the browser.

**Learning:** Reversible encoding such as XOR or Base64 must not be described or treated as encryption. It does not mitigate XSS, malicious extensions, shared-device access, or developer-tools inspection.

**Prevention:** Store only non-sensitive preferences and UI state in `localStorage`. `safeLocalStorage` rejects keys that appear to contain authentication tokens, sessions, passwords, secrets, or credentials. Sensitive authentication state must use secure server-managed mechanisms such as `HttpOnly`, `Secure`, and appropriately scoped cookies.
