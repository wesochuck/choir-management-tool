# Set List Announcement Gap & Multi-Movement Dedup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable announcement gap seconds to setlist duration totals, plus multi-movement dedup when all children of a parent work are present.

**Architecture:** New optional field `announcementGapSeconds` on Event model (migration + interface). Duration calculation in `setListItems.ts` updated to include gaps as a separate bucket. Multi-movement dedup detects "complete works" by checking if all library children of a parent are in the setlist, then counting parent duration once.

**Tech Stack:** React, TypeScript, PocketBase, pb_migrations

---

### Task 1: Migration + Event interface

**Files:**
- Create: `pocketbase/pb_migrations/1719600000_add_announcement_gap_to_events.js`
- Modify: `src/services/eventService.ts:20-44`

- [ ] **Step 1: Create migration script**

`pocketbase/pb_migrations/1719600000_add_announcement_gap_to_events.js`:
```js
/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  const existingField = events.fields.getByName("announcementGapSeconds");
  if (!existingField) {
    events.fields.add(
      new NumberField({
        name: "announcementGapSeconds",
        required: false,
        onlyInt: true,
        min: 0,
      })
    );
    app.save(events);
  }
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  const field = events.fields.getByName("announcementGapSeconds");
  if (field) {
    events.fields.removeByName("announcementGapSeconds");
    app.save(events);
  }
});
```

- [ ] **Step 2: Add field to Event interface**

In `src/services/eventService.ts`, add to the `Event` interface (after `durationMinutes`):
```ts
  durationMinutes?: number;
  announcementGapSeconds?: number;
```

- [ ] **Step 3: Verify typecheck**

Run: `rtk npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
rtk git add pocketbase/pb_migrations/1719600000_add_announcement_gap_to_events.js src/services/eventService.ts
rtk git commit -m "feat: add announcementGapSeconds field to Event model + migration"
```

---

### Task 2: Update duration totals with gaps + multi-movement dedup

**Files:**
- Modify: `src/lib/setList/setListItems.ts`

- [ ] **Step 1: Update `SetListDurationTotals` interface**

Add `gaps: string`:
```ts
export interface SetListDurationTotals {
  songs: string;
  intermissions: string;
  gaps: string;
  total: string;
}
```

- [ ] **Step 2: Update `calculateSetListDurationTotals()` signature**

Add optional param `announcementGapSeconds: number = 0`:
```ts
export function calculateSetListDurationTotals(
  items: SetListItem[],
  library: MusicPiece[],
  announcementGapSeconds: number = 0
): SetListDurationTotals {
```

- [ ] **Step 3: Add multi-movement dedup logic**

Inside `calculateSetListDurationTotals()`, before the existing loop:

```ts
  // Multi-movement dedup: detect complete works (all children of a parent in setlist)
  // Map parentId -> count of children in library
  const parentChildCount: Record<string, number> = {};
  const presentChildCount: Record<string, number> = {};
  const completeParents: Record<string, boolean> = {};

  library.forEach((p) => {
    if (p.parentId) {
      parentChildCount[p.parentId] = (parentChildCount[p.parentId] || 0) + 1;
    }
  });

  items.forEach((item) => {
    if (item.pieceId) {
      const piece = library.find((p) => p.id === item.pieceId);
      if (piece && piece.parentId) {
        presentChildCount[piece.parentId] = (presentChildCount[piece.parentId] || 0) + 1;
      }
    }
  });

  Object.keys(parentChildCount).forEach((parentId) => {
    completeParents[parentId] = parentChildCount[parentId] === (presentChildCount[parentId] || 0);
  });
```

- [ ] **Step 4: Update the existing loop to use dedup + add gaps**

Replace the existing `items.forEach(...)` block inside `calculateSetListDurationTotals()`:

```ts
  let songsSeconds = 0;
  let intermissionSeconds = 0;
  const addedParentDurations = new Set<string>();

  items.forEach((item) => {
    const linkedPiece = item.pieceId ? library.find((p) => p.id === item.pieceId) : null;
    let rawDuration = item.duration || linkedPiece?.duration || '';

    // Multi-movement dedup: skip individual movements when all children present
    if (
      linkedPiece &&
      linkedPiece.parentId &&
      completeParents[linkedPiece.parentId]
    ) {
      if (addedParentDurations.has(linkedPiece.parentId)) {
        return; // Already accounted for this parent
      }
      const parentPiece = library.find((p) => p.id === linkedPiece.parentId);
      if (parentPiece && parentPiece.duration) {
        rawDuration = parentPiece.duration;
      }
      addedParentDurations.add(linkedPiece.parentId);
    }

    const sec = parseDurationToSeconds(rawDuration);

    if (item.type === 'intermission') {
      intermissionSeconds += sec;
    } else {
      songsSeconds += sec;
    }
  });

  const numGaps = items.length > 1 ? items.length - 1 : 0;
  const totalGapSeconds = announcementGapSeconds * numGaps;

  return {
    songs: formatSecondsToDuration(songsSeconds),
    intermissions: formatSecondsToDuration(intermissionSeconds),
    gaps: formatSecondsToDuration(totalGapSeconds),
    total: formatSecondsToDuration(songsSeconds + intermissionSeconds + totalGapSeconds),
  };
```

