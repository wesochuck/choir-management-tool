---
phase: 02-seating-chart-save
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/hooks/useSeatingChart.ts, src/views/admin/SeatingView.tsx]
autonomous: true
requirements: [SEAT-01, SEAT-02, SEAT-03]

must_haves:
  truths:
    - "User changes are optimistically reflected in the UI immediately"
    - "Rapid edits do not lose data due to race conditions (debounced sync)"
    - "Stale network responses do not overwrite newer local edits (sequence tracking)"
    - "Status indicator shows 'Saving...', 'Error - Click to retry', or 'All changes saved'"
    - "Manual 'Save' button triggers immediate sync or retry if dirty/error"
    - "Manual 'Save' button displays 'Saved!' feedback temporarily when idle"
  artifacts:
    - path: "src/hooks/useSeatingChart.ts"
      provides: "optimisticAssignments, isDirty, hasError, forceSave, and sequence tracking"
    - path: "src/views/admin/SeatingView.tsx"
      provides: "SavingIndicator with 3 states and Smart Save button with retry logic"
  key_links:
    - from: "src/views/admin/SeatingView.tsx"
      to: "src/hooks/useSeatingChart.ts"
      via: "isSaving, isDirty, hasError, forceSave"
---

<objective>
Re-plan Phase 2 to resolve critical concurrency issues and improve save feedback. Implement a debounced, optimistic saving strategy in the seating chart hook with sequence tracking to prevent data loss. Add a resilient UI status indicator and a smart manual save button that handles errors and pending changes.
</objective>

<execution_context>
@$HOME/.gemini/get-shit-done/workflows/execute-plan.md
@$HOME/.gemini/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phase-2/SPEC.md
@.planning/phase-2/REVIEW.md
@src/hooks/useSeatingChart.ts
@src/views/admin/SeatingView.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement Robust Optimistic Hook with Concurrency Control</name>
  <files>src/hooks/useSeatingChart.ts</files>
  <action>
    - Add `optimisticAssignments` state, initialized from `chart.assignments`.
    - Add `isDirty` state (boolean) to track if local changes exist that haven't been successfully saved.
    - Add `hasError` state (boolean) to track if the last save attempt failed.
    - Add `isSyncPending` state for the debounce timer status.
    - Add `isRequestInFlight` state for the network request status.
    - Define `isSaving` = `isSyncPending || isRequestInFlight`.
    - Introduce refs for concurrency control (CR-02):
      - `lastRequestIdRef` (counter, incremented for every network request).
      - `lastAppliedIdRef` (counter, tracks the ID of the latest successful response applied).
      - `saveTimeoutRef` for debouncing.
      - `pendingAssignmentsRef` (mutable ref holding latest assignments to avoid stale closures in syncWithServer - WR-01).
    - Update `assignSinger` and `updateChart` to:
      1. Update `optimisticAssignments` and `pendingAssignmentsRef.current` immediately.
      2. Set `isDirty` to true.
      3. Reset `hasError` to false.
      4. Clear `saveTimeoutRef`.
      5. Set `isSyncPending` to true.
      6. Schedule `syncWithServer` after 1000ms.
    - Implement `syncWithServer`:
      1. Capture `currentRequestId = ++lastRequestIdRef.current`.
      2. Set `isSyncPending` false, `isRequestInFlight` true.
      3. Call `seatingService.saveChart` with `pendingAssignmentsRef.current`.
      4. In `.then()`:
         - If `currentRequestId >= lastAppliedIdRef.current`:
           - Update `lastAppliedIdRef.current = currentRequestId`.
           - Set `chart` to updated value.
           - If `currentRequestId === lastRequestIdRef.current`, set `isDirty` false.
      5. In `.catch()`:
         - Set `hasError` true.
      6. In `.finally()`:
         - Set `isRequestInFlight` false.
    - Add `forceSave` method:
      - Immediately clears `saveTimeoutRef`.
      - Calls `syncWithServer` if `isDirty` or `hasError` is true.
    - Ensure `optimisticAssignments` and `pendingAssignmentsRef.current` are synchronized when `chart` loads from server (only if not `isDirty`).
  </action>
  <verify>
    <automated>grep -q "optimisticAssignments" src/hooks/useSeatingChart.ts && grep -q "lastAppliedIdRef" src/hooks/useSeatingChart.ts</automated>
  </verify>
  <done>Hook handles debouncing, optimistic updates, and concurrency control to ensure data integrity.</done>
</task>

<task type="auto">
  <name>Task 2: Implement Resilient Status Indicator & Smart Save Button</name>
  <files>src/views/admin/SeatingView.tsx</files>
  <action>
    - Extract `isSaving`, `isDirty`, `hasError`, and `forceSave` from `useSeatingChart`.
    - Create a `SavingIndicator` component in `SeatingView.tsx`:
      - **Saving**: If `isSaving`, show "Saving..." (Neutral Muted #64748b).
      - **Error**: If `hasError`, show "Error - Click to retry" (Red, clickable calls `forceSave`).
      - **Saved**: If idle (`!isSaving && !hasError && !isDirty`), show "All changes saved" (Sage Green #4a7c59).
    - Create a `SmartSaveButton` component:
      - Label: "💾 Save".
      - On Click:
        - If `hasError` or `isSaving`, call `forceSave()`.
        - If idle, show "Saved!" feedback for 2 seconds (using local state).
    - Integrate elements into the toolbar (next to Clear/Reset buttons):
      - Replace "Print Layout" button area or add to the flex row.
      - Add "Your changes are saved automatically." helper text.
    - Ensure the button shows "Saved!" label for 2 seconds after a manual or automatic save completes (use `useEffect` watching `isDirty` transitioning from true -> false).
  </action>
  <verify>
    <automated>grep -q "SavingIndicator" src/views/admin/SeatingView.tsx && grep -q "forceSave" src/views/admin/SeatingView.tsx</automated>
  </verify>
  <done>UI provides clear feedback on save status and a reliable manual save/retry mechanism.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Client -> PocketBase | Seating chart data persistence |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Information Disclosure | Seating Chart API | accept | Protected by PocketBase collection rules (existing). |
| T-02-02 | Denial of Service | Rapid Auto-saves | mitigate | Debouncing implementation (Task 1) reduces network noise by coalescing rapid edits into a single save operation. |
| T-02-03 | Data Corruption | Concurrent Edits | mitigate | Sequence tracking (Task 1) ensures stale server responses never overwrite newer local data. |
</threat_model>

<verification>
- Perform rapid seat assignments; verify only one network call occurs after 1s.
- Simulate a network failure; verify "Error - Click to retry" appears and persists.
- Click "Save" during error; verify a retry is triggered immediately.
- Click "Save" while idle; verify "Saved!" appears on the button for 2s.
- Edit during an active save; verify the newer edit is correctly preserved after the first save completes and the second starts.
</verification>

<success_criteria>
- Assignments update instantly in the UI.
- No "stale rollback" occurs if a network request finishes late.
- Manual save button triggers immediate sync if pending, otherwise shows visual feedback.
- Error state is visible and actionable.
- Status indicator accurately reflects the state of the backend sync.
</success_criteria>

<output>
After completion, create .planning/phase-2/SUMMARY.md
</output>
