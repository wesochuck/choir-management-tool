# Design Specification: Communication Platform

## Objective
Complete the approved Messaging & Communication Hub as an administrator-facing communication platform.

## Deliverables
- `messages` PocketBase collection for sent communication logs.
- `communicationService.ts` with recipient filtering, history, settings, and send logging.
- `CommunicationView.tsx` with Compose, History, and Settings tabs.
- Admin route and dashboard entry.
- Settings persistence for SMTP and Twilio credentials under `communications_config`.

## Success Criteria
- [x] Admin can filter recipients by event RSVP, voice part, and global status.
- [x] Admin can select or remove individual recipients.
- [x] Admin can compose Email, SMS, or Both with a live preview.
- [x] Sending creates a `messages` collection log with recipients and filters.
- [x] Admin can view message history sorted newest first.
- [x] Admin can copy a past message into a draft.
- [x] Admin can update SMTP and Twilio settings without code changes.
