---
phase: 02-seating-chart-save
reviewed: 2026-05-16T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - .planning/phase-2/PLAN.md
  - .planning/phase-2/SPEC.md
  - src/hooks/useSeatingChart.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: resolved
---

# Phase 2: Seating Chart Save Improvements - Final Review (Cycle 5)

**Reviewed:** 2026-05-16
**Depth:** Standard
**Files Reviewed:** .planning/phase-2/PLAN.md, .planning/phase-2/SPEC.md, src/hooks/useSeatingChart.ts
**Status:** Resolved

## Summary

The proposed Cycle 5 refinements in `PLAN.md` and `SPEC.md` correctly address the primary blockers identified in previous reviews (CR-01 and CR-02). The use of `contextId` tagging and `useEffect` cleanup for flushing unsaved changes provides a robust solution to race conditions and data loss during performance switching.

The implementation now addresses the previously noted edge cases for error reporting, session tracking, and background flush indicators.

## Critical Issues

*No critical issues remain. The architecture for race condition prevention and data preservation is solid.*

## Warnings

### WR-01: Cross-Context Error Leaks

**File:** `src/hooks/useSeatingChart.ts` (Proposed logic in `syncWithServer`)
**Issue:** While the `contextId` check correctly prevents stale data from overwriting the state of a new performance, the `catch` block in `syncWithServer` (as currently planned) may still call `setError(err.message)`. If a save for Performance A fails after the user has switched to Performance B, the UI for Performance B will display an error message for a failure that occurred in a different context.
**Fix:**
Ensure `setError` is only called if the context is still current.
```typescript
// Inside syncWithServer catch block
if (contextId === `${performanceId}-${venue?.id}`) {
  setError(err.message || 'Failed to save seating chart');
}
```

**Resolution:** Implemented in `src/hooks/useSeatingChart.ts`; `catch` only updates `error` when `shouldApplySeatingResponse(requestContext, currentContextRef.current)` is true.

## Info

### IN-01: Session Tracking for Rapid Context Bouncing

**File:** `SPEC.md:2.1`
**Issue:** If a user switches from Performance A to B and back to A very quickly, the `contextId` (`performanceId-venueId`) will match the current state for both the first and second "sessions" of A. While sequence numbers (`lastAppliedIdRef`) and the `syncSequenceRef` check provide significant protection, adding a unique session counter ensures that responses from a previous visit to the same performance are always discarded.
**Fix:**
Add a `sessionIdRef` that increments in `fetchData`. Include it in the `contextId`.
```typescript
const sessionIdRef = useRef(0);
// In fetchData: sessionIdRef.current++;
const contextId = `${targetId}-${targetVenue}-${sessionIdRef.current}`;
```

**Resolution:** Implemented with session-aware `SeatingSyncContext` values and covered by `seating sync contexts reject stale responses from previous visits`.

### IN-02: Suppress Loading Indicator for Background Flushes

**File:** `src/hooks/useSeatingChart.ts`
**Issue:** When `syncWithServer` is called as a flush during cleanup, it may set `setIsRequestInFlight(true)` or `setIsSyncPending(true)`. If the context has already changed, this will cause the UI of the *new* performance to show "Saving..." even though the new performance's state is clean.
**Fix:**
Only update state variables (`setIsSaving`, `setIsSyncPending`, etc.) if the `contextId` of the request matches the *current* hook context.

**Resolution:** Implemented with `updateCurrentState: false` for cleanup flushes and current-context checks before UI state updates.

---

_Reviewed: 2026-05-16_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
