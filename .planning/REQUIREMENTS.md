# Requirements

## Functional Requirements
- REQ-001: Singers MUST provide a note when declining a Rehearsal RSVP.
- REQ-002: Singers SHOULD NOT be required to provide a note for "Yes" or "Pending" RSVPs.
- REQ-003: Singers SHOULD NOT be required to provide a note for "Performance" declines (unless requested).
- REQ-004: Admins MUST be able to see the RSVP note in the event roster view.
- REQ-005: RSVP notes MUST be cleared if the RSVP status is changed from "No" to something else.
- REQ-006: RSVP notes MUST be stored on the `eventRosters` record.

## Technical Requirements
- REQ-T001: Migration to add `rsvpNote` field to `eventRosters` (text, max 1000 chars).
- REQ-T002: Update `EventRoster` type in `rosterService.ts`.
- REQ-T003: Backend validation in `rsvpEndpoints.ts` for note presence and length.
- REQ-T004: Frontend validation in `PublicRsvpView.tsx`.
- REQ-T005: Update `/api/admin/bulk-update-rsvps` to clear notes.
