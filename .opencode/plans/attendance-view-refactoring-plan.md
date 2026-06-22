# AttendanceView Refactoring Plan

**Target:** `src/views/admin/AttendanceView.tsx` — 699 lines → ~250 lines

## Problem

Single component mixing data fetching (4 queries, complex missCounts query), inline
grouping/sorting/filtering logic, and ~400 lines of JSX with multiple distinct UI
sections (event switcher, progress bar, filter pills, sectioned roster list, declined
rescue).

## Split Overview

```
src/views/admin/attendance/
  useAttendanceData.ts        ~150 lines  — queries, memos (eventStats, missCounts, grouped, filtered)
  getSingerSection.ts         ~30 lines   — voice part → section label utility
  AttendanceEventSwitcher.tsx ~80 lines   — collapsible inline event selector
  AttendanceProgressBar.tsx   ~25 lines   — attendance progress bar + count
  AttendanceFilterPills.tsx   ~20 lines   — filter pill buttons
  AttendanceSingerRow.tsx     ~40 lines   — individual singer row
  AttendanceSectionGroup.tsx  ~20 lines   — section header + members
  AttendanceDeclinedRescue.tsx ~40 lines  — declined singer rescue control
```

**Import note:** Extracted files at `src/views/admin/attendance/` need one extra
`../` segment. Originals like `../../lib/queryKeys` become `../../../lib/queryKeys`.

---

## `src/views/admin/attendance/useAttendanceData.ts`

Extract:

- State: `selectedEventId`, `setSelectedEventId`, `filter`, `selectedDeclinedProfileId`
- Queries: `rosterSettingsQuery`, `allRostersQuery`, `missCountsQuery`
- Memos: `activeSingersCount`, `eventStats`, `missCounts`, `selectedEvent`,
  `expectedSingers`, `declinedSingers`, `expectedCount`, `presentCount`,
  `sortedEvents`, `filteredSingers`, `grouped`
- Handlers: `handleSetAttendance`, `handleRescueDeclined`
- `hasDefaultedRef` + initial event effect

Returns:

```ts
{
  selectedEventId, setSelectedEventId,
  selectedEvent, events, profiles,
  voiceParts, sections, timezone,
  items, isLoading, error, refresh,
  expectedSingers, declinedSingers,
  expectedCount, presentCount,
  filteredSingers, grouped,
  eventStats, missCounts, maxRehearsalMisses,
  sortedEvents, filter, setFilter,
  selectedDeclinedProfileId, setSelectedDeclinedProfileId,
  handleSetAttendance, handleRescueDeclined,
}
```

## `src/views/admin/attendance/getSingerSection.ts`

Standalone utility extracted from lines 263–289.

## Sub-components

Each extracts its respective JSX block from the render function, receiving only
what it needs as props.

### `AttendanceEventSwitcher.tsx` (lines 346–447)

### `AttendanceProgressBar.tsx` (lines 450–469)

### `AttendanceFilterPills.tsx` (lines 472–487)

### `AttendanceSingerRow.tsx` (lines 523–631)

Uses `CheckIcon`, `XMarkIcon` from `../../../components/ui/icons`.
Receives callback `onSetAttendance`, `onQuickActions`.

### `AttendanceDeclinedRescue.tsx` (lines 639–673)

## Final `AttendanceView.tsx`

```tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance } from '../../hooks/useAttendance';
import { useProfiles } from '../../hooks/useProfiles';
import { useDialog } from '../../contexts/DialogContext';
import { useRateLimitRetryToast } from '../../hooks/useRateLimitRetryToast';
import { SingerModal } from '../../components/admin/SingerModal';
import { AttendanceSingerActionsSheet } from '../../components/admin/AttendanceSingerActionsSheet';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AppCard } from '../../components/common/AppCard';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useAttendanceData } from './attendance/useAttendanceData';
import { AttendanceEventSwitcher } from './attendance/AttendanceEventSwitcher';
import { AttendanceProgressBar } from './attendance/AttendanceProgressBar';
import { AttendanceFilterPills } from './attendance/AttendanceFilterPills';
import { AttendanceSectionGroup } from './attendance/AttendanceSectionGroup';
import { AttendanceDeclinedRescue } from './attendance/AttendanceDeclinedRescue';

export default function AttendanceView() {
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  const { timezone } = useChoirSettings();
  const { events } = useEvents();
  const { profiles, editProfile } = useProfiles();
  const { voiceParts, sections } = useVoiceParts();
  const { onRetry, reset } = useRateLimitRetryToast(...);
  const attendance = useAttendance(selectedEventId, { onRateLimitRetry: onRetry });
  const data = useAttendanceData(events, profiles, searchParams, attendance, voiceParts, sections);

  return (
    <div className="flex w-full flex-col gap-6 pb-8">
      <AdminPageHeader title="Attendance Check-in" ... />
      <AppCard noPadding>
        <AttendanceEventSwitcher ... />
        <AttendanceProgressBar ... />
        <AttendanceFilterPills ... />
        {Object.entries(data.grouped).map(([section, members]) => (
          <AttendanceSectionGroup key={section} section={section} members={members} ... />
        ))}
        <AttendanceDeclinedRescue ... />
      </AppCard>
      <AttendanceSingerActionsSheet ... />
      <SingerModal ... />
    </div>
  );
}
```

## Lessons Learned from Previous Refactors

- **Strict Type Fallbacks:** When hook interfaces explicitly promise `Type | null` (like `selectedEvent`), ensure any `.find()` or `?.` property access includes a strict `|| null` fallback. TypeScript will otherwise infer `Type | undefined` and fail compilation.
- **Closure Property Narrowing:** TypeScript does not narrow object properties across closure boundaries. If passing a conditionally present object property to an event handler, include an inline truthiness check (e.g., `onClick={() => data.selectedEvent && handler(data.selectedEvent)}`).
- **Explicit Event Typings:** When extracting components with form inputs or selects (e.g., `AttendanceEventSwitcher`), explicitly type the `onChange` event parameters (e.g., `(e: React.ChangeEvent<HTMLSelectElement>)`) to avoid `implicit any` TypeScript errors.
- **Import Path Depth Validation:** When extracting files to `src/views/admin/attendance/`, carefully verify every import path. Ensure paths reaching `services`, `lib`, `hooks`, `contexts`, and `components/ui` have the correct number of `../` segments.

## Verification

```bash
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
rtk npx tsc --noEmit --pretty
rtk npx vitest run
```