- [ ] **Step 5: Verify typecheck**

Run: `rtk npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Run security audit**

Run: `rtk npm audit --audit-level=high`
Expected: "found 0 vulnerabilities"

- [ ] **Step 7: Commit**

```bash
rtk git add src/lib/setList/setListItems.ts
rtk git commit -m "feat: add announcement gaps + multi-movement dedup to setlist duration totals"
```

---

### Task 3: SetListView UI — announcement gap input

**Files:**
- Modify: `src/views/admin/SetListView.tsx`
- Modify: `src/views/admin/SetList.css` (if new CSS classes needed)

- [ ] **Step 1: Import `eventService` if not already imported**

The file already imports `eventService` at line 4. Verified.

- [ ] **Step 2: Add gap save helper**

Add after `handleToggleApproved` (after line 495):
```tsx
  const gapSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleAnnouncementGapChange = useCallback((seconds: number) => {
    if (gapSaveTimerRef.current) clearTimeout(gapSaveTimerRef.current);
    gapSaveTimerRef.current = setTimeout(async () => {
      if (!selectedEventId) return;
      setSaveStatus('saving');
      try {
        await eventService.updateEvent(selectedEventId, { announcementGapSeconds: seconds });
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to save announcement gap:', error);
        setSaveStatus('error');
      }
    }, 500);
  }, [selectedEventId]);
```

- [ ] **Step 3: Update duration totals call to pass gap**

Find line 51-53:
```tsx
  const durationTotals = useMemo(() => {
    return calculateSetListDurationTotals(items, library);
  }, [items, library]);
```

Replace with:
```tsx
  const durationTotals = useMemo(() => {
    return calculateSetListDurationTotals(items, library, selectedEvent?.announcementGapSeconds || 0);
  }, [items, library, selectedEvent?.announcementGapSeconds]);
```

- [ ] **Step 4: Add gap input in the duration header bar**

Find the header bar (lines 722-731):
```tsx
  {items.length > 0 && (
    <div className="flex-responsive sl-list-header-bar">
      <div className="flex-row sl-list-section">
        <span>🎼 Songs: {durationTotals.songs}</span>
        <span>⏸️ Intermissions: {durationTotals.intermissions}</span>
      </div>
      <span className="sl-list-section-title">
        ⏱️ Total: {durationTotals.total}
      </span>
    </div>
  )}
```

Replace with:
```tsx
  {items.length > 0 && (
    <div className="flex-responsive sl-list-header-bar">
      <div className="flex-row sl-list-section">
        <span>🎼 Songs: {durationTotals.songs}</span>
        <span>⏸️ Intermissions: {durationTotals.intermissions}</span>
        <span className="flex-row sl-gap-section">
          📢 Gaps:
          <input
            type="number"
            className="sl-gap-input"
            min={0}
            step={1}
            value={selectedEvent?.announcementGapSeconds ?? 0}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              handleAnnouncementGapChange(isNaN(val) ? 0 : val);
            }}
          />
          s × {Math.max(0, items.length - 1)} = {durationTotals.gaps}
        </span>
      </div>
      <span className="sl-list-section-title">
        ⏱️ Total: {durationTotals.total}
      </span>
    </div>
  )}
```

- [ ] **Step 5: Add CSS for the gap input**

In `src/views/admin/SetList.css`, add:
```css
.sl-gap-section {
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.sl-gap-input {
  width: 48px;
  padding: 2px 4px;
  font-size: 0.85em;
  text-align: center;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #333;
}
```

- [ ] **Step 6: Verify typecheck**

Run: `rtk npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Verify lint**

Run: `rtk npx eslint src/views/admin/SetListView.tsx src/lib/setList/setListItems.ts`
Expected: No errors.

- [ ] **Step 8: Run security audit**

Run: `rtk npm audit --audit-level=high`
Expected: "found 0 vulnerabilities"

- [ ] **Step 9: Commit**

```bash
rtk git add src/views/admin/SetListView.tsx src/views/admin/SetList.css src/lib/setList/setListItems.ts
rtk git commit -m "feat: add announcement gap UI in SetListView duration header bar"
```
