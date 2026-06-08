# Set List Announcement Gap & Multi-Movement Dedup

## Problem

Admins need to account for announcements/patter between setlist items (songs, intermissions) when computing total performance duration. Multi-movement works added as separate items should not count each movement individually when all children of a parent work are present.

## Non-Goals

- `Event.durationMinutes` (the admin-entered event duration) must never be modified
- No visual spacer rows between items in the drag-and-drop setlist
- No new `SetListItem` type (no `'announcement'` type)
- No changes to `EventModal` or event creation/edit forms

## Data Layer

### Event interface (`src/services/eventService.ts`)

Add optional field:
```ts
announcementGapSeconds?: number;
```

Persisted to the `events` PocketBase collection as a numeric column. Loaded/saved via existing `eventService.updateEvent()` — same mechanics as `setListApproved`.

### Migration

New migration script in `pocketbase/pb_migrations/` adding the column.

## Duration Totals (`src/lib/setList/setListItems.ts`)

### `SetListDurationTotals` interface

Add `gaps: string` property. `total` becomes `songs + intermissions + gaps`.

### `calculateSetListDurationTotals()` changes

Accepts optional param `announcementGapSeconds: number = 0`.

Gap calculation:
```
numGaps = max(0, items.length - 1)
totalGapSeconds = announcementGapSeconds × numGaps
gaps = formatSecondsToDuration(totalGapSeconds)
```

Multi-movement dedup inside same function:
1. For each item, look up its `pieceId` in `library` to get the `MusicPiece`
2. If the piece has a `parentId`, it's a child movement — find the parent via `library.find(p => p.id === piece.parentId)`
3. Get all children of that parent from library (all pieces with `parentId === parent.id`)
4. Check if ALL children are present among the current setlist items (matching by `pieceId`)
5. If yes (complete work) AND parent has its own `duration`: count parent's duration once, skip each movement's individual duration when summing
6. If not all children present, or parent has no duration: count each movement individually (existing behavior)

### `resolveSetListDisplayRows()` unchanged

Individual rows still show raw cumulative timestamps from each item's duration. Gaps do not appear in per-row cumulative times. The totals bar is the only place where gaps and dedup are reflected.

This is intentional: the conductor uses row timestamps for rehearsal pacing, and the header bar shows the "real" total including scheduling overhead.

## UI: SetListView header bar

### Input

A number input `<input type="number" min="0" step="1" />` appears next to the "Gaps" label in the duration totals bar. Bound to `selectedEvent.announcementGapSeconds || 0`. Saves on change with debounce (same auto-save pattern as setlist items — `updateItems` -> `saveSetList` flow). Uses existing `eventService.updateEvent()`.

### Display

```
🎼 Songs: 32:15  ⏸️ Intermissions: 15:00  📢 Gaps: [30]s × 8 = 4:00  ⏱️ Total: 51:15
```

- `[30]` is the editable number input
- `8` is `items.length - 1` (auto-calculated, read-only display)
- `4:00` is `formatSecondsToDuration(30 × 8)`
- `Total` is `songs + intermissions + gaps`

The entire bar wraps responsively — on narrow screens the sections stack.

### State handling

- `selectedEvent.announcementGapSeconds` may be `undefined` — treat as `0`
- Saved on every change (debounced 500ms), same as `setListApproved` toggle
- When gap changes, only `eventService.updateEvent(eventId, { announcementGapSeconds })` is called — `setList` is NOT re-saved
- `saveStatus` ('saved'/'saving'/'error') already exists in the view and will reflect save success

## Interaction with Other Features

- **Communication `{setlist}` placeholder**: Gap is a scheduling detail, not part of the song program. The `{setlist}` placeholder renders only setlist items (song titles, composers, durations). Gap information is NOT included in the placeholder — it's purely a total-duration calculation tool for the admin.
- **Print/Copy**: No gap info in printed/copied set lists. Those are program references, not scheduling tools.
- **Singer Dashboard**: Gap is invisible. Singers see the approved setlist items only.

## Open Questions

None (resolved during brainstorming).

## Future Considerations

- If per-gap control is needed later, add an `announcementSeconds` field to `SetListItem` and handle it in the per-row cumulative logic
- If gap data is needed in communications, a separate placeholder like `{eventTotalDuration}` could be added
