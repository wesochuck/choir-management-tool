# Phase 2: Backend Logic

## Tasks
- [ ] Task 2.1: Update `/api/rsvp-details` in `pocketbase/pb_hooks_src/rsvpEndpoints.ts` to return `currentRsvpNote`.
- [ ] Task 2.2: Update `/api/quick-rsvp` in `pocketbase/pb_hooks_src/rsvpEndpoints.ts` to handle `rsvpNote`.
  - Validate length (max 1000).
  - Require note for Rehearsal declines.
  - Clear note if RSVP is not "No".
- [ ] Task 2.3: Update `/api/admin/bulk-update-rsvps` in `pocketbase/pb_hooks_src/rsvpEndpoints.ts` to clear notes when RSVP is changed from "No".
- [ ] Task 2.4: Regenerate `pocketbase/pb_hooks/main.pb.js`.

## Read First
- `pocketbase/pb_hooks_src/rsvpEndpoints.ts`

## Verification
- Run `npm run generate:pb-hooks` and check for errors.
- Run `npm run check:pb-hooks` (if available).
