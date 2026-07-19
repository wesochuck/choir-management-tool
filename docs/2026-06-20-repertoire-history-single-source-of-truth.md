# Repertoire History: Single Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `events.setList` the single source of truth for piece-to-performance linking by removing the `musicLibrary.performances` relation field and replacing all reads with set list scanning.

**Architecture:** Currently the piece ↔ performance link is stored in two places (`events.setList` JSON and `musicLibrary.performances` relation field) with incomplete bidirectional sync. This plan removes the relation field entirely, making `events.setList` the authoritative store. Performance counts and last-performed dates are computed in `useMemo` by scanning all events' set lists.

**Tech Stack:** PocketBase (schema migration), React/TypeScript (frontend), Vitest (testing)

---

## Scope and Risk

**Files created:** 1 (migration)
**Files modified:** 14+
**Test files modified:** 4

**Key risk:** The `performances` field served as a fast reverse index. Without it, every "find performances for this piece" query requires O(pieces × events) scanning. Mitigated by precomputing a lookup map in `useMemo` from the already-loaded events data, so it runs only when events or library change.

## File Structure

```
Modified:
  pocketbase/pb_migrations/1720000000_remove_musiclibrary_performances.js   (NEW)
  src/types/musicLibrary.ts
  src/services/musicLibraryService.ts
  src/services/musicLibraryWorkflows.ts
  src/lib/music/performanceHistory.ts
  src/lib/music/libraryRows.ts
  src/lib/music/csv.ts
  src/views/admin/ReportsView.tsx
  src/views/admin/SetListView.tsx
  src/views/admin/MusicLibraryView.tsx
  src/views/admin/music-library/MusicPieceModal.tsx
  src/views/admin/music-library/MusicLibraryTable.tsx
  test/domain.test.ts
  test/performanceHistory.test.ts
  test/recencyFilter.test.ts
  test/libraryRows.test.ts
  test/helpers.ts
```

---

## Implementation Plan

### Task 1: Create PocketBase migration to remove `performances` field from `musicLibrary`

**Files:**
- Create: `pocketbase/pb_migrations/1720000000_remove_musiclibrary_performances.js`
- Verify: `pocketbase/pb_migrations/1715690000_initial.js:1890` (field definition to remove)

**Step 1: Write migration** that drops the `performances` relation field from the `musicLibrary` collection.

```js
migrate((app) => {
  const collection = app.dao().findCollectionByNameOrId('musicLibrary');
  const field = collection.fields.find((f) => f.name === 'performances');
  if (field) {
    collection.fields.remove(field);
    app.dao().saveCollection(collection);
  }
}, (app) => {
  // Revert: add the field back
  const collection = app.dao().findCollectionByNameOrId('musicLibrary');
  collection.fields.add(new RelationField({
    name: 'performances',
    collectionId: 'pbc_1687431684',
    maxSelect: 999,
    minSelect: 0,
    required: false,
    cascadeDelete: false,
  }));
  app.dao().saveCollection(collection);
});
```

**Step 2: Commit**

```bash
git add pocketbase/pb_migrations/1720000000_remove_musiclibrary_performances.js
git commit -m "feat: remove musicLibrary.performances relation field, setList is now single source of truth"
```

---

### Task 2: Update `MusicPiece` type to remove `performances`

**Files:**
- Modify: `src/types/musicLibrary.ts:12` — remove `performances?: string[]`
- Modify: `src/types/musicLibrary.ts:21` — remove `performances?: Event[]`

**Step 1: Edit the type file**

