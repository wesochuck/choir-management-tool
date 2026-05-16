# Phase 2: Seating Chart Save Improvements (Cycle 5) - SPEC

This document specifies the final refinements to the `useSeatingChart` hook and `SeatingView` to handle multi-performance context switching, race conditions, and robust retry logic.

## 1. Requirement Traceability
- **GOAL:** Ensure zero data loss and absolute data integrity when switching between performances or handling network failures.
- **CR-01 (Context Switch Race Condition):** Ignore server responses if the user has switched performance/venue during the request.
- **CR-02 (Data Loss on Switch):** Flush unsaved changes immediately before switching contexts.
- **WR-01 (Retry Logic):** Allow "Retry" button to trigger `fetchData` if the initial load failed.
- **WR-02 (Efficiency):** Streamline save payload and state derivations.
- **WR-03 (Load Merging):** Do not overwrite optimistic local edits with stale data from a late-finishing load.

## 2. Refined State Machine

### 2.1 Context Identification
Every request must be tagged with a `contextId`: `${performanceId}-${venue.id}`.

### 2.2 Variables & Refs (Extensions to Cycle 4)

| Name | Type | Purpose |
|------|------|---------|
| `isDirtyRef` | `MutableRefObject<boolean>` | Reliable synchronous source for dirty state during cleanup. |
| `lastEditIdRef` | `MutableRefObject<number>` | Incremented on every edit. |
| `lastAppliedIdRef` | `MutableRefObject<number>` | Highest edit ID acknowledged by server. |
| `syncWithServerRef` | `MutableRefObject<Function>` | Stable ref to sync function for use in cleanup effects. |

## 3. Operations (Refined)

### 3.1 Context Switch Sync (CR-02)
Use a `useEffect` cleanup function or a logic check at the start of `fetchData` / `useEffect([performanceId])` to ensure unsaved changes are flushed.

```typescript
useEffect(() => {
  const currentId = performanceId;
  const currentVenue = venue?.id;
  
  return () => {
    // If the hook is unmounting or performanceId is changing
    // and we have unsaved changes, trigger a flush.
    if (isDirtyRef.current) {
      void syncWithServerRef.current(currentId, currentVenue);
    }
  };
}, [performanceId, venue?.id]);
```

### 3.2 Context-Aware Sync (CR-01)
`syncWithServer` must accept context parameters or capture them and verify they match current state before applying results.

```typescript
const syncWithServer = useCallback(async (forcedId?: string, forcedVenue?: string) => {
  const targetId = forcedId || performanceId;
  const targetVenue = forcedVenue || venue?.id;
  const contextId = `${targetId}-${targetVenue}`;

  // ... api call ...

  // Verification before applying response
  if (contextId !== `${performanceId}-${venue?.id}`) {
    console.log("Discarding stale response for context:", contextId);
    return;
  }
  // ... apply ...
}, [performanceId, venue]);
```

### 3.3 Robust Force Save / Retry (WR-01)
`forceSave` must handle the case where the view is in an error state due to a failed load.

```typescript
const forceSave = useCallback(async () => {
  if (error && !isDirty) {
    await fetchData(); // Retry load
  } else if (isDirty || error) {
    await syncWithServer(); // Retry save
  }
}, [error, isDirty, fetchData, syncWithServer]);
```

### 3.4 Load Merging (WR-03)
In `fetchData`, if `isDirtyRef.current` is true, merge the server response with `dirtyPayloadRef.current` to ensure optimistic edits aren't lost when a slow load finishes.

## 4. UI Feedback Improvements
- `isSaving` state should strictly reflect network activity + pending sync.
- Redundant "✓ All changes saved" indicator in `SeatingView` should be removed in favor of the Button's "Saved!" state or a consolidated status line.

## 5. Verification Plan
- **Test Case 1 (Context Switch):** Edit Perf A, immediately click Perf B. Observe network: Save for A should fire, then Fetch for B. Result for A must not overwrite B's state.
- **Test Case 2 (Load Retry):** Disable network, enter Seating View. Observe Error. Enable network, click Retry. Observe successful fetch.
- **Test Case 3 (Rapid Edits):** Click many seats rapidly. Observe `activeRequestsCount` and sequence tracking correctly identifying the "latest" successful state.
