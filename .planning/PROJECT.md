# Project: RSVP Decline Note

## Vision
Require singers to provide a note when declining a rehearsal RSVP to improve administrative planning and attendance management.

## Tech Stack
- Frontend: React (TypeScript)
- Backend: PocketBase (Go/Goja JS VM)
- Services: PocketBase SDK

## Scope
- Database: Add `rsvpNote` field to `eventRosters` collection.
- Types: Update `EventRoster` interfaces.
- Backend:
  - Update `/api/rsvp-details` to return existing notes.
  - Update `/api/quick-rsvp` to validate and save notes.
  - Require notes for "No" RSVPs on Rehearsals.
  - Clear notes when RSVP is not "No".
- Frontend:
  - Add note field to `PublicRsvpView`.
  - Add client-side validation.
  - Update admin `EventRosterView` and `EventRosterTable` to show notes.

