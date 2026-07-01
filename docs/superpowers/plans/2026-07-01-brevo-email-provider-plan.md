# Brevo API Alternative Email Provider Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Brevo REST API as an alternative to the built-in PocketBase SMTP mailer for both Email and SMS transactional messages. Modularize the implementation to avoid a monolithic `queueProcessor.ts`.

---

### Task 1: Create `brevoAdapter.ts`
- [ ] Create `pocketbase/pb_hooks_src/email/brevoAdapter.ts`
- [ ] Implement `dispatchEmailViaBrevo($http, apiKey, payload)`:
  - Hits `https://api.brevo.com/v3/smtp/email`.
  - Sends the `sender`, `to`, `subject`, `htmlContent`, and `textContent`.
  - Throws an error if `$http.send()` status is >= 400.
- [ ] Implement `dispatchSmsViaBrevo($http, apiKey, payload)`:
  - Hits `https://api.brevo.com/v3/transactionalSMS/send`.
  - Sends `sender` (truncated to 11 chars), `recipient` (uses raw phone number), `content`, and `type: "transactional"`.
  - Throws an error if status >= 400.
- [ ] Commit with `feat(email): add brevo API adapter for email and sms`

### Task 2: Standardize SMS Queue Persistence
- [ ] Modify `pocketbase/pb_hooks_src/email/messageHookRules.ts` to store just the raw phone number (e.g., `5551234567`) in `recipientEmail` for SMS instead of appending `@sms.smtp2go.com`.
- [ ] Update `test/pb-hooks/messageHookRules.test.ts` to assert on raw phone numbers without the gateway domain.
- [ ] Commit with `refactor(email): store raw phone numbers in queue for sms instead of hardcoded gateway`

### Task 3: Integrate `brevoAdapter.ts` into Queue Processor
- [ ] Modify `pocketbase/pb_hooks_src/email/queueProcessor.ts`.
- [ ] Fetch the `email_provider` config from `appSettings` at the start of the batch.
- [ ] Default to `smtp` if the key doesn't exist or doesn't have `brevoApiKey`.
- [ ] Inside the processing loop, if `brevo` is active and an API key is available, route to the adapter.
- [ ] For SMTP SMS dispatch, append `@sms.smtp2go.com` to the `recipientEmail` before passing to `MailerMessage`.
- [ ] Ensure any errors thrown by `$http.send` are caught and logged, moving the record to `Failed` after max attempts.
- [ ] Commit with `feat(email): integrate brevo adapter into queue processor`

### Task 4: Update Test Endpoint
- [ ] Modify `pocketbase/pb_hooks_src/generate-main-pb-js.ts`.
- [ ] Update `/api/test-smtp` to `/api/test-email` (or leave as `/api/test-smtp` for UI compatibility) but change the backend logic.
- [ ] If `email_provider` is `brevo`, use `$http.send` to send the test email. Otherwise, use `app.newMailClient()`.
- [ ] Run `rtk npm run generate:pb-hooks` and `rtk npm run check:pb-hooks`.
- [ ] Commit with `feat(email): update test endpoint to support brevo`

### Task 5: Add Configuration and React Query Support
- [ ] Add `src/services/settings/emailProviderSettings.ts` with getters/setters for the `email_provider` key.
- [ ] Export these in `src/services/settingsService.ts`.
- [ ] Add `emailProvider` to `appSettings` scope in `src/lib/queryKeys.ts`.
- [ ] Commit with `feat(settings): add emailProvider services and query keys`

### Task 6: Admin UI Toggle
- [ ] Modify `src/views/admin/SettingsView.tsx`.
- [ ] Create an "Email Provider Settings" `AppCard`.
- [ ] Add a `Select` to pick between `smtp` and `brevo`.
- [ ] Add a password `Input` for the Brevo API Key (only shown if `brevo` is selected).
- [ ] Wire up dirty state, loading, saving, and discarding logic.
- [ ] Run `rtk npx vitest run` to ensure no frontend breakages.
- [ ] Run `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 .`
- [ ] Commit with `feat(settings): add email provider toggle to admin settings UI`
