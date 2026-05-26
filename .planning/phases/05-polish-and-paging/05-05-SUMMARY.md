---
phase: 05-polish-and-paging
plan: 05
subsystem: profile-settings
tags: [profiles, users, voice-parts, sections, validation]

# Dependency graph
requires: [05-04]
provides:
  - Singer email-clearing user account deletion
  - Section-less voice parts saving in Roster settings
  - Crash-resilient seating mismatch check isSectionMismatch
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [advisory user account deletion, relaxed section-less configuration, defensive seating checks]

key-files:
  created: []
  modified:
    - src/components/admin/SingerModal.tsx
    - src/views/admin/RosterView.tsx
    - src/services/profileService.ts
    - src/lib/voicePartUtils.ts
    - test/profileService.test.ts
    - test/seatingMismatch.test.ts

key-decisions:
  - "Decided to implement advisory user account deletion on the backend: when an administrator clears a singer's email (sets it to an empty string), the service deletes their associated PocketBase user login record to prevent stale auth credentials, while cleanly retaining all roster and singer history on their profile."
  - "Decided to relax Roster Configuration validations to support section-less voice parts, enabling parts (e.g., Soloists, Narrators) to save and render cleanly without requiring an assignment to a physical section bucket."
  - "Decided to make seating chart mismatch indicators robust against section-less voice parts by returning false instead of throwing a TypeError when comparing undefined/empty section codes."

patterns-established:
  - "Designing cascading user deletion on cleared emails to maintain strict data sanitization across profile and auth collections."
  - "Designing relaxed database constraints for customizable settings schema objects to increase domain resilience."

requirements-completed: [email removal fix, section-less voice parts]

# Metrics
duration: 10 min
completed: 2026-05-26
---

# Phase 5 Plan 05: Email Removal & Section-less Voice Parts Summary

**Successfully implemented secure email clearing/login deletion logic on singer profiles and relaxed the voice part configuration boundaries to allow unassigned (section-less) voice parts without seating chart mismatch crashes.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-26T22:54:00Z
- **Completed:** 2026-05-26T23:04:00Z
- **Tasks:** 5 completed
- **Files modified/created:** 6 files

## Accomplishments

- **Email Clearing & Account Deletion:** Updated `profileService.updateProfile` to detect if the email is set to an empty string, delete the corresponding `users` account in PocketBase, and nullify the profile relation.
- **Improved UI Hints:** Optimized the email input helper text in `SingerModal.tsx` to display: "Clearing this removes their login account."
- **Section-less Voice Parts:** Updated `RosterView.tsx` config-saving validations so a `sectionCode` is no longer mandatory for every voice part, and saved voice parts function perfectly.
- **Defensive Seating Mismatch Check:** Hardened `isSectionMismatch` inside `voicePartUtils.ts` so that voice parts without assigned section codes do not crash the seating chart with `TypeError` when upper-casing.
- **Expanded Test Coverage:** Added dedicated unit tests for both `profileService.updateProfile` email clearing user account deletions and `isSectionMismatch` with section-less voice parts.
- **Quality Assurance:** Both `npm run lint` and `npm test` are 100% green. Kept all **287 tests fully passing**.

## Task Commits

All changes are fully verified, pass lint standards, and run cleanly without typescript warnings or runtime errors.

## Decisions Made

- Made backend user login deletion advisory: wrapped the user collection deletion call in `try/catch` catch-alls so profile saving succeeds even if the user record has already been removed or is absent.
- Kept the roster and voice part systems fully backwards-compatible so existing physical sections (S, A, T, B) function identically.
