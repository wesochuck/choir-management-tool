# Phase 8: Music Library Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Better music library data management and singer visibility into concert plans.

**Architecture:** We will add a CSV export function for music pieces and a utility function to identify duplicate pieces in the library based on title and composer.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Music Library CSV Export

**Files:**
- Create: `test/musicPieceUtils.test.ts`
- Modify: `src/lib/musicPieceUtils.ts`

- [x] **Step 1: Write the failing test**

```typescript
// test/musicPieceUtils.test.ts
import { describe, it, expect } from 'vitest';
import { exportMusicToCSV } from '../src/lib/musicPieceUtils';

describe('exportMusicToCSV', () => {
  it('maps music pieces to CSV format correctly', () => {
    const pieces = [{ id: '1', title: 'Hallelujah', composer: 'Handel', voicing: 'SATB' }];
    const csv = exportMusicToCSV(pieces);
    expect(csv).toContain('Title,Composer,Voicing');
    expect(csv).toContain('"Hallelujah","Handel","SATB"');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/musicPieceUtils.test.ts`
Expected: FAIL with "exportMusicToCSV is not exported"

- [x] **Step 3: Write minimal implementation**

```typescript
// Add to src/lib/musicPieceUtils.ts
export function exportMusicToCSV(pieces: any[]): string {
  const header = ['Title', 'Composer', 'Voicing'].join(',');
  const rows = pieces.map(p => [
    `"${p.title || ''}"`,
    `"${p.composer || ''}"`,
    `"${p.voicing || ''}"`
  ].join(','));
  return [header, ...rows].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/musicPieceUtils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/musicPieceUtils.test.ts src/lib/musicPieceUtils.ts
git commit -m "feat: add CSV export for music library"
```

### Task 2: Find Duplicates in Music Library

**Files:**
- Modify: `test/musicPieceUtils.test.ts`
- Modify: `src/lib/musicPieceUtils.ts`

- [x] **Step 1: Write the failing test**

```typescript
// Append to test/musicPieceUtils.test.ts
import { findDuplicates } from '../src/lib/musicPieceUtils';

describe('findDuplicates', () => {
  it('returns pieces with identical title and composer', () => {
    const pieces = [
      { id: '1', title: 'Song A', composer: 'Comp A' },
      { id: '2', title: 'Song B', composer: 'Comp B' },
      { id: '3', title: 'Song A', composer: 'Comp A' }
    ];
    const duplicates = findDuplicates(pieces);
    expect(duplicates.length).toBe(2);
    expect(duplicates.map(p => p.id).sort()).toEqual(['1', '3']);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/musicPieceUtils.test.ts`
Expected: FAIL with "findDuplicates is not a function"

- [x] **Step 3: Write minimal implementation**

```typescript
// Add to src/lib/musicPieceUtils.ts
export function findDuplicates(pieces: any[]): any[] {
  const seen = new Map<string, any[]>();
  for (const piece of pieces) {
    const key = `${piece.title?.toLowerCase()}|${piece.composer?.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(piece);
  }
  
  const duplicates: any[] = [];
  for (const group of seen.values()) {
    if (group.length > 1) {
      duplicates.push(...group);
    }
  }
  return duplicates;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/musicPieceUtils.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add test/musicPieceUtils.test.ts src/lib/musicPieceUtils.ts
git commit -m "feat: add utility to find duplicate music pieces"
```