```ts
// Old lines 12, 20-23:
export interface MusicPiece extends RecordModel {
  title: string;
  composer?: string;
  arranger?: string;
  purchaseDate?: string;
  copies?: number;
  catalogId?: string;
  duration?: string;
  performances?: string[];   // ← REMOVE
  notes?: string;
  audioFiles?: string[];
  audioTrackMapping?: Record<string, string>;
  voicing?: string;
  sectionBuckets?: string[];
  genres?: string[];
  parentId?: string;
  expand?: {
    performances?: Event[];  // ← REMOVE
    parentId?: MusicPiece;
  };
}

// New:
export interface MusicPiece extends RecordModel {
  title: string;
  composer?: string;
  arranger?: string;
  purchaseDate?: string;
  copies?: number;
  catalogId?: string;
  duration?: string;
  notes?: string;
  audioFiles?: string[];
  audioTrackMapping?: Record<string, string>;
  voicing?: string;
  sectionBuckets?: string[];
  genres?: string[];
  parentId?: string;
  expand?: {
    parentId?: MusicPiece;
  };
}
```

**Step 2: Run compilation check**

```bash
rtk npx tsc --noEmit 2>&1 | head -50
```
Expected: Type errors in files that still reference `piece.performances`.

**Step 3: Commit**

```bash
git add src/types/musicLibrary.ts
git commit -m "refactor: remove performances field from MusicPiece type"
```

---

### Task 3: Create `usePiecePerformanceMap` hook

This hook builds an in-memory index from all events' set lists, mapping each `pieceId` to its performance data. This replaces the old `expand.performances` relation reads.

**Files:**
- Create: `src/hooks/usePiecePerformanceMap.ts`
- Test: `test/usePiecePerformanceMap.test.ts`

**Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPiecePerformanceMap } from '../src/hooks/usePiecePerformanceMap';
import type { Event, SetListItem } from '../src/services/eventService';

function makeEvent(overrides: Partial<Event> & { id: string; date: string }): Event {
  return {
    title: 'Test',
    type: 'Performance' as const,
    parentPerformanceId: '',
    details: '',
    collectionId: 'col',
    collectionName: 'events',
    created: '',
    updated: '',
    setList: [],
    ...overrides,
  } as Event;
}

