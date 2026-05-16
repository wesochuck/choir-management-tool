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
    - "Status indicator shows 'Saving...' during debounce AND network activity"
    - "Manual 'Save' button triggers immediate sync or visual success feedback"
    - "Manual 'Save' button displays 'Saved!' feedback temporarily"
  artifacts:
    - path: "src/hooks/useSeatingChart.ts"
      provides: "optimisticAssignments, debounced sync, and accurate isSaving"
    - path: "src/views/admin/SeatingView.tsx"
      provides: "Status Indicator with flicker prevention and Smart Save button"
  key_links:
    - from: "src/views/admin/SeatingView.tsx"
      to: "src/hooks/useSeatingChart.ts"
      via: "isSaving, forceSave, and optimisticAssignments"
---

<objective>
Re-plan Phase 2 to resolve concurrency issues and improve save feedback. Implement a debounced, optimistic saving strategy in the seating chart hook to prevent data loss during rapid edits, and add a resilient UI status indicator and manual save button.
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
  <name>Task 1: Fix Race Condition & Implement Debounced Sync in Hook</name>
  <files>src/hooks/useSeatingChart.ts</files>
  <action>
    - Add `optimisticAssignments` state, initialized from `chart.assignments`.
    - Introduce a `saveTimeoutRef` (useRef) to manage debouncing.
    - Implement a `syncWithServer` function that uses the latest `optimisticAssignments` to call `seatingService.saveChart`.
    - Add `isSyncPending` state to track if a sync is scheduled in the timer.
    - Add `isRequestInFlight` state for the actual network call.
    - Define `isSaving` = `isSyncPending || isRequestInFlight` (per D-06/CR-01).
    - Update `assignSinger` to:
      1. Update `optimisticAssignments` immediately (optimistic UI).
      2. Clear any existing `saveTimeoutRef`.
      3. Set `isSyncPending` to true.
      4. Schedule `syncWithServer` after 1000ms.
    - Update `updateChart` to follow the same debounced pattern.
    - Add `forceSave` method that immediately clears timer and calls `syncWithServer` if `isSyncPending` is true.
    - Ensure `optimisticAssignments` is updated when a new `chart` is loaded (but only if not currently "dirty").
  </action>
  <verify>
    <automated>grep -q "optimisticAssignments" src/hooks/useSeatingChart.ts && grep -q "forceSave" src/hooks/useSeatingChart.ts</automated>
  </verify>
  <done>Hook now uses optimistic state and debounced syncing to prevent race conditions and provide accurate saving status.</done>
</task>

<task type="auto">
  <name>Task 2: Implement Resilient Save UI in SeatingView</name>
  <files>src/views/admin/SeatingView.tsx</files>
  <action>
    - Extract `isSaving`, `error`, and `forceSave` from `useSeatingChart`.
    - Create a `SavingIndicator` component that shows:
      - "Saving..." (when `isSaving` is true).
      - "Failed to save" (when `error` is present).
      - "All changes saved" (when idle). Use a 2-second "hold" on the "Saved" state if it just transitioned from "Saving" to prevent flicker (per WR-02).
    - Implement the "Save" button in the toolbar:
      - Clicking calls a handler that:
        1. If `isSaving` (pending), calls `forceSave()`.
        2. If not `isSaving`, triggers a local "Saved!" feedback state.
    - Add "Your changes are saved automatically." text.
    - Ensure the button label changes to "Saved!" for 2 seconds after a manual or automatic save completion.
    - Styles: Sage Green (#4a7c59) for success, Sage Mist (#e9f0eb) for button background.
  </action>
  <verify>
    <automated>grep -q "SavingIndicator" src/views/admin/SeatingView.tsx && grep -q "forceSave" src/views/admin/SeatingView.tsx</automated>
  </verify>
  <done>Seating chart now features a flicker-free status indicator, a smart manual save button with feedback, and auto-save info.</done>
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
</threat_model>

<success_criteria>
- Assignments update instantly in the UI.
- Rapidly clicking seats results in a single coalesced save call after the debounce period.
- Manual save button triggers immediate sync if pending, otherwise shows "Saved!" feedback.
- "Saving..." indicator is visible during the debounce period and the network request.
- No visual flickering of the "All changes saved" status during rapid edits.
</success_criteria>

<output>
After completion, create .planning/phase-2/SUMMARY.md
</output>
