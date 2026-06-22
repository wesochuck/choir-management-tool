# PublicRsvpView Refactoring Plan

**Target:** `src/views/PublicRsvpView.tsx` — 613 lines → ~200 lines

## Problem

Single component mixing data fetching (2 queries, 1 mutation, 3 effects),
3 inline render functions (`renderEventCard`, `renderRehearsalsList`, `renderNoteSection`),
and 3 visual state branches (loading, error, success) with 3 sub-branches within success
(read-only, unconfirmed, confirmed). Token parsing is also inline.

## Split Overview

```
src/views/public-rsvp/
  useRsvpData.ts                 ~90 lines   — queries, mutation, token parsing, effects
  RsvpEventCard.tsx              ~55 lines   — event details card
  RsvpRehearsalsList.tsx         ~50 lines   — rehearsal accordion
  RsvpNoteSection.tsx            ~20 lines   — note textarea
  RsvpReadOnlyView.tsx           ~50 lines   — read-only RSVP display
  RsvpUnconfirmedView.tsx        ~65 lines   — initial RSVP confirmation
  RsvpConfirmedView.tsx          ~110 lines  — confirmed state with change option
```

**Import note:** Extracted files at `src/views/public-rsvp/` need one extra `../`
segment. Original imports like `../components/common/AppCard` become
`../../components/common/AppCard`.

---

## `src/views/public-rsvp/useRsvpData.ts`

Extract from `PublicRsvpView.tsx`:

- Token parsing from searchParams (lines 38–43)
- `EventDetails`, `ProfileDetails` interfaces
- `detailsQuery`, `timezoneQuery`, `quickRsvpMutation`
- Effects: token validation, data loading, error handling (lines 111–148)
- `handleConfirmRsvp` handler (lines 150–190)
- `handleDownloadCalendar` (lines 192–196)
- Derived: `event`, `profile`, `rehearsals`, `timezone`, `rsvpWindow`, `rsvpTitle`

Returns:

```ts
{
  token: string
  status: 'loading' | 'success' | 'error'
  errorMessage: string
  event: EventDetails | null
  profile: ProfileDetails | null
  rehearsals: EventDetails[]
  timezone: string
  rsvpWindow: { canSubmit, isReadOnly, reason }
  selectedRsvp: 'Yes' | 'No'
  setSelectedRsvp: (v: 'Yes' | 'No') => void
  dbRsvp: 'Yes' | 'No' | 'Pending'
  rsvpNote: string
  setRsvpNote: (v: string) => void
  isConfirmed: boolean
  quickRsvpMutation: UseMutationResult
  handleConfirmRsvp: (rsvp: 'Yes' | 'No', note?: string) => Promise<void>
  handleDownloadCalendar: () => void
}
```

## Sub-components

### `RsvpEventCard.tsx` (lines 198–249)

Props:

```ts
{
  event: EventDetails
  timezone: string
  titleClass?: string
}
```

Imports: `formatInTimezone` from `../../lib/timezone`

### `RsvpRehearsalsList.tsx` (lines 251–303)

Props:

```ts
{
  rehearsals: EventDetails[]
  timezone: string
}
```

### `RsvpNoteSection.tsx` (lines 305–320)

Props:

```ts
{
  eventType?: string
  selectedRsvp: 'Yes' | 'No'
  rsvpNote: string
  onNoteChange: (v: string) => void
  textareaClass?: string
}
```

### `RsvpReadOnlyView.tsx` (lines 383–436)

Renders the read-only RSVP view. Uses `RsvpEventCard`, `RsvpRehearsalsList`.

### `RsvpUnconfirmedView.tsx` (lines 437–499)

Renders the initial RSVP confirmation flow. Uses `RsvpEventCard`, `RsvpRehearsalsList`, `RsvpNoteSection`.

### `RsvpConfirmedView.tsx` (lines 500–607)

Renders the confirmed state with change option. Uses `RsvpEventCard`, `RsvpRehearsalsList`, `RsvpNoteSection`.

## Final `PublicRsvpView.tsx`

```tsx
import { useSearchParams } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useDialog } from '../contexts/DialogContext';
import { Button } from '../components/ui';
import { useRsvpData } from './public-rsvp/useRsvpData';
import { RsvpEventCard } from './public-rsvp/RsvpEventCard';
import { RsvpRehearsalsList } from './public-rsvp/RsvpRehearsalsList';
import { RsvpReadOnlyView } from './public-rsvp/RsvpReadOnlyView';
import { RsvpUnconfirmedView } from './public-rsvp/RsvpUnconfirmedView';
import { RsvpConfirmedView } from './public-rsvp/RsvpConfirmedView';

export default function PublicRsvpView() {
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  const rsvp = useRsvpData(searchParams, dialog);

  useDocumentTitle(rsvp.rsvpTitle);

  if (rsvp.status === 'loading') {
    /* loading spinner */
  }
  if (rsvp.status === 'error' || !rsvp.event || !rsvp.profile) {
    /* error state */
  }

  return (
    <div className="bg-primary-light flex min-h-screen w-screen flex-col items-center justify-start px-4 py-6 sm:px-6 lg:py-8">
      <div className="m-auto w-full max-w-[540px]">
        <AppCard className="box-border flex w-full flex-col gap-6 border p-6">
          {rsvp.rsvpWindow.isReadOnly ? (
            <RsvpReadOnlyView rsvp={rsvp} />
          ) : !rsvp.isConfirmed ? (
            <RsvpUnconfirmedView rsvp={rsvp} dialog={dialog} />
          ) : (
            <RsvpConfirmedView rsvp={rsvp} dialog={dialog} />
          )}
        </AppCard>
      </div>
    </div>
  );
}
```

## Lessons Learned from Previous Refactors

- **Strict Type Fallbacks:** When hook interfaces explicitly promise `Type | null` (like `event` or `profile`), ensure any `.find()` or `?.` property access includes a strict `|| null` fallback. TypeScript will otherwise infer `Type | undefined` and fail compilation.
- **Closure Property Narrowing:** TypeScript does not narrow object properties across closure boundaries. If passing a conditionally present object property to an event handler, include an inline truthiness check (e.g., `onClick={() => rsvp.event && handler(rsvp.event)}`).
- **Explicit Event Typings:** When extracting components with textareas or inputs (e.g., `RsvpNoteSection`), explicitly type the `onChange` event parameters (e.g., `(e: React.ChangeEvent<HTMLTextAreaElement>)`) to avoid `implicit any` TypeScript errors.
- **Import Path Depth Validation:** When extracting files to `src/views/public-rsvp/`, carefully verify every import path. Ensure paths reaching `services`, `lib`, `hooks`, `contexts`, and `components` have the correct number of `../` segments.

## Verification

```bash
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
rtk npx tsc --noEmit --pretty
rtk npx vitest run
```
