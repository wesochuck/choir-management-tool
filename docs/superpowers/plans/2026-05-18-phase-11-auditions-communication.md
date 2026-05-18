# Phase 11: Auditions & Communication Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix audition conversion and unify the communication history.

**Architecture:** We will fix the field mappings in `convertAuditionToSinger` within `auditionService.ts` to ensure data properly maps to a new Profile.

**Tech Stack:** TypeScript, Vitest, Pocketbase.

---

### Task 1: Fix Audition to Singer Conversion

**Files:**
- Create: `test/auditionService.test.ts`
- Modify: `src/services/auditionService.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/auditionService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { convertAuditionToSinger } from '../src/services/auditionService';
import { pb } from '../src/lib/pocketbase';

vi.mock('../src/lib/pocketbase', () => ({
  pb: { collection: () => ({ create: vi.fn().mockResolvedValue({ id: 'profile_1' }) }) }
}));

describe('convertAuditionToSinger', () => {
  it('creates profile with correct data from audition', async () => {
    const audition = { id: 'a1', name: 'Singer', email: 's@test.com', phone: '123', voicePart: 'S1' };
    const result = await convertAuditionToSinger(audition as any);
    
    expect(pb.collection('profiles').create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Singer',
      email: 's@test.com',
      phone: '123',
      voicePart: 'S1',
      globalStatus: 'Active'
    }));
    expect(result.id).toBe('profile_1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/auditionService.test.ts`
Expected: FAIL or type error because `convertAuditionToSinger` does not map the correct fields.

- [ ] **Step 3: Write minimal implementation**

```typescript
// Add or modify in src/services/auditionService.ts
import { pb } from '../lib/pocketbase';

export async function convertAuditionToSinger(audition: any) {
  const profileData = {
    name: audition.name,
    email: audition.email || '',
    phone: audition.phone || '',
    voicePart: audition.voicePart || '',
    globalStatus: 'Active',
    // ...any other necessary defaults
  };
  
  return await pb.collection('profiles').create(profileData);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/auditionService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/auditionService.test.ts src/services/auditionService.ts
git commit -m "fix: correctly map fields when converting audition to singer"
```