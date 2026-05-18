# Phase 7: Roster & Profile Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve roster management with photo support, CSV exports, and default filtering.

**Architecture:** We will extend `profileService.ts` to support CSV generation and multipart form data for photo uploads. We will also add a default status setting in `settingsService.ts`.

**Tech Stack:** TypeScript, Vitest, Pocketbase.

---

### Task 1: Profile CSV Export

**Files:**
- Create: `test/profileService.test.ts`
- Modify: `src/services/profileService.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/profileService.test.ts
import { describe, it, expect } from 'vitest';
import { exportToCSV } from '../src/services/profileService';

describe('Profile CSV Export', () => {
  it('maps profiles to CSV format correctly', () => {
    const profiles = [{ id: '1', name: 'John Doe', email: 'john@example.com', phone: '123', voicePart: 'T1', globalStatus: 'Active' }];
    const csv = exportToCSV(profiles);
    expect(csv).toContain('Name,Email,Phone,Voice Part,Status');
    expect(csv).toContain('"John Doe","john@example.com","123","T1","Active"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/profileService.test.ts`
Expected: FAIL with "exportToCSV is not a function"

- [ ] **Step 3: Write minimal implementation**

```typescript
// Add to src/services/profileService.ts
export function exportToCSV(profiles: any[]): string {
  const header = ['Name', 'Email', 'Phone', 'Voice Part', 'Status'].join(',');
  const rows = profiles.map(p => [
    `"${p.name || ''}"`,
    `"${p.email || ''}"`,
    `"${p.phone || ''}"`,
    `"${p.voicePart || ''}"`,
    `"${p.globalStatus || ''}"`
  ].join(','));
  return [header, ...rows].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/profileService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/profileService.test.ts src/services/profileService.ts
git commit -m "feat: add CSV export functionality to profileService"
```

### Task 2: Profile Photo Upload

**Files:**
- Modify: `test/profileService.test.ts`
- Modify: `src/services/profileService.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Append to test/profileService.test.ts
import { vi } from 'vitest';
import { pb } from '../src/lib/pocketbase';
import { updateProfilePhoto } from '../src/services/profileService';

vi.mock('../src/lib/pocketbase', () => ({
  pb: { collection: () => ({ update: vi.fn().mockResolvedValue({ id: '1', photo: 'photo.jpg' }) }) }
}));

describe('updateProfilePhoto', () => {
  it('calls pocketbase with FormData', async () => {
    const formData = new FormData();
    formData.append('photo', new Blob(['test'], { type: 'image/jpeg' }));
    const result = await updateProfilePhoto('1', formData);
    expect(result.photo).toBe('photo.jpg');
    expect(pb.collection('profiles').update).toHaveBeenCalledWith('1', formData);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/profileService.test.ts`
Expected: FAIL with "updateProfilePhoto is not a function"

- [ ] **Step 3: Write minimal implementation**

```typescript
// Add to src/services/profileService.ts
import { pb } from '../lib/pocketbase';

export async function updateProfilePhoto(id: string, formData: FormData) {
  return await pb.collection('profiles').update(id, formData);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/profileService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/profileService.test.ts src/services/profileService.ts
git commit -m "feat: support profile photo upload via FormData"
```