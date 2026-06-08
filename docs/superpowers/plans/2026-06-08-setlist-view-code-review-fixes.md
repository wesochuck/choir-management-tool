# SetListView Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 9 code review fixes to `src/views/admin/SetListView.tsx` — XSS hardening, dialog confirmations, optimistic rollback, stale closure fixes, cleanup, and error handling.

**Architecture:** All 9 fixes are contained within a single file (`SetListView.tsx`). Fixes are ordered from most critical (security) to least. Each task is independent and can be committed atomically.

**Tech Stack:** React 18, TypeScript, PocketBase JS SDK, @dnd-kit/core

---

## Pre-flight Checklist

Before any implementation, verify current state:

- [ ] Run `rtk npx tsc --noEmit` to confirm no pre-existing TypeScript errors
- [ ] Run `rtk npm run lint` to confirm no pre-existing lint errors
- [ ] Read the full current file to have the latest content

---

### Task 1: Fix XSS — Escape user data in print HTML template

**Files:**
- Modify: `src/views/admin/SetListView.tsx` (import + lines 129-291)

**Context:** `handlePrintList` constructs a full HTML document via template literals. `displayTitle`, `displayComposer`, `selectedEvent.title`, and venue name are injected without HTML escaping. A `<script>` tag in any of these persisted fields would execute in the print window.

- [ ] **Step 1: Add `escapeHtml` import**

At line 19 (after the existing `../../lib/setList/setListItems` import), add:

```tsx
import { escapeHtml } from '../../lib/textSafety';
```

- [ ] **Step 2: Apply escaping in `handlePrintList`**

In `handlePrintList` (lines 153-172), wrap all dynamic text with `escapeHtml()`. Replace the existing `itemsHTML` logic:

```tsx
    const safeEventTitle = escapeHtml(selectedEvent.title || selectedEvent.type);
    const safeVenue = escapeHtml(selectedEvent.expand?.venue?.name || '');

    let songIndex = 1;
    const itemsHTML = itemsWithDetails.map((item) => {
      if (item.type === 'intermission') {
        return `
          <div class="printable-setlist-intermission">
            ${escapeHtml(item.displayTitle || 'Intermission')}
          </div>
        `;
      } else {
        const safeComposer = escapeHtml(item.displayComposer || '');
        const composerHTML = safeComposer
          ? `<span class="printable-setlist-composer">${safeComposer}</span>`
          : '';
        const el = `
          <div class="printable-setlist-item">
            <span class="printable-setlist-title">${songIndex}. ${escapeHtml(item.displayTitle)}</span>
            ${composerHTML}
          </div>
        `;
        songIndex++;
        return el;
      }
    }).join('');
```

Then in the HTML template body (lines 178-289), replace the title and venue references:

```tsx
          <title>Set List: ${safeEventTitle}</title>
```

```tsx
              <h2 class="printable-title">${safeEventTitle}</h2>
```

```tsx
                ${dateStr} at ${timeStr} ${safeVenue ? ` | ${safeVenue}` : ''}
```

- [ ] **Step 3: Verify**

Run: `rtk npx tsc --noEmit`
Expected: No new TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "fix: escape user data in printable set list HTML template (XSS)"
```

---

### Task 2: Add delete confirmation dialog

**Files:**
- Modify: `src/views/admin/SetListView.tsx` (lines 545-548)

**Context:** AGENTS.md requires destructive actions to use `dialog.confirm` with `variant: 'danger'` and clear action labels. `handleDelete` currently removes items immediately with no confirmation.

- [ ] **Step 1: Replace `handleDelete`**

Replace lines 545-548:

```tsx
  const handleDelete = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Remove Item',
      message: 'Are you sure you want to remove this item from the set list?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (confirmed) {
      const newItems = items.filter(i => i.id !== id);
      await updateItems(newItems);
    }
  };
```

- [ ] **Step 2: Verify**

Run: `rtk npx tsc --noEmit`
Expected: No new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "fix: require dialog confirmation before deleting set list items"
```

---

### Task 3: Add optimistic rollback on save failure

**Files:**
- Modify: `src/views/admin/SetListView.tsx` (lines 526-528)

**Context:** `updateItems` optimistically sets state then fire-and-forgets `saveSetList`. If the save fails, the UI shows stale optimistic data that vanishes on refresh. Must await and rollback.

- [ ] **Step 1: Replace `updateItems` to be async with rollback**

Replace lines 526-528:

```tsx
  const updateItems = async (newItems: SetListItem[]): Promise<boolean> => {
    const previousItems = items;
    setItems(newItems);
    const success = await saveSetList(newItems);
    if (!success) {
      setItems(previousItems);
    }
    return success;
  };
```

- [ ] **Step 2: Update `handleInlineAddItem` to use the new return value**

Lines 560-583: `handleInlineAddItem` already checks the return value with `const savedSetList = await saveSetList(...)`. Replace the internal call pattern to use `updateItems`'s return value directly. Replace lines 560-583:

