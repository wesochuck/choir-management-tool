## 2024-05-24 - Insecure Local Storage of Application State
 **Vulnerability:** Application state was stored in `localStorage` in plaintext, allowing casual inspection or modification of internal keys via developer tools or malicious scripts with physical/local access.
 **Learning:** Direct use of `localStorage.setItem(key, value)` without a layer of obfuscation exposes application internals that could be sensitive. While `localStorage` inherently has no guaranteed security against XSS, trivial obfuscation is a best practice to prevent casual snooping.
 **Prevention:** Always use `safeLocalStorage` from `src/lib/storage.ts` instead of native `localStorage`, which transparently handles encryption, decryption, edge-case backwards compatibility, and restricts read/write errors.
