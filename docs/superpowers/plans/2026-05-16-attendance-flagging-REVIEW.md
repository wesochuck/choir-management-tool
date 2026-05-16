---
phase: 04-attendance-flagging
reviewed: 2024-05-16T12:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - docs/superpowers/plans/2026-05-16-attendance-flagging.md
  - docs/superpowers/specs/2026-05-16-attendance-flagging-design.md
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 04: Attendance Flagging & Filtering Review Report

**Reviewed:** 2024-05-16
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

The implementation plan for Phase 04 is logically sound but lacks technical specifics regarding data fetching efficiency and edge case handling. The primary concern is the potential for redundant or heavy client-side fetches if the "Performance Cycle" spans a large number of events. The alert mechanism also requires more specific UI definition to avoid ambiguity between Email and SMS.

## Warnings

### WR-01: Performance of Roster Fetching

**File:** `docs/superpowers/plans/2026-05-16-attendance-flagging.md:Task 2`
**Issue:** The plan suggests fetching all 'Absent' rosters for rehearsals in the cycle. If implemented as a loop over events or an unfiltered fetch, this will degrade performance as the season progresses. PocketBase allows filtering on related fields (e.g., `event.date`).
**Fix:** Ensure `rosterService.getAttendanceStats` uses a single batch request with a filter: `attendance = "Absent" && event.date >= "${cycleStart}" && event.date <= "${now}"`. Do not fetch per-event.

### WR-02: "Beginning of Time" Fallback Risk

**File:** `docs/superpowers/specs/2026-05-16-attendance-flagging-design.md:Section 1`
**Issue:** If no past performance exists, the cycle starts at the "beginning of time." For a long-running instance, this could fetch years of stale attendance data, leading to memory issues or incorrect flags for singers who were absent 2 years ago but perfect recently.
**Fix:** Implement a sane "lookback limit" (e.g., max 6 months or 180 days) if no performance record is found.

### WR-03: Alert Channel Ambiguity

**File:** `docs/superpowers/plans/2026-05-16-attendance-flagging.md:Task 3`
**Issue:** The plan mentions a single "Alert" button that opens `mailto` or `SMS`. It's unclear how the app decides which one to use, or if the admin has a choice.
**Fix:** Provide two distinct icons/buttons in the "Misses" column: one for Email (`mailto:`) and one for SMS (`sms:`). Only enable the ones where contact info is available in the profile.

### WR-04: Redundant Event Fetching

**File:** `docs/superpowers/plans/2026-05-16-attendance-flagging.md:Task 2`
**Issue:** `useAttendanceStats` depends on `useEvents`. Since `useEvents` fetches on mount and doesn't share state, using both `useProfiles` (which might need events later) and `useAttendanceStats` in `RosterView` might trigger multiple event fetches.
**Fix:** Consider wrapping the app in an `EventProvider` or using a caching layer (like SWR or React Query) for `useEvents` to ensure data is shared across hooks.

## Info

### IN-01: Collection Naming Inconsistency

**File:** `docs/superpowers/specs/2026-05-16-attendance-flagging-design.md:Section 4`
**Issue:** Spec refers to `eventRoster`, but the existing codebase uses `eventRosters` (plural).
**Fix:** Ensure the implementation uses the plural `eventRosters` as defined in `src/services/rosterService.ts`.

### IN-02: Missing Warning Badge Style

**File:** `src/App.css` (referenced by Plan)
**Issue:** The plan calls for a "Warning Badge (Yellow)", but `src/App.css` only defines `badge-danger` and `badge-success`.
**Fix:** Add `.badge-warning { background-color: #fef3c7; color: #92400e; }` to `App.css`.

### IN-03: Mid-Cycle Joiner Logic

**File:** `docs/superpowers/specs/2026-05-16-attendance-flagging-design.md:Section 1`
**Issue:** The plan doesn't account for a singer's "Join Date". A singer who joins 1 week before a performance will have 0 misses, which is technically correct but might be indistinguishable from a singer who attended 10 rehearsals.
**Fix:** (Optional) Display "0 / 1" (misses / eligible rehearsals) instead of just "0" to provide context on how many rehearsals they were actually expected to attend.

---

_Reviewed: 2024-05-16T12:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
