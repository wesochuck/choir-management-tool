# Phase 04: Attendance Flagging & Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Performance Cycle" attendance tracking system to flag singers who miss rehearsals and facilitate communication with them.

**Architecture:** Aggregates attendance data client-side by identifying the current "Performance Cycle" (time since the last Performance event, max 90-day lookback). Extends settings to include thresholds and message templates.

**Tech Stack:** React, PocketBase, TypeScript.

---

### Task 1: Settings & Service Infrastructure

**Files:**
- Modify: `src/services/settingsService.ts`
- Modify: `src/views/admin/SettingsView.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update `settingsService.ts` with `AttendanceSettings`.**

```typescript
export interface AttendanceSettings {
  threshold: number;
  warning: number;
  warningTemplate: string;
  dangerTemplate: string;
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  threshold: 3,
  warning: 2,
  warningTemplate: "Hi {singerName}, we missed you! You've missed {missCount} rehearsals this cycle. Hope to see you soon!",
  dangerTemplate: "Hi {singerName}, you've missed {missCount} rehearsals. Please contact the director regarding your status for the upcoming performance.",
};
```

Update `settingsService` methods to handle the `attendance` key.

- [ ] **Step 2: Add UI to `SettingsView.tsx`.**
Add a new section for "Attendance Policy" with inputs for thresholds and templates.

- [ ] **Step 3: Add `badge-warning` to `App.css`.**

```css
.badge-warning {
  background-color: var(--color-warning);
  color: var(--color-warning-text);
}
```

- [ ] **Step 4: Commit settings infrastructure.**
```bash
git add src/services/settingsService.ts src/views/admin/SettingsView.tsx src/App.css
git commit -m "feat(attendance): add settings infrastructure and warning styles"
```

### Task 2: Attendance Stats Aggregation Hook

**Files:**
- Create: `src/hooks/useAttendanceStats.ts`
- Test: `test/attendance.test.ts`

- [ ] **Step 1: Write a test for cycle detection and aggregation.**
Ensure it handles the 90-day lookback limit and correctly filters by `Absent` status.

- [ ] **Step 2: Implement `useAttendanceStats` hook with batch fetching.**

```typescript
import { useState, useEffect, useMemo } from 'react';
import { useEvents } from './useEvents';
import { pb } from '../lib/pocketbase';
import type { EventRoster } from '../services/rosterService';

export const useAttendanceStats = () => {
  const { events } = useEvents();
  const [rosterData, setRosterData] = useState<EventRoster[]>([]);
  
  // Logic:
  // 1. lastPerformance = max(date) where type === 'Performance' and date < Now
  // 2. lookbackLimit = Now - 90 days
  // 3. cycleStart = max(lastPerformance.date, lookbackLimit)
  // 4. BATCH FETCH: pb.collection('eventRosters').getFullList({
  //      filter: `attendance = "Absent" && event.date >= "${cycleStart}" && event.type = "Rehearsal"`
  //    })
  // 5. Return map: profileId -> count
};
```

- [ ] **Step 3: Commit hook.**
```bash
git add src/hooks/useAttendanceStats.ts test/attendance.test.ts
git commit -m "feat(attendance): add useAttendanceStats hook with batch fetching and lookback limits"
```

### Task 3: Global Roster Integration

**Files:**
- Modify: `src/views/admin/RosterView.tsx`
- Modify: `src/components/admin/RosterTable.tsx`

- [ ] **Step 1: Update `RosterTable.tsx` to display stats and dual alert buttons.**
Add "Misses" column.
Add separate "📧" (Email) and "📱" (SMS) buttons for flagged singers.

- [ ] **Step 2: Update `RosterView.tsx` with filtering logic.**
Add the "Attendance" filter dropdown and integrate `useAttendanceStats`.

- [ ] **Step 3: Implement `handleAlert(type: 'email' | 'sms', profile, count)` function.**

- [ ] **Step 4: Commit UI changes.**
```bash
git add src/views/admin/RosterView.tsx src/components/admin/RosterTable.tsx
git commit -m "feat(attendance): integrate flagging and dual-channel alert actions"
```

### Task 4: Verification

- [ ] **Step 1: Verify in browser.**
Check that misses are counted correctly relative to the last performance or 90-day limit.
Verify that filters correctly isolate "Flagged" and "Warning" singers.
Verify that Email/SMS buttons open correctly with pre-filled content.

- [ ] **Step 2: Final commit.**
```bash
git commit -m "chore(attendance): final polish for attendance flagging feature"
```

