# Project State

## Current Phase
Completed

## Milestones
- [x] Phase 1: Foundation
- [x] Phase 2: Backend Logic
- [x] Phase 3: Singer UI
- [x] Phase 4: Admin UI
- [x] Phase 5: Verification

## Recent Decisions
- Use \`rsvpNote\` instead of \`declineReason\` for future flexibility.
- Limit note to 1000 characters.
- Collection ID for \`eventRosters\` is \`pbc_2357252437\`.
- Cleared \`rsvpNote\` in \`rosterService.updateRSVP\` and backend endpoints when RSVP is not "No".
- Updated \`PublicRsvpView.tsx\` to show note field and enforce requirement for Rehearsals.
- Updated \`EventRosterTable.tsx\` and \`CheckInList.tsx\` to display decline notes to admins.

## Next Step
Project Complete. Ready for review and deployment.
