---
phase: 02-seating-chart-save-cycle-3
reviewed: 2026-05-16T14:56:51Z
depth: deep
files_reviewed: 2
files_reviewed_list:
  - .planning/phase-2/PLAN.md
  - .planning/phase-2/SPEC.md
findings:
  critical: 2
  warning: 2
  info: 0
  total: 4
status: resolved
---

# Phase 2: Code Review Report

**Reviewed:** 2026-05-16T14:56:51Z
**Depth:** deep
**Files Reviewed:** 2
**Status:** resolved

## Resolution

Resolved in `src/hooks/useSeatingChart.ts` by moving sequence tracking to edit time via `lastEditIdRef`, tracking persisted progress with `lastAppliedIdRef`, clearing errors at the start of each sync, scoping save failures to the latest edit, and using `activeRequestsCount` for in-flight status. The manual save UI in `src/views/admin/SeatingView.tsx` now exposes saving, retry, dirty, and saved feedback.

## Summary

The proposed architecture in `PLAN.md` and `SPEC.md` introduces critical improvements for concurrency and optimistic UI updates. However, deep analysis of the state machine reveals severe race conditions between the debounced save and the sequence tracking logic. If executed as planned, the implementation will cause silent data loss during rapid edits and trap the user in inescapable error states.

## Critical Issues

### CR-01: Data Loss via Debounce/Sequence Race Condition

**File:** `.planning/phase-2/PLAN.md:40`
**Issue:** `lastRequestIdRef` is incremented inside `syncWithServer` (after the debounce delay) rather than synchronously at the time of the edit (`assignSinger`).

If the user makes an edit (Edit A) and the debounce timer starts, then the timer fires and Request A is sent. While Request A is in flight, the user makes another edit (Edit B). 

When Request A succeeds, it checks `currentRequestId === lastRequestIdRef.current`. Since Request B hasn't been fired yet (its debounce timer is still running), `lastRequestIdRef` hasn't been incremented! The condition evaluates to `true`, causing `isDirty` to be set to `false`. 

This incorrectly signals that all local changes are saved, triggering a state synchronization that overwrites `optimisticAssignments` and `pendingAssignmentsRef` with the server's response (which only contains Edit A). Edit B is silently destroyed before it ever saves.

**Fix:**
Bind the sequence ID to the *edit action*, not the network request instance.
```javascript
// In assignSinger / updateChart:
lastEditSequenceRef.current += 1;
setIsDirty(true);
// ... schedule syncWithServer

// In syncWithServer:
const sequenceToSave = lastEditSequenceRef.current;
// ... make API call
// In .then():
if (sequenceToSave === lastEditSequenceRef.current) {
  setIsDirty(false); // Only clear if no new edits occurred since this save started
}
```

### CR-02: Permanent Error State on Manual Retry

**File:** `.planning/phase-2/PLAN.md:46`
**Issue:** The `forceSave` method triggers `syncWithServer` when `hasError` is true, but `syncWithServer` never resets `hasError`. If a save fails, `hasError` becomes true. The user clicks "Save" to retry, the save succeeds, but because `hasError` is never cleared, the UI remains permanently stuck displaying "Error - Click to retry".

**Fix:**
Reset the error state at the beginning of `syncWithServer` before initiating the network request.
```javascript
// In syncWithServer:
setHasError(false);
setIsSyncPending(false);
setIsRequestInFlight(true);
```

## Warnings

### WR-01: False Positive Error Status from Out-of-Order Failures

**File:** `.planning/phase-2/PLAN.md:50`
**Issue:** In `.catch()`, `hasError` is set to `true` unconditionally. If Request 1 hangs, Request 2 fires and succeeds, and then Request 1 finally times out and fails, the `.catch()` block will flag an error. The user will see a failure state even though their latest data (Request 2) was already successfully saved.

**Fix:**
Scope the error state update to the sequence tracking check.
```javascript
.catch((err) => {
  if (sequenceToSave === lastEditSequenceRef.current) {
    setHasError(true);
  }
})
```

### WR-02: Premature In-Flight State Clearing

**File:** `.planning/phase-2/PLAN.md:52`
**Issue:** In `.finally()`, `isRequestInFlight` is set to `false` unconditionally. If multiple network requests are running concurrently (e.g., rapid manual saves), the first request to finish will clear the in-flight flag. This causes the UI to prematurely display "All changes saved" while other requests are still writing to the backend.

**Fix:**
```javascript
.finally(() => {
  if (sequenceToSave === lastEditSequenceRef.current) {
    setIsRequestInFlight(false);
  }
})
```

---

_Reviewed: 2026-05-16T14:56:51Z_
_Reviewer: gsd-code-reviewer_
_Depth: deep_
