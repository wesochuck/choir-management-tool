# Phase 3: RSVP & Status Automation (Cycle 3)

## Objective
Re-implement the RSVP and Status automation system to address critical security leaks (HMAC secret exposure) and logic bugs (sticky inactive status, attendance ignorance) identified in the Cycle 2 review.

## Wave Structure

| Wave | Plan | Objective | Autonomous |
|------|------|-----------|------------|
| 1 | [03.2-01-PLAN.md](./03.2-01-PLAN.md) | Schema & Security Foundation | Yes |
| 2 | [03.2-02-PLAN.md](./03.2-02-PLAN.md) | Backend Logic & Server APIs | Yes |
| 3 | [03.2-03-PLAN.md](./03.2-03-PLAN.md) | Frontend Integration & UI | Yes |

## Critical Fixes in Cycle 3
- **CR-01:** Token generation moved to server. Secret stays in `appSettings`.
- **CR-02:** "Active (Current)" priority fixed. Upcoming "Yes" overrides "Inactive".
- **CR-03:** "Missed" calculation now includes `attendance` check.
- **WR-01:** Strict error throwing if `HMAC_SECRET` is missing.
- **WR-02:** Event filtering uses `event.date` instead of `created` timestamp.

## Requirements Covered
[RSVP-01, RSVP-02, RSVP-03, RSVP-04, RSVP-05, RSVP-06, RSVP-07, RSVP-08, RSVP-09]

## Next Steps
1. Execute Wave 1: `gsd:execute-plan .planning/phase-3/03.2-01-PLAN.md`
2. Execute Wave 2: `gsd:execute-plan .planning/phase-3/03.2-02-PLAN.md`
3. Execute Wave 3: `gsd:execute-plan .planning/phase-3/03.2-03-PLAN.md`
