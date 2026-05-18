# Phase 10: Events, Venues & Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smarter defaults and stronger data integrity for event management.

**Architecture:** We will add dependency checking to `venueService` to ensure venues with linked events cannot be accidentally deleted.

**Tech Stack:** TypeScript, Vitest, Pocketbase.

---

### Task 1: Venue Dependency Check

**Files:**
- Create: `test/venueService.test.ts`
- Modify: `src/services/venueService.ts` (or create if missing)

- [x] **Step 1: Write the failing test**

```typescript
// test/venueService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { checkVenueDependencies } from '../src/services/venueService';
import { pb } from '../src/lib/pocketbase';

vi.mock('../src/lib/pocketbase', () => ({
  pb: { collection: () => ({ getList: vi.fn().mockResolvedValue({ totalItems: 1 }) }) }
}));

describe('checkVenueDependencies', () => {
  it('returns true if venue has linked events', async () => {
    const hasEvents = await checkVenueDependencies('venue_1');
    expect(hasEvents).toBe(true);
    expect(pb.collection('events').getList).toHaveBeenCalledWith(1, 1, expect.objectContaining({
      filter: `venue="venue_1"`
    }));
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/venueService.test.ts`
Expected: FAIL with "checkVenueDependencies is not a function"

- [x] **Step 3: Write minimal implementation**

```typescript
// Create or modify src/services/venueService.ts
import { pb } from '../lib/pocketbase';

export async function checkVenueDependencies(venueId: string): Promise<boolean> {
  const result = await pb.collection('events').getList(1, 1, {
    filter: `venue="${venueId}"`,
  });
  return result.totalItems > 0;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/venueService.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add test/venueService.test.ts src/services/venueService.ts
git commit -m "feat: add dependency check to prevent deleting linked venues"
```