# Design Specification: Seating Chart Save Improvements

## 1. Overview
This specification details the improvements to the seating chart saving experience. While the system currently auto-saves every change, users need visual confirmation that their work is safe and an explicit "Save" button for peace of mind. To prevent race conditions and data loss during rapid edits, a debounced, optimistic saving strategy is required.

## 2. Visual Design

### 2.1 Status Indicator
- **Location**: In the SeatingView toolbar, near the "Copy Layout From" or "Print Layout" button.
- **States**:
  - **Saved**: "All changes saved" with a green checkmark icon (Sage Green #4a7c59).
  - **Saving**: "Saving..." with a subtle pulsing animation or neutral color (Neutral Muted #64748b).
  - **Error**: "Failed to save" in red text with an alert icon.
- **Typography**: Label style (500 weight, 0.875rem).
- **Flicker Prevention**: The "All changes saved" status should only be displayed when the system is truly idle (no pending syncs and no active network requests).

### 2.2 Explicit Save Button
- **Style**: Secondary button (Sage Mist #e9f0eb background, Sage Green #4a7c59 text).
- **Label**: "💾 Save"
- **Behavior**:
  - **Smart Sync**: If `isSaving` is false and no changes are pending, clicking "Save" should provide visual "Saved!" feedback without performing a network request.
  - **Forced Sync**: If changes are pending in the debounce timer, clicking "Save" should immediately trigger the sync.
  - **Feedback**: Provide temporary "Saved!" toast-like feedback on the button itself (e.g., label changes briefly to "Saved!").

### 2.3 Auto-save Messaging
- **Text**: "Your changes are saved automatically."
- **Style**: Neutral Muted (#64748b), small font size (0.75rem or var(--font-size-xs)).
- **Location**: Directly below or next to the Save button.

## 3. Technical Requirements

### 3.1 Hook Enhancements (`useSeatingChart.ts`)
- **Optimistic State**: Introduce `optimisticAssignments` state (or similar) to track the current UI state of the chart.
- **Debounced Sync**:
  - Implement a `syncWithServer` function that sends the `optimisticAssignments` to PocketBase.
  - Debounce this function by ~500-1000ms.
- **`isSaving` logic**:
  - `isSaving` = `isSyncingWithServer` (active request) OR `isSyncPending` (timer running).
- **Methods**:
  - `assignSinger`: Updates `optimisticAssignments` immediately and triggers/resets the debounce timer.
  - `updateChart`: Updates `optimisticAssignments` and triggers/resets the debounce timer.
  - `forceSave`: Immediately cancels the debounce timer and calls `syncWithServer` if changes are pending.

### 3.2 View Implementation (`SeatingView.tsx`)
- Implement a `SavingIndicator` component (internal or sub-component).
- Update the toolbar layout to accommodate the new elements.
- The Save button should display "Saved!" temporarily after a successful manual or automatic save if it was the last action.

## 4. User Experience (UX)
- **Immediate Feedback**: The "Saving..." state should appear immediately when a change is initiated.
- **Data Integrity**: Local edits are never overwritten by stale server responses during rapid fire edits.
- **Error Recovery**: If a save fails, the error state should persist until a successful retry is performed.