```tsx
  const handleInlineAddItem = async (item: SetListItem) => {
    const nextItems = [...items, item];
    const success = await updateItems(nextItems);
    if (!success) return;

    const performanceIdToLink = getPerformanceIdForSetListLibraryLink(selectedEvent);
    if (item.pieceId && performanceIdToLink) {
      try {
        const piece = library.find(p => p.id === item.pieceId);
        if (piece) {
          const currentPerfs = piece.performances || [];
          if (!currentPerfs.includes(performanceIdToLink)) {
            const updatedPerfs = [...currentPerfs, performanceIdToLink];
            await musicLibraryService.updatePiece(piece.id, { performances: updatedPerfs });
            const updatedLib = await musicLibraryService.getLibrary();
            setLibrary(updatedLib);
          }
        }
      } catch (err) {
        console.error('Failed to auto-link performance on inline add:', err);
      }
    }
  };
```

- [ ] **Step 3: Update `handleDragEnd` to await `updateItems`**

Lines 550-558: Make `handleDragEnd` async and await the call:

```tsx
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      await updateItems(newItems);
    }
  };
```

- [ ] **Step 4: Verify**

Run: `rtk npx tsc --noEmit`
Expected: No new TypeScript errors. Verify the `handleDragEnd` change is compatible with `@dnd-kit/core`'s `DragEndEvent` callback type.

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "fix: rollback optimistic state on set list save failure"
```

---

### Task 4: Fix stale `selectedEventId` in debounced gap save + cleanup

**Files:**
- Modify: `src/views/admin/SetListView.tsx` (lines 507-524, add cleanup effect)

**Context:** `handleAnnouncementGapChange` captures `selectedEventId` in `useCallback` closure. If user modifies gap then switches events before the 500ms debounce fires, the save targets the wrong event. Also no cleanup of the timer on unmount.

- [ ] **Step 1: Add a ref for `selectedEventId` and cleanup effect**

Add a new ref alongside the existing `gapSaveTimerRef` (after line 507):

```tsx
  const selectedEventIdRef = useRef(selectedEventId);
```

- [ ] **Step 2: Add a synchronization effect for the ref and timer cleanup**

Add two effects after the existing `eventsRef` sync effect (after line 444). Before the items-loading effect:

```tsx
  useEffect(() => {
    selectedEventIdRef.current = selectedEventId;
  }, [selectedEventId]);

  useEffect(() => {
    return () => {
      if (gapSaveTimerRef.current) clearTimeout(gapSaveTimerRef.current);
    };
  }, []);
```

- [ ] **Step 3: Replace `handleAnnouncementGapChange` to use the ref**

Replace lines 509-524:

```tsx
  const handleAnnouncementGapChange = useCallback((seconds: number) => {
    setLocalGapSeconds(seconds);
    if (gapSaveTimerRef.current) clearTimeout(gapSaveTimerRef.current);
    gapSaveTimerRef.current = setTimeout(async () => {
      const eventId = selectedEventIdRef.current;
      if (!eventId) return;
      setSaveStatus('saving');
      try {
        await eventService.updateEvent(eventId, { announcementGapSeconds: seconds });
        await refresh();
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to save announcement gap:', error);
        setSaveStatus('error');
      }
    }, 500);
  }, [refresh]);
```

- [ ] **Step 4: Verify**

Run: `rtk npx tsc --noEmit`
Expected: No new TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "fix: prevent stale event ID in debounced gap save; cleanup timer on unmount"
```

---

### Task 5: Fix `hasDefaultedRef` not set when no matching event

**Files:**
- Modify: `src/views/admin/SetListView.tsx` (lines 446-459)

**Context:** `hasDefaultedRef.current` is only set inside `if (resolved)`, so when no future performance exists, the effect re-runs on every deps change.

- [ ] **Step 1: Move ref set outside conditional**

Replace lines 446-459:

```tsx
  useEffect(() => {
    if (events.length > 0 && !selectedEventId && !hasDefaultedRef.current) {
      hasDefaultedRef.current = true;
      const urlEventId = searchParams.get('eventId');
      const resolved = resolveInitialEventId(events, urlEventId, {
        futureOnly: true,
        type: 'Performance'
      });
      
      if (resolved) {
        setSelectedEventId(resolved);
      }
    }
  }, [events, selectedEventId, searchParams]);
```

- [ ] **Step 2: Verify**

Run: `rtk npx tsc --noEmit`
Expected: No change in behavior, no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "fix: set hasDefaultedRef unconditionally to prevent repeated effect runs"
```

---

### Task 6: Extract inline `onDelete` chain to named async function

**Files:**
- Modify: `src/views/admin/SetListView.tsx` (line 833)

**Context:** The `MusicPieceModal`'s `onDelete` prop at line 833 is a complex inline `.then().then().then(() => {})` chain that's unreadable and silently swallows errors.

- [ ] **Step 1: Add `handleDeleteLibraryPiece` function**

Add before the return statement (e.g., after `handleSaveLibraryPiece` at line 440):

```tsx
  const handleDeleteLibraryPiece = async () => {
    if (!libraryEditingPiece) return;
    try {
      await musicLibraryService.deletePiece(libraryEditingPiece.id);
      setIsLibraryModalOpen(false);
      const updatedLib = await musicLibraryService.getLibrary();
      setLibrary(updatedLib);
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete the music piece.',
        variant: 'danger',
      });
    }
  };
