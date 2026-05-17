# Seating Drag-and-Drop and Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve seating chart editor by locking sidebar height, enabling drag-unassign sidebar target, implementing seat-to-seat singer swaps, and creating a 1.45x fisheye magnifying zoom on hover.

**Architecture:** Update `assignSinger` hook to handle swapping when target seat is occupied. Restructure Unassigned sidebar layout to be a flex column with a fixed height and scrollable list acting as drop target. Add drag state and neighbor scaling formulas in `SeatingGrid` with smooth CSS transitions.

**Tech Stack:** React, TypeScript, Vanilla CSS.

---

### Task 1: Update Hook `assignSinger` for Swap

**Files:**
- Modify: `src/hooks/useSeatingChart.ts`

- [ ] **Step 1: Modify `assignSinger` implementation to support swapping**

In [useSeatingChart.ts](file:///Users/wesosborn/Downloads/choir-management-tool/src/hooks/useSeatingChart.ts), replace the existing `assignSinger` implementation:

```typescript
  const assignSinger = async (seatKey: string, profileId: string, fromSeatKey?: string) => {
    if (!venue || !performanceId) return;
    
    const newAssignments = { ...optimisticAssignmentsRef.current };
    
    if (profileId) {
      // If target seat is already occupied by a different singer and we dragged from another seat:
      if (fromSeatKey && newAssignments[seatKey] && newAssignments[seatKey] !== profileId) {
        const occupantId = newAssignments[seatKey];
        newAssignments[fromSeatKey] = occupantId; // Move occupant to the source seat (Swap!)
      } else {
        // Normal duplicate prevention (remove singer from any other seat)
        Object.keys(newAssignments).forEach(key => {
          if (newAssignments[key] === profileId) {
            delete newAssignments[key];
          }
        });
      }
      newAssignments[seatKey] = profileId;
    } else {
      // Unassign target seat
      delete newAssignments[seatKey];
    }

    queueChartSave({ assignments: newAssignments });
  };
```

- [ ] **Step 2: Commit changes**

Run:
```bash
git add src/hooks/useSeatingChart.ts
git commit -m "feat(seating): implement seat-to-seat singer swap logic in hook"
```

---

### Task 2: Lock Sidebar Height & Scroll

**Files:**
- Modify: `src/views/admin/SeatingView.tsx`

- [ ] **Step 1: Refactor the Unassigned sidebar container layout**

In [SeatingView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/SeatingView.tsx), update the Unassigned `AppCard` and list containers:

```tsx
          <AppCard className="no-print" style={{ 
            width: '320px', 
            position: 'sticky', 
            top: 'var(--space-lg)',
            height: 'calc(100vh - 140px)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}>
            <h3 className="text-headline" style={{ marginBottom: 'var(--space-md)' }}>Unassigned</h3>
            <div className="flex-col" style={{ gap: 'var(--space-sm)', overflowY: 'auto', paddingRight: '4px', flex: 1 }}>
              {activeProfiles
                .filter(p => !Object.values(optimisticAssignments).includes(p.id))
                .sort((a, b) => a.voicePart.localeCompare(b.voicePart))
                .map(p => (
                  <div 
                    key={p.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ profileId: p.id }))}
                    className="flex-row"
                    style={{ 
                      padding: 'var(--space-sm) var(--space-md)', 
                      backgroundColor: 'var(--bg)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-md)', 
                      cursor: 'grab',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span className="text-label" style={{ fontWeight: 600 }}>{p.name}</span>
                    <span className="badge badge-rehearsal">{p.voicePart}</span>
                  </div>
                ))}
              {activeProfiles.filter(p => !Object.values(optimisticAssignments).includes(p.id)).length === 0 && (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                  <p className="text-muted text-sm">All singers assigned!</p>
                </div>
              )}
            </div>
          </AppCard>
```

- [ ] **Step 2: Commit changes**

Run:
```bash
git add src/views/admin/SeatingView.tsx
git commit -m "style(seating): lock unassigned sidebar height and make list scrollable to prevent layout shifts"
```

---

### Task 3: Sidebar Drop Target for Unassigning

**Files:**
- Modify: `src/views/admin/SeatingView.tsx`

- [ ] **Step 1: Add drag-over and drop handlers on the Unassigned sidebar**

In [SeatingView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/SeatingView.tsx), add `onDragOver` and `onDrop` attributes on the sidebar `AppCard` to handle drag unassignment:

```tsx
          <AppCard className="no-print" 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.fromSeatKey) {
                  assignSinger(data.fromSeatKey, '');
                }
              } catch (err) {
                console.error('Failed to parse sidebar drop data', err);
              }
            }}
            style={{ 
              width: '320px', 
              position: 'sticky', 
              top: 'var(--space-lg)',
              height: 'calc(100vh - 140px)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              border: '2px dashed var(--border)'
            }}
          >
```

- [ ] **Step 2: Commit changes**

Run:
```bash
git add src/views/admin/SeatingView.tsx
git commit -m "feat(seating): support dragging singer from seat to sidebar to unassign"
```

---

### Task 4: Interactive Fisheye Zoom Styling

**Files:**
- Modify: `src/components/admin/SeatingGrid.tsx`

- [ ] **Step 1: Add drag-over state and handlers to SeatingGrid**

In [SeatingGrid.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/components/admin/SeatingGrid.tsx), add the `activeDragOver` state and a helper function to calculate neighbor relations:

```typescript
  const [activeDragOver, setActiveDragOver] = useState<string | null>(null);

  const getIsNeighbor = (hoveredKey: string | null, targetKey: string) => {
    if (!hoveredKey) return false;
    const [r1, s1] = hoveredKey.split('-').map(Number);
    const [r2, s2] = targetKey.split('-').map(Number);
    return r1 === r2 && Math.abs(s1 - s2) === 1;
  };
```

- [ ] **Step 2: Update the seat container drag/hover event handlers**

Update the seat element inside the row layout in `SeatingGrid.tsx`:

```tsx
            const isHovered = seatKey === activeDragOver;
            const isNeighbor = getIsNeighbor(activeDragOver, seatKey);
            
            // Adjust scaling factors
            const scale = isHovered ? 1.45 : (isNeighbor ? 1.22 : 1.0);
            const translateY = isHovered ? -8 : (isNeighbor ? -4 : 0);
            const zIndex = isHovered ? 10 : (isNeighbor ? 5 : 1);
            const boxShadow = isHovered ? 'var(--shadow-lg)' : (isNeighbor ? 'var(--shadow-sm)' : 'none');

            return (
              <div 
                key={seatKey} 
                onDragOver={(e) => {
                  if (!isReadOnly) {
                    e.preventDefault();
                  }
                }}
                onDragEnter={() => !isReadOnly && setActiveDragOver(seatKey)}
                onDragLeave={() => !isReadOnly && setActiveDragOver(null)}
                onDrop={(e) => {
                  if (!isReadOnly) {
                    e.preventDefault();
                    setActiveDragOver(null);
                    handleDrop(e, seatKey);
                  }
                }}
                draggable={!isReadOnly && !!assignedProfile}
                onDragStart={(e) => !isReadOnly && assignedProfile && handleDragStart(e, assignedProfile.id, seatKey)}
                title={assignedProfile ? `${assignedProfile.name} (${assignedProfile.voicePart})` : `Empty Seat ${suggestion}${seatIndex + 1}`}
                className={`flex-col seat-cell ${assignedProfile ? 'seat-assigned' : 'seat-empty'}`}
                style={{ 
                  width: `${seatSize}px`, 
                  height: `${seatSize}px`, 
                  backgroundColor: profileId ? colors.bg : 'var(--surface)',
                  borderTop: `1px solid ${profileId ? colors.text : colors.bg}`,
                  borderBottom: `1px solid ${profileId ? colors.text : colors.bg}`,
                  borderLeft: hasLeftBorder ? `3px solid ${colors.text}` : `1px solid ${profileId ? colors.text : colors.bg}`,
                  borderRight: hasRightBorder ? `3px solid ${colors.text}` : `1px solid ${profileId ? colors.text : colors.bg}`,
                  borderRadius: 'var(--radius-md)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: fontSize,
                  position: 'relative',
                  cursor: isReadOnly ? 'default' : (assignedProfile ? 'grab' : 'pointer'),
                  boxShadow: boxShadow,
                  flexShrink: 0,
                  gap: 0,
                  transform: `scale(${scale}) translateY(${translateY}px)`,
                  zIndex: zIndex,
                  transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease-in-out, background-color 0.2s, border-color 0.2s'
                }}
              >
```

- [ ] **Step 3: Run build and tests**

Run:
```bash
npm run build
npm test
```
Expected: All compilation succeeds, and 8 unit tests pass successfully.

- [ ] **Step 4: Commit changes**

Run:
```bash
git add src/components/admin/SeatingGrid.tsx
git commit -m "feat(seating): implement interactive fisheye zoom magnifier scaling on seat cells and same-row neighbors"
```