describe('buildPiecePerformanceMap', () => {
  it('builds empty map when no events have matching pieceIds', () => {
    const events: Event[] = [makeEvent({ id: 'e1', date: '2026-01-01', setList: [] })];
    const map = buildPiecePerformanceMap(events);
    assert.strictEqual(map.size, 0);
  });

  it('records pieceId appearing in an event setList', () => {
    const events: Event[] = [
      makeEvent({
        id: 'e1',
        date: '2026-01-01T12:00:00Z',
        setList: [{ id: 's1', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
    ];
    const map = buildPiecePerformanceMap(events);
    const entry = map.get('p1');
    assert.ok(entry);
    assert.strictEqual(entry.count, 1);
    assert.strictEqual(entry.dates.length, 1);
  });

  it('counts multiple events for same pieceId', () => {
    const events: Event[] = [
      makeEvent({
        id: 'e1',
        date: '2026-01-01T12:00:00Z',
        setList: [{ id: 's1', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
      makeEvent({
        id: 'e2',
        date: '2026-06-01T12:00:00Z',
        setList: [{ id: 's2', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
    ];
    const map = buildPiecePerformanceMap(events);
    assert.strictEqual(map.get('p1')!.count, 2);
    assert.strictEqual(map.get('p1')!.dates.length, 2);
  });

  it('handles events without setList gracefully', () => {
    // Construct event without setList directly
    const eventWithoutSetList = {
      title: 'Test',
      type: 'Performance' as const,
      parentPerformanceId: '',
      details: '',
      collectionId: 'col',
      collectionName: 'events',
      created: '',
      updated: '',
      id: 'e1',
      date: '2026-01-01',
    } as unknown as Event;
    const map = buildPiecePerformanceMap([eventWithoutSetList]);
    assert.strictEqual(map.size, 0);
  });

  it('returns the most recent date correctly sorted', () => {
    const events: Event[] = [
      makeEvent({
        id: 'e1',
        date: '2026-01-01T12:00:00Z',
        setList: [{ id: 's1', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
      makeEvent({
        id: 'e2',
        date: '2026-06-01T12:00:00Z',
        setList: [{ id: 's2', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
    ];
    const map = buildPiecePerformanceMap(events);
    assert.strictEqual(map.get('p1')!.mostRecentDate, '2026-06-01');
  });

  it('handles pieceIds that are undefined (intermission items)', () => {
    const events: Event[] = [
      makeEvent({
        id: 'e1',
        date: '2026-01-01T12:00:00Z',
        setList: [
          { id: 's1', title: 'Intermission', type: 'intermission' },
        ] as SetListItem[],
      }),
    ];
    const map = buildPiecePerformanceMap(events);
    assert.strictEqual(map.size, 0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
rtk npx vitest run test/usePiecePerformanceMap.test.ts 2>&1 | tail -10
```
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```ts
// src/hooks/usePiecePerformanceMap.ts
import { useMemo } from 'react';
import type { Event } from '../services/eventService';

export interface PiecePerformanceEntry {
  count: number;
  dates: Date[];
  mostRecentDate: string | null;
}

export function buildPiecePerformanceMap(events: Event[]): Map<string, PiecePerformanceEntry> {
  const map = new Map<string, PiecePerformanceEntry>();

  for (const event of events) {
    if (!event.setList || !Array.isArray(event.setList)) continue;
    if (!event.date) continue;

    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) continue;

    for (const item of event.setList) {
      if (!item.pieceId) continue;

      let entry = map.get(item.pieceId);
      if (!entry) {
        entry = { count: 0, dates: [], mostRecentDate: null };
        map.set(item.pieceId, entry);
      }

      entry.count++;
      entry.dates.push(eventDate);

      const dateStr = eventDate.toISOString().split('T')[0];
      if (!entry.mostRecentDate || dateStr > entry.mostRecentDate) {
        entry.mostRecentDate = dateStr;
      }
    }
  }

  return map;
}

export function usePiecePerformanceMap(events: Event[]): Map<string, PiecePerformanceEntry> {
  return useMemo(() => buildPiecePerformanceMap(events), [events]);
}
```

**Step 4: Run test to verify it passes**

```bash
rtk npx vitest run test/usePiecePerformanceMap.test.ts 2>&1 | tail -10
```
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/hooks/usePiecePerformanceMap.ts test/usePiecePerformanceMap.test.ts
git commit -m "feat: add usePiecePerformanceMap hook for computing perf data from set lists"
```

---

### Task 4: Rewrite `performanceHistory.ts` to use set-list-based lookups

**Files:**
- Modify: `src/lib/music/performanceHistory.ts` — replace `expand.performances` reads with set-list scan
- Modify: `test/performanceHistory.test.ts` — update tests
- Modify: `test/recencyFilter.test.ts` — update tests

**Step 1: Rewrite `performanceHistory.ts`**

The functions no longer accept a piece with `expand.performances`. Instead they accept the `Map<string, PiecePerformanceEntry>` from the new hook.

```ts
import type { MusicPiece } from '../../types/musicLibrary';
import type { PiecePerformanceEntry } from '../../hooks/usePiecePerformanceMap';

export type PerformanceRecencyFilter =
  | 'all'
  | 'within-1-year'
  | 'within-2-years'
  | 'within-3-years'
  | 'not-within-3-years'
  | 'not-within-5-years'
  | 'never';

/**
 * Gets the most recent performance date as YYYY-MM-DD or null.
 * Reads from the precomputed performance map instead of expand.performances.
 */
export function getMostRecentPerformanceDate(
  piece: MusicPiece,
  perfMap: Map<string, PiecePerformanceEntry>
): string | null {
  const entry = perfMap.get(piece.id);
  return entry?.mostRecentDate ?? null;
}

/**
 * Resolves the effective most recent performance date, inheriting from parent if needed.
 */
export function getEffectiveMostRecentPerformanceDate(
  piece: MusicPiece,
  perfMap: Map<string, PiecePerformanceEntry>,
  allPieces: MusicPiece[] = []
): string | null {
  const ownDate = getMostRecentPerformanceDate(piece, perfMap);
  if (ownDate) return ownDate;

  if (!piece.parentId) return null;

  const parent = allPieces.find((candidate) => candidate.id === piece.parentId);
  return parent ? getMostRecentPerformanceDate(parent, perfMap) : null;
}

/**
 * Formats the performance history of a music piece.
 * Reads from the precomputed performance map instead of expand.performances.
 * Returns an array of formatted event title + date strings.
 */
export function formatPerformanceHistory(
  piece: MusicPiece,
  perfMap: Map<string, PiecePerformanceEntry>,
  events: Event[]
): string[] {
  const results: string[] = [];
  for (const event of events) {
    if (!event.setList || !Array.isArray(event.setList)) continue;
    if (!event.setList.some((item) => item.pieceId === piece.id)) continue;
    const dateStr = event.date ? new Date(event.date).toISOString().split('T')[0] : '';
    results.push(`${event.title}${dateStr ? ` (${dateStr})` : ''}`);
  }
  return results;
}
```

Note: `formatPerformanceHistory` now also needs the events array. Update its call site accordingly (only in domain.test.ts — it's not used in production).

**Step 2: Update test file `test/performanceHistory.test.ts`**

Replace all `piece.expand.performances` constructs with the new signature:

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMostRecentPerformanceDate,
  getEffectiveMostRecentPerformanceDate,
} from '../src/lib/music/performanceHistory';
import { buildPiecePerformanceMap } from '../src/hooks/usePiecePerformanceMap';
import { createMusicPieceFixture, createEventFixture } from './helpers';
import type { Event, SetListItem } from '../src/services/eventService';

describe('performanceHistory tests', () => {
  describe('getMostRecentPerformanceDate', () => {
    it('returns the newest own performance date', () => {
      const events = [
        { ...createEventFixture({ id: 'ev1', title: 'Perf 1', date: '2024-01-01T12:00:00Z', type: 'Performance' }), setList: [{ id: 's1', title: 'Song 1', pieceId: 'p1' }] },
        { ...createEventFixture({ id: 'ev2', title: 'Perf 2', date: '2026-06-14T12:00:00Z', type: 'Performance' }), setList: [{ id: 's2', title: 'Song 1', pieceId: 'p1' }] },
      ] as Event[];
      const perfMap = buildPiecePerformanceMap(events);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), '2026-06-14');
    });

    it('returns null when the piece has no performance entries', () => {
      const perfMap = buildPiecePerformanceMap([]);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), null);
    });

    it('ignores invalid performance dates', () => {
      const events = [
        { ...createEventFixture({ id: 'ev1', title: 'Perf 1', date: 'invalid-date', type: 'Performance' }), setList: [{ id: 's1', title: 'Song 1', pieceId: 'p1' }] },
        { ...createEventFixture({ id: 'ev2', title: 'Perf 2', date: '2026-06-14T12:00:00Z', type: 'Performance' }), setList: [{ id: 's2', title: 'Song 1', pieceId: 'p1' }] },
      ] as Event[];
      const perfMap = buildPiecePerformanceMap(events);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), '2026-06-14');
    });
  });

  describe('getEffectiveMostRecentPerformanceDate', () => {
    it('uses a movement\'s own last performed date when present', () => {
      const events = [
        { ...createEventFixture({ id: 'ev1', title: 'Perf 1', date: '2026-06-14T12:00:00Z', type: 'Performance' }), setList: [{ id: 's1', title: 'Parent', pieceId: 'parent' }] },
        { ...createEventFixture({ id: 'ev2', title: 'Perf 2', date: '2026-07-01T12:00:00Z', type: 'Performance' }), setList: [{ id: 's2', title: 'Child', pieceId: 'child' }] },
      ] as unknown as Event[];
      const perfMap = buildPiecePerformanceMap(events);
      const parent = createMusicPieceFixture({ id: 'parent', title: 'Parent Work' });
      const child = createMusicPieceFixture({ id: 'child', title: 'Child Movement', parentId: 'parent' });
      assert.strictEqual(getEffectiveMostRecentPerformanceDate(child, perfMap, [parent, child]), '2026-07-01');
    });

    it('falls back to parent last performed date for child movements without their own performance history', () => {
      const events = [
        { ...createEventFixture({ id: 'ev1', title: 'Perf 1', date: '2026-06-14T12:00:00Z', type: 'Performance' }), setList: [{ id: 's1', title: 'Parent', pieceId: 'parent' }] },
      ] as unknown as Event[];
      const perfMap = buildPiecePerformanceMap(events);
      const parent = createMusicPieceFixture({ id: 'parent', title: 'Parent Work' });
      const child = createMusicPieceFixture({ id: 'child', title: 'Child Movement', parentId: 'parent' });
      assert.strictEqual(getEffectiveMostRecentPerformanceDate(child, perfMap, [parent, child]), '2026-06-14');
    });

    it('returns null for child movements when neither child nor parent has performance history', () => {
      const perfMap = buildPiecePerformanceMap([]);
      const parent = createMusicPieceFixture({ id: 'parent', title: 'Parent Work' });
      const child = createMusicPieceFixture({ id: 'child', title: 'Child Movement', parentId: 'parent' });
      assert.strictEqual(getEffectiveMostRecentPerformanceDate(child, perfMap, [parent, child]), null);
    });
  });
});
```

**Step 3: Update test file `test/recencyFilter.test.ts`**

Replace all `piece.expand.performances` constructs to use the performance map.

For integration tests (buildVisibleMusicLibraryRows), the rows builder now needs to receive the performance map. Update the calls accordingly:

```ts
// Instead of passing piece with expand.performances, pass the perfMap:
// Old:
// buildVisibleMusicLibraryRows(allPieces, { recencyFilter: 'all', now })
//
// New: Need to pass events + build perfMap
const events = [/* events with setList */] as Event[];
const perfMap = buildPiecePerformanceMap(events);
buildVisibleMusicLibraryRows(allPieces, { recencyFilter: 'all', now }, events, perfMap);
```

The exact test changes depend on how `libraryRows.ts` signature changes (handled in Task 6).

**Step 4: Update test file `test/domain.test.ts`**

Remove the `formatPerformanceHistory` test or update it to the new signature.

**Step 5: Run tests to confirm**

```bash
rtk npx vitest run test/performanceHistory.test.ts test/recencyFilter.test.ts test/domain.test.ts 2>&1 | tail -15
```
Expected: Tests pass with updated assertions.

**Step 6: Commit**

```bash
git add src/lib/music/performanceHistory.ts test/performanceHistory.test.ts test/recencyFilter.test.ts test/domain.test.ts
git commit -m "refactor: performanceHistory now uses set-list-based perfMap instead of expand.performances"
```

---

### Task 5: Update `musicLibraryService` and `csv.ts`

**Files:**
- Modify: `src/services/musicLibraryService.ts:18` — remove `expand: 'performances'`
- Modify: `src/lib/music/csv.ts:61` — remove `performances: []`

**Step 1: Edit `musicLibraryService.ts`**

```ts
// line 18: old
expand: 'performances',
// new: remove the expand entirely, or change to ''
```

If there's no expand needed:
```ts
async getLibrary() {
  return await pb.collection('musicLibrary').getFullList<MusicPiece>({
    sort: 'title',
    // expand removed - performances no longer a relation field
  });
},
```

**Step 2: Edit `csv.ts`**

Remove `performances: []` from the parsed piece object (line 61).

**Step 3: Run compilation check**

```bash
rtk npx tsc --noEmit 2>&1 | head -50
```
Expected: Fewer errors than before.

**Step 4: Commit**

```bash
git add src/services/musicLibraryService.ts src/lib/music/csv.ts
git commit -m "refactor: remove performances expand from service, remove from CSV import"
```

---

### Task 6: Update `libraryRows.ts` to accept performance map

**Files:**
- Modify: `src/lib/music/libraryRows.ts` — accept `perfMap` and `events` parameters, use them for lastPerformed and performances sort
- Modify: `test/libraryRows.test.ts` — update test calls and assertions

**Step 1: Edit `libraryRows.ts`**

The `buildVisibleMusicLibraryRows` function currently accepts `MusicPiece[]` and options. Add `events: Event[]` or `perfMap: Map<string, PiecePerformanceEntry>` parameters.

Signature change:
```ts
export function buildVisibleMusicLibraryRows(
  pieces: MusicPiece[],
  options: LibraryRowsOptions,
  perfMap: Map<string, PiecePerformanceEntry>
): VisibleMusicLibraryRow[] {
```

Update the `lastPerformed` sort case to use `getEffectiveMostRecentPerformanceDate(p, perfMap, pieces)`.

Update the `performances` sort case:
```ts
case 'performances': {
  const countA = perfMap.get(a.id)?.count ?? 0;
  const countB = perfMap.get(b.id)?.count ?? 0;
  const comp = countA - countB;
  return sortDirection === 'asc' ? comp : -comp;
}
```

**Step 2: Find all call sites of `buildVisibleMusicLibraryRows`**

Call sites: `MusicLibraryView.tsx` — find and update to pass `perfMap`.

**Step 3: Update `test/libraryRows.test.ts`**

Change test calls to pass `perfMap`:
```ts
const perfMap = buildPiecePerformanceMap(events);
const rows = buildVisibleMusicLibraryRows(pieces, { sortField: 'performances', sortDirection: 'asc' }, perfMap);
```

**Step 4: Run tests**

```bash
rtk npx vitest run test/libraryRows.test.ts 2>&1 | tail -10
```

**Step 5: Commit**

```bash
git add src/lib/music/libraryRows.ts test/libraryRows.test.ts
git commit -m "refactor: libraryRows now uses perfMap instead of piece.performances"
```

---

### Task 7: Update `ReportsView.tsx` repertoire stats

**Files:**
- Modify: `src/views/admin/ReportsView.tsx:65-111` — remove Source 1 (expand.performances), use perfMap or just scan set lists

**Step 1: Edit ReportsView.tsx**

Replace the two-source counting approach with a single perfMap-based approach:

```tsx
// Old (lines 65-111):
const repertoireStats = useMemo(() => {
  if (library.length === 0) return [];
  const stats: RepertoireStats[] = [];
  library.forEach((piece) => {
    const dates: Date[] = [];
    // 1. Add historical dates from the linked performances  ← REMOVE
    if (piece.expand?.performances) { ... }
    // 2. Add dynamic dates from events where this piece is in the set list
    allEvents.forEach((event) => { ... });
    // ...
  });
}, [library, allEvents]);

// New:
const perfMap = usePiecePerformanceMap(allEvents);

const repertoireStats = useMemo(() => {
  if (library.length === 0) return [];
  const stats: RepertoireStats[] = [];
  library.forEach((piece) => {
    const entry = perfMap.get(piece.id);
    const dates = entry?.dates ?? [];
    stats.push({
      piece,
      totalPerformances: entry?.count ?? 0,
      lastPerformed: entry?.mostRecentDate ? new Date(entry.mostRecentDate) : null,
      allDates: dates,
    });
  });

  return stats.sort((a, b) => {
    if (a.lastPerformed && b.lastPerformed) {
      return b.lastPerformed.getTime() - a.lastPerformed.getTime();
    }
    if (a.lastPerformed) return -1;
    if (b.lastPerformed) return 1;
    return a.piece.title.localeCompare(b.piece.title);
  });
}, [library, perfMap]);
```

**Step 2: Run compilation check**

```bash
rtk npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/views/admin/ReportsView.tsx
git commit -m "refactor: ReportsView uses perfMap instead of dual-source counting"
```

---

### Task 8: Update `MusicLibraryView.tsx` — remove bidirectional sync code

**Files:**
- Modify: `src/views/admin/MusicLibraryView.tsx` — remove bidirectional sync when saving piece (lines 321-354), remove same for new piece (lines 380-399)
- Modify: Update `pieceSaveMutation` to strip `performances` from save payload

**Step 1: Remove `libraryRows.ts` call site update**

In `MusicLibraryView.tsx`, find where `buildVisibleMusicLibraryRows` is called and update to pass `perfMap`.

Also import `usePiecePerformanceMap` and `useEvents` if not already imported.

**Step 2: Remove the bidirectional sync code blocks**

Lines 321-354 for editing an existing piece — the block that appends to set lists for newly-linked performance IDs. Since the `performances` field no longer exists, there's nothing to sync.

Lines 380-399 for creating a new piece — same pattern.

**Step 3: Strip `performances` from save payload**

Find where `pieceSaveMutation` uses `data.performances` and remove those references.

**Step 4: Commit**

```bash
git add src/views/admin/MusicLibraryView.tsx
git commit -m "refactor: remove bidirectional sync code, performances field no longer exists"
```

---

### Task 9: Update `MusicPieceModal.tsx` — change performances tab to use set list scanning

**Files:**
- Modify: `src/views/admin/music-library/MusicPieceModal.tsx`

**Step 1: Replace performances tab data source**

The "Linked Performances" tab currently reads `piece.performances` (the relation field) and initializes `selectedPerformanceIds` from it.

New approach:
- The modal receives `perfMap` as a prop (or computes it via `usePiecePerformanceMap` + `useEvents`).
- `selectedPerformanceIds` is initialized by scanning events' set lists for matching `pieceId`.
- When the user toggles a performance on/off, instead of updating a `performances` field, the modal adds/removes the piece from the event's set list by calling `eventService.updateEvent(eventId, { setList: updatedSetList })`.

**Step 2: Wire up the new approach**

```tsx
// When piece is loaded:
useEffect(() => {
  if (piece && events.length > 0) {
    const linkedIds: string[] = [];
    for (const event of events) {
      if (event.setList?.some((item) => item.pieceId === piece.id)) {
        linkedIds.push(event.id);
      }
    }
    setSelectedPerformanceIds(linkedIds);
  }
}, [piece, events]);
```

```tsx
const updateEventMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) =>
    eventService.updateEvent(id, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
});

const togglePerformance = async (perfId: string, event: Event) => {
  const isLinked = selectedPerformanceIds.includes(perfId);
  try {
    if (isLinked) {
      // Remove piece from event's set list
      const updatedSetList = (event.setList || []).filter(
        (item) => item.pieceId !== piece?.id
      );
      await updateEventMutation.mutateAsync({ id: perfId, data: { setList: updatedSetList } });
      setSelectedPerformanceIds((prev) => prev.filter((id) => id !== perfId));
    } else if (piece) {
      // Add piece to event's set list
      const newItem: SetListItem = {
        id: window.crypto.randomUUID(),
        title: piece.title,
        pieceId: piece.id,
        composer: piece.composer,
      };
      const updatedSetList = [...(event.setList || []), newItem];
      await updateEventMutation.mutateAsync({ id: perfId, data: { setList: updatedSetList } });
      setSelectedPerformanceIds((prev) => [...prev, perfId]);
    }
  } catch (error) {
    console.error('Failed to toggle performance set list link:', error);
  }
};
```

Also remove `performances: selectedPerformanceIds` from `buildSavePayload()` (line 727).

**Step 3: Commit**

```bash
git add src/views/admin/music-library/MusicPieceModal.tsx
git commit -m "refactor: MusicPieceModal performances tab scans set lists directly"
```

---

### Task 10: Update `MusicLibraryTable.tsx` — change Perf column data source

**Files:**
- Modify: `src/views/admin/music-library/MusicLibraryTable.tsx`

**Step 1: Change the performances column**

The component receives the `perfMap` as a prop (or computes it from events). Change the `accessorFn` and `cell` to read from `perfMap.get(row.id)?.count ?? 0` instead of `row.performances?.length`.

```tsx
{
  id: 'performances',
  header: 'Perf',
  accessorFn: (row) => perfMap.get(row.id)?.count ?? 0,
  enableSorting: true,
  cell: ({ row }) => {
    const count = perfMap.get(row.original.id)?.count ?? 0;
    return count > 0 ? (
      <span className="font-semibold">{count}</span>
    ) : (
      '-'
    );
  },
  meta: { align: 'center', cardSection: 1, cardSide: 'right', cardLabel: 'Perf' },
},
```

**Step 2: Commit**

```bash
git add src/views/admin/music-library/MusicLibraryTable.tsx
git commit -m "refactor: MusicLibraryTable Perf column uses perfMap"
```

---

### Task 11: Update `SetListView.tsx` — remove performances field writes, remove bidirectional sync

**Files:**
- Modify: `src/views/admin/SetListView.tsx`

**Step 1: Remove `handleInlineAddItem` bidirectional sync (lines 424-438)**

Remove the block that updates `piece.performances` after adding an inline item. The set list save already persists the `setList` JSON, which is the single source of truth.

**Step 2: Remove `handleDelete` cleanup (no cleanup needed anymore)**

The `handleDelete` function only needs to update the set list (already done via `updateItems`). No need to clean up any `performances` field.

**Step 3: Remove `performances` forwarding on piece creation (lines 229-234)**

When creating a new piece from the SetListView, the `performances` array in `pieceData` should be removed.

```ts
// Old:
const pieceData = {
  ...rest,
  performances:
    rest.performances && rest.performances.length > 0
      ? rest.performances
      : performanceIdToLink
        ? [performanceIdToLink]
        : [],
};

// New:
const pieceData = { ...rest };
```

**Step 4: Commit**

```bash
git add src/views/admin/SetListView.tsx
git commit -m "refactor: SetListView no longer writes to performances field"
```

---

### Task 12: Update `musicLibraryWorkflows.ts` — remove `performances: []`

**Files:**
- Modify: `src/services/musicLibraryWorkflows.ts:46`

**Step 1: Remove `performances: []` from movement creation payload**

```ts
// Old line 46:
performances: [],
// Remove this line entirely
```

**Step 2: Commit**

```bash
git add src/services/musicLibraryWorkflows.ts
git commit -m "refactor: remove performances: [] from movement creation"
```

---

### Task 13: Final compilation check and full test run

**Step 1: Run TypeScript compilation check**

```bash
rtk npx tsc --noEmit 2>&1
```
Expected: No errors.

**Step 2: Run full test suite**

```bash
rtk npx vitest run 2>&1 | grep -E "(Test Files|Tests|failed)" | tail -5
```
Expected: All tests pass.

**Step 3: Generate PocketBase hooks (if migration affects hooks)**

```bash
rtk npm run generate:pb-hooks && rtk npm run check:pb-hooks
```
Expected: No changes needed (hooks don't reference `musicLibrary.performances`).

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: make events.setList single source of truth, remove musicLibrary.performances"
```

---

## Verification Summary

| Check | What to run | Expected |
|-------|-------------|----------|
| TypeScript | `rtk npx tsc --noEmit` | No errors |
| Unit tests | `rtk npx vitest run` | 171 files, all passing |
| ESLint | `rtk node_modules/.bin/eslint --no-warn-ignored --max-warnings 0 src/` | 0 warnings |
| PB hooks | `rtk npm run check:pb-hooks` | No errors |

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Performance regression for library view (scanning all set lists) | Medium | Perf map is computed in `useMemo`, keyed on `events` identity. For 200 pieces × 100 events × 20 set list items = 400k iterations, still sub-millisecond. |
| Existing data with `performances` populated in PocketBase | High | Migration drops the field — data loss is intentional. Users should verify counts after migration. |
| Forgetting a call site that reads `piece.performances` | Medium | TypeScript compilation will catch all `performances` references. Each was tracked above. |
| MusicPieceModal togglePerformance becomes async (needs to update event.setList) | Low | Convert `togglePerformance` from synchronous state update to async with API call. Add loading state and error handling. |
