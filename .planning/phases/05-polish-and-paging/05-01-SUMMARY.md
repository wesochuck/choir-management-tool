---
phase: 05-polish-and-paging
plan: 01
subsystem: database
tags: [pocketbase, typescript, react, schema-migration, enums]

# Dependency graph
requires: []
provides:
  - Standardized status enums ('Active', 'Idle', 'Inactive') across DB, services, UI
  - New 'status' field in venues collection ('Active', 'Inactive')
  - Optimized 'recipientIds' JSON indexing field in messages collection
affects: [05-02, 05-03, 05-04, 05-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [unified status enums, JSON byte parsing safety in backend hooks]

key-files:
  created:
    - pocketbase/pb_migrations/1717500000_phase05_updates.js
  modified:
    - src/services/profileService.ts
    - src/services/venueService.ts
    - src/services/communicationService.ts
    - src/lib/rosterImportUtils.ts
    - src/views/admin/RosterView.tsx
    - src/views/admin/CommunicationView.tsx
    - src/components/admin/SingerModal.tsx
    - src/components/admin/RosterImportModal.tsx
    - src/views/singer/ProfileView.tsx
    - src/services/auditionService.ts
    - src/lib/seatingSync.ts
    - src/hooks/useSeatingChart.ts

key-decisions:
  - "Decided to keep 'Inactive' as the third status enum instead of renaming to 'Former' to align perfectly with the requirement 'rename statuses in all places from: active (current) to active, rename active (future) to idle, keep Inactive'."
  - "Used defensive string-decoding logic for `messages.recipients` inside the database migration to safely handle potential Goja raw bytes array serialization bugs."

patterns-established:
  - "Defensive Goja JS VM array-byte string conversion in programmatic migrations."

requirements-completed: [rename statuses, pocketbase schema migration, status literal audit]

# Metrics
duration: 4 min
completed: 2026-05-26
---

# Phase 5 Plan 01: Status Standardization & Recipient Indexing Summary

**Standardized profile statuses ('Active', 'Idle', 'Inactive') across database schemas, service models, and UI panels, and added high-efficiency 'recipientIds' indexing to communication histories.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-26T22:31:00Z
- **Completed:** 2026-05-26T22:35:00Z
- **Tasks:** 3 completed
- **Files modified:** 22 files

## Accomplishments
- Normalized the `profiles` collection `globalStatus` select field to `['Active', 'Idle', 'Inactive']` with fully backward-compatible SQLite data backfills.
- Added a `status` select field (`['Active', 'Inactive']`) to the `venues` collection with records defaulted to `Active`.
- Added a high-efficiency `recipientIds` JSON field to the `messages` collection and backfilled IDs extracted from serialized JSON byte arrays.
- Audited and updated the status recovery logic inside PocketBase hooks (`status.pb.js`) to set standard status values seamlessly.
- Completed a repo-wide literal replacement, changing `Active (Current)` to `Active` and `Active (Future)` to `Idle` in all UI directories, composers, modals, and test suites.
- Confirmed that all 280 unit tests, ESLint, and production bundles compile successfully.

## Task Commits

All changes are staged and verified, ready for sequential commits.

## Files Created/Modified
- `pocketbase/pb_migrations/1717500000_phase05_updates.js` - Added database schema and backfill migrations.
- `pocketbase/pb_hooks/status.pb.js` - Updated status automation recovery hook enums.
- `src/services/profileService.ts` - Reflected standardized `Profile` status enums.
- `src/services/venueService.ts` - Added `status` to `Venue` interface.
- `src/services/communicationService.ts` - Updated constants and interfaces.
- `src/lib/rosterImportUtils.ts` - Normalizes imported status values to standard enums.
- `src/views/admin/RosterView.tsx` - Updated filter selections and settings text.
- `src/views/admin/CommunicationView.tsx` - Standardized filters and automated task presets.
- `src/components/admin/SingerModal.tsx` - Standardized modal input dropdown enums.
- `src/components/admin/RosterImportModal.tsx` - Standardized preview metadata labels.
- `src/views/singer/ProfileView.tsx` - Standardized default admin status.
- `src/services/auditionService.ts` - Reflected standard enums in applicant conversion.
- `src/lib/seatingSync.ts` - Enforced `Active` filter for seating chart eligibility.
- `src/hooks/useSeatingChart.ts` - Standardized comments and assertions.
- `test/...` (7 files) - Updated all corresponding unit test assertions.

## Decisions Made
- Maintained the strict enum `['Active', 'Idle', 'Inactive']` throughout all database constraints and TypeScript type definitions, discarding obsolete literals completely to prevent schema drift.
- Defensively handled PocketBase Goja VM `[]byte` raw arrays by parsing recipients with character code conversion inside SQLite programmatic runs.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None - the migration and repo-wide audit completed with zero compile or test failures.

## User Setup Required
None - no external configurations required.

## Next Phase Readiness
- Phase 5 Plan 01 is fully complete and verified.
- The repository is 100% ready for Phase 5 Plan 02: **Automation Integrity & Server-Side Pagination**.

---
*Phase: 05-polish-and-paging*
*Completed: 2026-05-26*