```

- [ ] **Step 2: Replace inline `onDelete` on `MusicPieceModal`**

At line 833, replace the inline `onDelete`:

```tsx
        onClose={...}
        onSave={handleSaveLibraryPiece}
        onDelete={libraryEditingPiece ? handleDeleteLibraryPiece : undefined}
```

- [ ] **Step 3: Verify**

Run: `rtk npx tsc --noEmit`
Expected: No new TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "refactor: extract inline onDelete chain to named function with error handling"
```

---

### Task 7: Add `noopener,noreferrer` to `window.open` calls

**Files:**
- Modify: `src/views/admin/SetListView.tsx` (lines 129, 334)

**Context:** Opening `_blank` windows without `noopener` allows the opened page to access `window.opener`, enabling tab-nabbing attacks. Established pattern across the codebase.

- [ ] **Step 1: Fix print window open (line 129)**

Replace line 129:

```tsx
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
```

- [ ] **Step 2: Fix player link open (line 334)**

Replace line 334:

```tsx
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
```

- [ ] **Step 3: Verify**

Run: `rtk npx tsc --noEmit`
Expected: No new TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "fix: add noopener,noreferrer to window.open calls for tab-nabbing protection"
```

---

### Task 8: Clean up `setTimeout` in `handleCopyList`

**Files:**
- Modify: `src/views/admin/SetListView.tsx` (line 121, add ref + cleanup effect)

**Context:** `handleCopyList` sets a `setTimeout` to clear the `copied` state after 2 seconds. If the component unmounts within that window, it triggers a state update on an unmounted component.

- [ ] **Step 1: Add a ref for the copy timeout**

Near the other refs (after line 33, alongside `hasDefaultedRef`):

```tsx
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
```

- [ ] **Step 2: Add cleanup effect**

In the cleanup effect already added for `gapSaveTimerRef` (from Task 4, Step 2), add the copy timer cleanup. Update the effect to:

```tsx
  useEffect(() => {
    return () => {
      if (gapSaveTimerRef.current) clearTimeout(gapSaveTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);
```

- [ ] **Step 3: Replace `handleCopyList` to use ref**

Replace lines 116-125:

```tsx
  const handleCopyList = async () => {
    const text = getPlainText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      console.error('Failed to copy text: ', err);
    }
  };
```

- [ ] **Step 4: Verify**

Run: `rtk npx tsc --noEmit`
Expected: No new TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "fix: clean up copy timer on unmount to prevent state update on unmounted component"
```

---

### Task 9: Remove fragile `eventsRef` synchronization pattern

**Files:**
- Modify: `src/views/admin/SetListView.tsx` (lines 442-444, 476-488)

**Context:** The items-loading effect reads `events` from a ref instead of including it in the dependency array. This pattern relies on React's declaration ordering being correct — if the order of effects changes, it breaks silently.

- [ ] **Step 1: Remove the `eventsRef` sync effect**

Delete lines 442-444:

```tsx
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
```

Also remove the `eventsRef` declaration on line 33:

```tsx
  const eventsRef = useRef(events);
```

- [ ] **Step 2: Update items-loading effect to use `events` directly from deps**

Replace lines 476-488:

```tsx
  useEffect(() => {
    if (selectedEventId) {
      const ev = events.find(e => e.id === selectedEventId);
      setItems(ev?.setList || []);
      setLocalGapSeconds(ev?.announcementGapSeconds ?? 0);
      setLocalApproved(ev?.setListApproved !== false);
    } else {
      setItems([]);
      setLocalGapSeconds(0);
      setLocalApproved(true);
    }
    setSaveStatus(null);
  }, [selectedEventId, events]);
```

- [ ] **Step 3: Update `handleToggleApproved` to not use `eventsRef`**

At line 501-503, `handleToggleApproved` reads `eventsRef.current` on revert. Replace with `events`:

```tsx
      const ev = events.find(e => e.id === selectedEventId);
```

- [ ] **Step 4: Verify**

Run: `rtk npx tsc --noEmit`
Expected: No new TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "refactor: remove fragile eventsRef pattern, use events in dependency array"
```

---

## Final Verification

After all tasks are complete:

- [ ] Run `rtk npx tsc --noEmit` — should pass with zero errors
- [ ] Run `rtk npm run lint` — should pass with zero errors
- [ ] Run `rtk npm audit --audit-level=high` — should report zero high-severity vulnerabilities
- [ ] Manual review: confirm the import block at the top of `SetListView.tsx` is clean and organized
