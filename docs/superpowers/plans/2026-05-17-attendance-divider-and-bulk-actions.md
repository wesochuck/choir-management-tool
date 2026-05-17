# Premium Attendance Separator & Bulk Actions Implementation Plan

We will add a beautiful visual separator dividing checked-in singers from unchecked ones, and provide bulk controls to update the entire roster for the active event.

## Goal
Improve administrative efficiency by moving checked-in singers to the bottom of the check-in view beneath a premium visual divider and providing bulk action controls to mark everyone **Present**, **Absent**, or **Unmarked**, alongside a manual **Refresh** feature.

---

## User Review Required

> [!NOTE]
> **Scope of Bulk Actions:** Bulk actions (Mark All Present / Mark All Absent / Reset All) will apply to all singers currently loaded for the active event. If you have active search filters, the bulk action will prompt to confirm whether to apply to all singers or only the filtered subset, providing maximum flexibility!

---

## Proposed Changes

### Component & Hook Layers

#### [MODIFY] [useAttendance.ts](file:///Users/wesosborn/Downloads/choir-management-tool/src/hooks/useAttendance.ts)
Enhance the custom hook to support bulk updates (`setAllAttendance`) by executing parallel upsert operations on PocketBase and managing local state updates with full optimism and rollback-on-failure safety.

- Expose a `setAllAttendance(next: 'Present' | 'Absent' | 'Pending')` function.
- Local state will immediately update all active items optimistically to `next`.
- It will execute `Promise.all` calling `rosterService.upsertAttendance` for each singer.
- If any request fails, it reverts the state to the original attendance values and logs/displays the error.

#### [MODIFY] [CheckInList.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/components/admin/CheckInList.tsx)
Re-organize the layout to split checked-in singers from other singers:
- Split the items array into two arrays: `notCheckedIn` (`Pending` or `Absent`) and `checkedIn` (`Present`).
- Keep `notCheckedIn` sorted: `Pending` (unmarked) at the very top (value `0`), then `Absent` (value `1`), then sorted alphabetically by name.
- Keep `checkedIn` sorted alphabetically by name.
- Render `notCheckedIn` list.
- If `checkedIn.length > 0`, render a beautiful premium divider:
  - Gradient borders that fade towards the edges.
  - A pill badge in the center displaying: `✓ Checked In (${checkedIn.length})` with standard glassmorphism details.
- Render `checkedIn` list.

#### [MODIFY] [AttendanceView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/AttendanceView.tsx)
Add the bulk action controls and manual refresh interface:
- Next to the "Select Event" dropdown or at the top of the check-in panel, introduce a premium button group or action bar.
- Action items:
  - 🔄 **Refresh** (calls hook `refresh()`) with smooth hover rotation.
  - ✅ **Mark All Present** (calls hook `setAllAttendance('Present')` with confirmation).
  - ❌ **Mark All Absent** (calls hook `setAllAttendance('Absent')` with confirmation).
  - ⏳ **Reset All** (calls hook `setAllAttendance('Pending')` with confirmation).
- Apply high-end visual design aligning with the app's premium CSS structure.

---

## Task Breakdown

### Task 1: Update useAttendance hook with Bulk Actions

**Files:**
- Modify: `src/hooks/useAttendance.ts`

- [ ] **Step 1: Add setAllAttendance implementation**
Modify `src/hooks/useAttendance.ts` to add the bulk updater method:
```typescript
  const setAllAttendance = async (next: 'Present' | 'Absent' | 'Pending') => {
    if (!eventId || items.length === 0) return;
    
    // Store original state for robust rollback
    const originalItems = [...items];
    
    // 1. Optimistic Update locally
    setItems(prev => prev.map(item => ({ ...item, attendance: next })));
    
    try {
      // 2. Perform parallel upserts to PocketBase
      const updatedRosters = await Promise.all(
        items.map(item => rosterService.upsertAttendance(eventId, item.profileId, next))
      );
      
      // 3. Map resulting record IDs back into local state
      const rosterMap = new Map(updatedRosters.map(r => [r.profile, r]));
      setItems(prev => prev.map(item => {
        const r = rosterMap.get(item.profileId);
        return {
          ...item,
          id: r?.id || item.id,
          rosterId: r?.id || item.rosterId,
          attendance: next
        };
      }));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update bulk attendance');
      // Revert to original state
      setItems(originalItems);
      throw err;
    }
  };
```
Return `setAllAttendance` from `useAttendance`.

---

### Task 2: Implement Checked-In Divider in CheckInList

**Files:**
- Modify: `src/components/admin/CheckInList.tsx`

- [ ] **Step 1: Partition and sort singers**
Modify [CheckInList.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/components/admin/CheckInList.tsx) to split and render `notCheckedIn` and `checkedIn` sections:
```tsx
  const notCheckedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance !== 'Present')
      .sort((a, b) => {
        const order = { 'Pending': 0, 'Absent': 1 };
        const aVal = order[a.attendance] ?? 0;
        const bVal = order[b.attendance] ?? 0;
        if (aVal !== bVal) return aVal - bVal;
        return a.name.localeCompare(b.name);
      });
  }, [items]);

  const checkedIn = useMemo(() => {
    return items
      .filter((item) => item.attendance === 'Present')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);
```

- [ ] **Step 2: Render Divider and Lists**
Update the return block of `CheckInList.tsx` to render the separate sections divided by a gorgeous divider when there are checked-in members:
```tsx
  return (
    <div className="flex-col" style={{ gap: '10px' }}>
      {/* 1. Unchecked / Absent List */}
      {notCheckedIn.map((item) => (
        <CheckInRow key={item.id} item={item} ... />
      ))}

      {/* 2. Checked-In Divider */}
      {checkedIn.length > 0 && (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: '30px 0 20px 0', 
            gap: '16px' 
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--border))' }}></div>
          <span 
            style={{ 
              fontSize: '0.8rem', 
              fontWeight: 800, 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em',
              backgroundColor: 'rgba(241, 245, 249, 0.8)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              backdropFilter: 'blur(4px)'
            }}
          >
            ✓ Checked In ({checkedIn.length})
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--border))' }}></div>
        </div>
      )}

      {/* 3. Checked-In List */}
      {checkedIn.map((item) => (
        <CheckInRow key={item.id} item={item} ... />
      ))}

      {items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <p className="text-muted text-sm">No active singers found in the roster.</p>
        </div>
      )}
    </div>
  );
```

---

### Task 3: Implement Bulk Action Buttons & Manual Refresh

**Files:**
- Modify: `src/views/admin/AttendanceView.tsx`

- [ ] **Step 1: Integrate Bulk Actions & Refresh**
Add the custom controls directly in the `AttendanceView` component. Create a gorgeous, responsive toolbar just above the filter section or check-in list:
- Provide confirmation dialogs before executing bulk actions using the existing `dialog` context to prevent accidental marks.
- Implement nice visual hover effects and responsive alignment.

---

## Verification Plan

### Automated Verification
- Run `npx tsc --noEmit` to ensure TypeScript compilation succeeds without errors.

### Manual / Browser Verification
- Load the **Attendance Check-in** page.
- Choose a rehearsal or performance event.
- Verify that checked-in singers (`Present`) are cleanly moved to the bottom under the premium divider, and unmarked/absent singers are at the top.
- Click **Mark All Present** bulk action and confirm it marks all loaded roster members.
- Click **Reset All** bulk action and confirm it unmarks all.
- Toggle individual rows and observe them dynamically slide or transition between the top (unchecked) and bottom (checked-in) groups.
- Click the 🔄 **Refresh** button and verify that it updates successfully.
