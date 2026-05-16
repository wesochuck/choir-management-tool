# Phase 2: Seating Chart Save Improvements (Cycle 4) - SPEC

This document specifies the robust state machine for the seating chart save logic in `useSeatingChart`, addressing race conditions and network instability.

## 1. Requirement Traceability
- **GOAL:** Ensure data integrity during rapid edits and handle network race conditions gracefully.
- **D-01 (from Review):** Track edits synchronously at the time of the action, not the request.
- **D-02 (from Review):** Clear errors at the start of a sync attempt.
- **D-03 (from Review):** Handle out-of-order responses by ignoring old sequences.
- **D-04 (from Review):** Only set error state if the failing request was the latest edit.

## 2. State Machine Design

### 2.1 Variables & Refs

| Name | Type | Purpose |
|------|------|---------|
| `lastEditIdRef` | `MutableRefObject<number>` | Incremented synchronously on every local edit. |
| `lastAppliedIdRef` | `MutableRefObject<number>` | Tracks the highest `lastEditId` successfully persisted to the server. |
| `activeRequestsCount` | `useState<number>` | Number of network requests currently in flight. |
| `isSyncPending` | `useState<boolean>` | True if a debounce timer is currently running. |
| `optimisticAssignments`| `useState<Record>` | The local "ground truth" for the UI. |
| `error` | `useState<string | null>` | Error message from the latest attempted edit. |

### 2.2 Derivations

- **`isDirty`**: `lastEditIdRef.current > lastAppliedIdRef.current`
- **`isSaving`**: `isSyncPending || activeRequestsCount > 0`

## 3. Operations

### 3.1 Local Edit (`assignSinger`, `updateChart`)
1. Increment `lastEditIdRef.current`.
2. Update `optimisticAssignments` (and other chart fields) synchronously.
3. Schedule `syncWithServer` with 1000ms debounce.
4. Set `isSyncPending(true)`.

### 3.2 Syncing (`syncWithServer`)
1. Clear any existing debounce timer.
2. Set `isSyncPending(false)`.
3. Capture `const requestId = lastEditIdRef.current`.
4. If `requestId === lastAppliedIdRef.current`, return (nothing new to save).
5. Increment `activeRequestsCount`.
6. Set `error(null)`.
7. **Perform API Call** (`seatingService.saveChart`):
   - **Success**:
     - If `requestId > lastAppliedIdRef.current`:
       - `lastAppliedIdRef.current = requestId`.
       - Update `chart` state with response.
   - **Failure**:
     - If `requestId === lastEditIdRef.current`:
       - `setHasError(err)`.
   - **Finally**:
     - Decrement `activeRequestsCount`.

### 3.3 Manual Force Save
1. If `isDirty`: Trigger `syncWithServer` immediately (bypassing debounce).
2. If `!isDirty`: Show "Saved!" toast (implementation in component).

## 4. UI Indicators (SeatingGrid)

- **Saving**: Display "Saving..." if `isSaving` is true.
- **Dirty**: Display "Unsaved changes" if `isDirty` is true and `!isSaving`.
- **Saved**: Display "Saved" if `!isDirty` and `!isSaving` and `!error`.
- **Error**: Display "Save failed - click to retry" if `error` is present.

## 5. Migration Rules
- Ensure `src/services/seatingService.ts` supports partial updates if needed, or always send the full payload derived from `optimisticAssignments`.
