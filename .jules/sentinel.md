## 2024-05-24 - Remove Plaintext Logging of Decoded Auth Tokens
 **Vulnerability:** Sensitive authentication tokens were being decoded using `atob` and their payload (including potentially sensitive model and role data) was logged in plaintext via `console.error` during 400 response errors in the PocketBase client.
 **Learning:** Debug logging added during development can inadvertently expose sensitive data in production environments if not carefully reviewed and removed.
 **Prevention:** Ensure all debug logging involving authentication tokens, PII, or secure contexts is stripped before committing code. Utilize secure logging mechanisms and rely on network tabs or secure audit logs for production debugging instead of console output.
