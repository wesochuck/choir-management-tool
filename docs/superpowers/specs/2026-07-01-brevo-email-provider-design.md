# Brevo API Alternative Email Provider Design

## Motivation
Currently, all emails are dispatched using PocketBase's built-in SMTP Mailer, which relies on SMTP2GO. The user wants to support bundling in an option to use Brevo's sending email API alongside SMTP.

## Scope
- Store the active provider and Brevo API Key securely but accessibly in the `appSettings` collection.
- Add an Admin Settings UI to toggle between SMTP and Brevo.
- Extract Brevo logic to avoid monolithic hook files.
- Handle both standard transactional emails and transactional SMS (which currently routes through SMTP-to-SMS gateway).

## Architecture

### 1. Configuration (`appSettings`)
We will create a new key `email_provider` containing a JSON payload:
```json
{
  "provider": "smtp" | "brevo",
  "brevoApiKey": "xkeysib-..."
}
```

### 2. Admin UI
The `SettingsView.tsx` will have an "Email Provider Settings" card to toggle the active provider and manage the API key.

### 3. Modularizing the Hook Logic
To prevent `queueProcessor.ts` from becoming a monolithic file containing all REST integrations:
- We will create `pocketbase/pb_hooks_src/email/brevoAdapter.ts`.
- This adapter will expose two methods: `dispatchEmailViaBrevo(...)` and `dispatchSmsViaBrevo(...)`.
- `queueProcessor.ts` will fetch the setting and route the payload either to `app.newMailClient().send()` or to the `brevoAdapter` methods.

### 4. Brevo Email API
We will use PocketBase's native Goja `$http.send()` to hit `https://api.brevo.com/v3/smtp/email`.
Payload mapping:
- `sender`: `{ name: settings.meta.senderName, email: settings.meta.senderAddress }`
- `to`: `[{ email: recipientEmail, name: recipientName }]`
- `subject`: `subject`
- `htmlContent`: `finalHtml`

### 5. Brevo Transactional SMS API
Since Brevo has a dedicated SMS API, we will use it instead of an SMTP-to-SMS gateway.
- We will modify `messageHookRules.ts` to enqueue SMS records using the raw 10-digit phone number in the `recipientEmail` field, rather than pre-appending `@sms.smtp2go.com`.
- When dispatching via SMTP, `queueProcessor.ts` will append `@sms.smtp2go.com` at the time of send.
- When dispatching via Brevo, we will use the raw phone number directly.
- Payload mapping:
  - `sender`: `settings.meta.senderName` (truncated to max 11 chars)
  - `recipient`: `extractedPhone`
  - `content`: `rawContent`
  - `type`: `"transactional"`

### 6. Dynamic Testing
The `/api/test-smtp` route generated in `generate-main-pb-js.ts` will be updated to check the active `email_provider` and route the test accordingly. If Brevo is active, it sends a test email to the requested address via Brevo API.
