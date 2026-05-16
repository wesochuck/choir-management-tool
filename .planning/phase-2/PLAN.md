---
phase: 02-seating-chart-save
plan: 03
type: execute
wave: 1
depends_on: []
files_modified: [src/hooks/useSeatingChart.ts, src/views/admin/SeatingView.tsx]
autonomous: true
requirements: [SEAT-01, SEAT-02, SEAT-03]
must_haves:
  truths:
    - "Unsaved changes are flushed to the server when switching performances"
    - "Server responses are ignored if the performance context has changed"
    - "Retry button recovers from failed initial data loading"
    - "Optimistic edits are preserved during slow data loads"
  artifacts:
    - path: "src/hooks/useSeatingChart.ts"
      provides: "Context-aware state machine for seating chart saves"
---

<objective>
Implement Cycle 5 refinements for the seating chart save logic to achieve absolute data integrity during performance switching and network instability.

Purpose: Solve race conditions (CR-01), prevent data loss on switch (CR-02), and fix retry logic (WR-01).
Output: Bulletproof `useSeatingChart` hook and improved `SeatingView` UI.
</objective>

<execution_context>
@$HOME/.gemini/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/phase-2/SPEC.md
@src/hooks/useSeatingChart.ts
@src/views/admin/SeatingView.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement Context-Aware Syncing and Cleanup Flushing</name>
  <files>src/hooks/useSeatingChart.ts</files>
  <action>
    - Update `syncWithServer` to accept optional `forcedId` and `forcedVenue`.
    - Capture `contextId` (`performanceId-venueId`) at start of `syncWithServer`.
    - Before applying server response, verify `contextId` matches current state.
    - Add a `useEffect` with a cleanup function that checks `isDirtyRef.current` and triggers `syncWithServer` with captured current IDs before switching.
    - Ensure `syncWithServerRef` is updated on every render to point to the latest `syncWithServer` callback.
    - Reference CR-01 and CR-02 in implementation.
  </action>
  <verify>
    - Unit test or manual verification: Trigger save, change performanceId, confirm old response is discarded.
    - Confirm sync fires on unmount/performance change if dirty.
  </verify>
  <done>Context-aware sync and flushing implemented.</done>
</task>

<task type="auto">
  <name>Task 2: Improve Robustness of Data Loading and Retries</name>
  <files>src/hooks/useSeatingChart.ts</files>
  <action>
    - In `fetchData`, if `isDirtyRef.current` is true, merge the server response with `dirtyPayloadRef.current` (WR-03).
    - Update `forceSave` to call `fetchData` if `error` is present but `isDirty` is false (retrying failed load) (WR-01).
    - Streamline `isSaving` to accurately reflect network activity and pending timers.
    - Clean up redundant payload spreading in `syncWithServer` (WR-02).
  </action>
  <verify>
    - Simulate load failure, click "Retry", verify data loads.
    - Simulate slow load, make edit, verify edit is not overwritten by load result.
  </verify>
  <done>Loading and retry logic hardened.</done>
</task>

<task type="auto">
  <name>Task 3: Consolidate UI Indicators in SeatingView</name>
  <files>src/views/admin/SeatingView.tsx</files>
  <action>
    - Remove the redundant "✓ All changes saved" text from `SavingIndicator` if it overlaps with the Save Button state (WR-04).
    - Ensure the Save button labels ("Save", "Saving...", "Saved!", "Retry Save") correctly map to the hook's `isSaving`, `isDirty`, and `error` states.
    - Add visual feedback for "Syncing..." vs "Waiting..." if beneficial for UX.
  </action>
  <verify>
    - Visual inspection of the save status during various states.
  </verify>
  <done>UI indicators consolidated and accurate.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Client -> PocketBase | Save requests cross this boundary. |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | `saveChart` | mitigate | Sequence IDs and context IDs ensure data is applied to the correct record in the correct order. |
| T-02-02 | Denial of Service | `syncWithServer` | mitigate | Debounce (1s) prevents flooding the server with requests on every keystroke. |
</threat_model>

<verification>
Manual verification of the three critical test cases defined in SPEC.md.
</verification>

<success_criteria>
1. Switching performances while dirty triggers a save for the previous performance.
2. Stale responses from slow saves/loads do not overwrite current performance state.
3. Loading errors can be recovered using the Retry button.
4. No data loss occurs during rapid performance switching and editing.
</success_criteria>

<output>
After completion, create `.planning/phases/02-seating-chart-save/02-03-SUMMARY.md`
</output>
