# Seating Drag-and-Drop and Zoom Specification

This specification details the UX enhancements for the Seating Chart Editor: a fixed-height scrollable sidebar with drop-to-unassign capabilities, seat-to-seat swaps, and a high-performance fisheye magnifying zoom.

## 🎯 Goals

1. **Eliminate Layout Shifts (Jumps):** Lock the Unassigned sidebar's height and make the list scrollable so adding/removing singers never shifts page dimensions.
2. **Drag-to-Sidebar Unassignment:** Allow dragging a singer from any seat and dropping them on the "Unassigned" sidebar to unassign them.
3. **Seat-to-Seat Swapping:** Dragging singer A from Seat 1 onto Seat 2 (occupied by singer B) swaps their positions instead of displacing singer B.
4. **Fisheye Magnifying Zoom:** Hovering/dragging over a seat scales the targeted seat to `1.45x` and direct same-row neighbors to `1.22x` with smooth cubic-bezier transitions.
5. **Preserve Text Print View:** Keep the custom text print list toggle and format fully intact and operational.

---

## 🛠️ Proposed Changes

### 1. `src/hooks/useSeatingChart.ts`
* Update `assignSinger(seatKey: string, profileId: string, fromSeatKey?: string)`:
  * If `fromSeatKey` is provided and the target `seatKey` is already occupied by a different singer (`occupantId`):
    * Move `occupantId` to `fromSeatKey` (Swap!).
    * Place the new `profileId` in the target `seatKey`.
  * If `profileId` is empty (unassign flow):
    * Delete the assignment for `seatKey`.
  * Trigger `queueChartSave` with updated assignments.

### 2. `src/views/admin/SeatingView.tsx`
* **Sidebar Layout:**
  * Update the "Unassigned" `AppCard` style: `display: 'flex'`, `flexDirection: 'column'`, `height: 'calc(100vh - 140px)'`, `boxSizing: 'border-box'`.
  * Update the list wrapper: `flex: 1`, `overflowY: 'auto'`.
* **Sidebar Drop Target:**
  * Add `onDragOver={(e) => e.preventDefault()}`.
  * Add `onDrop` handler on the Unassigned card:
    * Extract `fromSeatKey` from the drag transfer data.
    * If `fromSeatKey` exists, call `assignSinger(fromSeatKey, '')` to unassign the singer.

### 3. `src/components/admin/SeatingGrid.tsx`
* **Fisheye Zoom State:**
  * Introduce state: `const [activeDragOver, setActiveDragOver] = useState<string | null>(null)`.
* **Transitions & Scaling CSS:**
  * Add transition styling on the seat cell: `transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease-in-out'`.
  * Parse row and seat indexes for neighbor detection:
    * If hovered/active drop target: `transform: 'scale(1.45) translateY(-8px)'`, `zIndex: 10`, `boxShadow: 'var(--shadow-lg)'`.
    * If direct same-row neighbor (same row, `Math.abs(s1 - s2) === 1`): `transform: 'scale(1.22) translateY(-4px)'`, `zIndex: 5`, `boxShadow: 'var(--shadow-sm)'`.
* **Drag/Drop Handlers:**
  * Set `e.dataTransfer.setData('text/plain', JSON.stringify({ profileId, fromSeatKey }))` inside `handleDragStart`.
  * Toggle `activeDragOver` inside `onDragEnter`, `onDragLeave`, and `onDrop`.

---

## 🧪 Verification Plan

1. **Compilation Check:** Run `npm run build` to ensure type safety.
2. **Unit Tests:** Execute `npm test` to verify zero regressions.
3. **Manual Flow Checks:**
   * Drag from unassigned sidebar → drop on empty seat.
   * Drag from seat A → drop on occupied seat B (verify swap).
   * Drag from seat B → drop on sidebar (verify unassign).
   * Verify scrollbar behavior in sidebar (no page jumps).
   * Verify Text Print View tab functions identically.
