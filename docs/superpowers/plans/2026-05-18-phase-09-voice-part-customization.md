# Phase 9: Voice Part Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break hardcoded voice part dependencies to support alternative choir structures (e.g., TTBB).

**Architecture:** We will update `settingsService` to fetch and persist an array of voice part objects (label and full name) rather than hardcoded types.

**Tech Stack:** TypeScript, Vitest, Pocketbase.

---

### Task 1: Fetch Voice Parts Setting

**Files:**
- Create: `test/settingsService.test.ts`
- Modify: `src/services/settingsService.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/settingsService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getVoiceParts } from '../src/services/settingsService';
import { pb } from '../src/lib/pocketbase';

vi.mock('../src/lib/pocketbase', () => ({
  pb: { collection: () => ({ getFirstListItem: vi.fn().mockResolvedValue({ voiceParts: [{ label: 'S1', fullName: 'Soprano 1' }] }) }) }
}));

describe('getVoiceParts', () => {
  it('fetches voice parts from settings', async () => {
    const parts = await getVoiceParts();
    expect(parts[0].fullName).toBe('Soprano 1');
    expect(parts[0].label).toBe('S1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/settingsService.test.ts`
Expected: FAIL with "getVoiceParts is not a function"

- [ ] **Step 3: Write minimal implementation**

```typescript
// Add to src/services/settingsService.ts
import { pb } from '../lib/pocketbase';

export interface VoicePartDef {
  label: string;
  fullName: string;
}

export async function getVoiceParts(): Promise<VoicePartDef[]> {
  try {
    const settings = await pb.collection('app_settings').getFirstListItem('');
    return settings.voiceParts || [];
  } catch (error) {
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/settingsService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/settingsService.test.ts src/services/settingsService.ts
git commit -m "feat: support dynamic voice part definitions via settingsService"
```