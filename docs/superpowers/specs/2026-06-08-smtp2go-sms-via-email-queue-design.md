# Design Spec: SMS Delivery via SMTP2Go Email-to-SMS Gateway

**Date:** 2026-06-08
**Status:** Approved
**Topic:** Replacing client-side SMS (`sms:` URIs) with server-side SMS delivery using SMTP2Go's email-to-SMS gateway, routed through the existing email queue infrastructure.

## 1. Overview

Currently, SMS messages are not dispatched server-side. The app generates an `sms:` URI that opens the admin's native SMS app, requiring manual sending per recipient. This spec replaces that with automated server-side SMS delivery by routing messages through SMTP2Go's email-to-SMS gateway (`{10digits}@sms.smtp2go.com`) via the existing email queue.

The existing PocketBase SMTP relay (whatever provider is configured) will deliver these emails. SMTP2Go intercepts messages addressed to `@sms.smtp2go.com` and converts them to SMS. No new SMTP credentials or provider changes are needed.

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SMS channel | Route via existing email queue | Reuses battle-tested queue, retry logic, atomic claiming, and SMTP dispatch |
| Phone normalization | Strip non-digits, take last 10 | Handles all US formats universally |
| Queue collection | Shared `emailQueue` | No new migration needed; differentiate via `filters` |
| SMS length | Truncate to 160 chars | SMS protocol limit; append `…` when truncated |
| Subject line | Use prefix "SMS: " or leave empty | Avoid subject interpreted as part of body |

## 3. Backend Changes

### 3.1 `messageHookRules.ts` — Allow SMS Queuing

**Function:** `shouldQueueMessage()`

Change the type guard to also allow SMS and Both:

```
Current:  type !== "Email" && type !== "Both" → return false
New:      type !== "Email" && type !== "SMS" && type !== "Both" → return false
```

### 3.2 `enqueueBulkMessage()` — SMS Path

When the message type is `SMS` or `Both`:

1. **Resolve phone numbers**: For each recipient with a phone number:
   - Strip all non-digit characters from `recipient.phone`
   - Take the last 10 digits
   - Build `{10digits}@sms.smtp2go.com`
2. **Truncate content** to 160 characters. Append `…` (single Unicode ellipsis) if truncated.
3. **Set channel marker**: Store `filters: { channel: 'sms' }` on the queue entry to differentiate from email.
4. **Create emailQueue entries**: Use the SMS gateway address as `recipientEmail`. Keep `recipientId` as the profile ID. Set `subject` to empty string or a short prefix.
5. **If message type is `Both`**: Create separate queue entries — email entries for recipients with email (existing logic) AND SMS entries for recipients with phone (new logic).

### 3.3 `queueProcessor.ts` — SMS Rendering

In the processing step (after claiming a batch):

- If `entry.filters?.channel === 'sms'`:
  - Skip the Mailjet HTML layout wrapping
  - Skip HTML rendering from markdown (send plain text)
  - Send as plain text body via `MailerMessage`
- Otherwise: existing email rendering logic unchanged

### 3.4 Frontend Changes

#### 3.4.1 `messageDispatchService.ts`

- Remove or no-op the `smsUrl` generation in `sendBulkMessage()`. The server now handles SMS dispatch.
- The `sms:` URI fallback is no longer needed.
- For SMS/Both sends, the frontend shows a success toast ("SMS messages queued for delivery") instead of opening native SMS.

#### 3.4.2 `useCommunicationDraft.ts` or Send Button

- Update the send flow: if message type is SMS or Both, the send button text could change or show an indicator that SMS will be delivered server-side.
- No native SMS app opening after send.

### 3.5 Phone Number Display

No changes needed. The `recipient.phone` field already ships on every `CommunicationRecipient`. The normalization happens server-side in `enqueueBulkMessage()`.

## 4. Data Flow

```
Admin composes message (type: SMS or Both)
  → sendBulkMessage()
    → Creates message record with status='Sent', type='SMS'|'Both'
    → No smsUrl generated (removed)

Backend hook fires (onRecordAfterCreate/Update)
  → shouldQueueMessage() → returns true for SMS/Both
  → enqueueBulkMessage()
    → For SMS recipients:
      → Normalize phone → 10 digits
      → Build {10digits}@sms.smtp2go.com
      → Create emailQueue entry:
          recipientEmail: "5551234567@sms.smtp2go.com"
          recipientId: profile.id
          recipientName: profile.name
          subject: ""
          rawContent: truncated_body (≤160 chars)
          filters: { channel: 'sms' }
    → For Both + recipients with email:
      → Existing email queue entry logic (unchanged)

Cron (every 2 min) → processEmailQueue()
  → Claims batch of pending entries
  → If entry.filters.channel === 'sms':
    → Resolve placeholders in body
    → Send as plain text via MailerMessage to SMTP2Go
  → Else:
    → Existing email rendering + HTML wrapping
```

## 5. Error Handling

- **No phone number**: Skip SMS queue entry for that recipient (no different from today).
- **Phone normalization yields < 10 digits**: Skip the entry (invalid number).
- **SMTP failure**: Existing retry logic applies (max 3 attempts, marked Failed on exhaustion).
- **SMTP2Go delivery failure**: SMTP2Go bounces the email; the queue entry is marked Failed. The admin sees the error in the message status.

## 6. Testing

- Unit test phone normalization function (strip non-digits, last 10).
- Unit test truncation at 160 chars with ellipsis.
- Test that SMS/Both type messages create emailQueue entries with `channel: 'sms'`.
- Test that `channel: 'sms'` entries skip HTML wrapping in processor.

## 7. Success Criteria

1. Admin composes an SMS message and it is delivered via SMTP2Go email-to-SMS within the queue processing window (≤ 2 minutes).
2. Admin composes a "Both" message: email recipients receive email, phone recipients receive SMS.
3. Phone numbers in any US format (e.g. (555) 123-4567, +15551234567, 5551234567) are correctly normalized to 10 digits.
4. Messages over 160 characters are truncated with `…`.
5. The existing email dispatch is completely unaffected.
6. No native SMS app opens on the admin's device.
