# Seating Refactoring Plan: Reusable Read-Only Seating Grid

## Goal

Create a reusable read-only seating display system extracted from the singer `SeatingFinderView` inline grid, then use those components for:
1. The singer seat finder (replaces inline grid, no behavioral change)
2. Admin seating view on mobile (read-only by default, "Edit seating anyway" escape hatch)

Desktop admin editing remains unchanged.

---

## Changes from original draft

| # | Original | Refined | Reason |
|---|----------|---------|--------|
| 1 | Drops CSS tooltips on seats | **Keep CSS tooltips** | Singer view has elegant hover popovers with name/voicePart |
| 2 | `getSingerInitials(singerId)` | `getSingerInitials(name)` | Pure function, no profile lookup needed in helper |
| 3 | No mention of open seating | **Guard admin panel behind `!isOpenSeating`** | Admin SeatingView already renders separate open-seating content |
| 4 | Bottom dock unaddressed for mobile edit | **Note: bottom dock hidden on mobile** | Drag doesn't work well on mobile; admins use seat dropdowns instead |
| 5 | `SeatingLegend.tsx` | **Defer to V2** | Not referenced by any integration step |
| 6 | Two location options for admin panel | `src/components/admin/ReadOnlyAdminSeatingPanel.tsx` | Lives alongside existing admin seating components |
| 7 | Responsive split wraps all grid content | **Split only `printMode === 'visual'` block** | Preserve text/print mode on mobile |

---

## File structure

```
src/components/seating/                   # NEW — reusable read-only components
  types.ts
  seatingDisplayUtils.ts
  SeatingPerspectiveToggle.tsx
  ReadOnlySeatingGrid.tsx
  SelectedSeatCard.tsx

src/components/admin/
  ReadOnlyAdminSeatingPanel.tsx            # NEW — admin-specific composition
  SeatingGrid.tsx                          # unchanged
  SeatingBottomDock.tsx                    # unchanged
  ...                                      # others unchanged

src/views/singer/SeatingFinderView.tsx     # modified — uses shared components
src/views/admin/SeatingView.tsx            # modified — mobile read-only split
```

No `SeatingLegend.tsx` for V1.

---

## Step 1: `src/components/seating/types.ts`

```ts
import type { SectionDef, VoicePartDef } from '../../services/settingsService';

export type SeatingPerspective = 'singer' | 'director';

export type SeatingDisplayProfile = {
  id: string;
  name: string;
  voicePart: string;
};

export type SelectedSeatInfo = {
  row: number;
  seat: number;
  status: 'empty' | 'assignedUnknown' | 'assigned' | 'self';
  profileId?: string;
  name?: string;
  voicePart?: string;
};

export type ReadOnlySeatSelectPayload = {
  row: number;
  seat: number;
  profileId?: string;
  name?: string;
  voicePart?: string;
  status: SelectedSeatInfo['status'];
};

export type ReadOnlySeatingGridProps = {
  rowCounts: number[];
  assignments: Record<string, string>;
  profilesById: Map<string, SeatingDisplayProfile>;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
  perspective: SeatingPerspective;
  selectedSeat?: SelectedSeatInfo | null;
  highlightedProfileId?: string | null;
  showVoicePartColors?: boolean;
  showNamesOnSeats?: boolean;
  onSeatSelect?: (seat: ReadOnlySeatSelectPayload) => void;
};
```

Note: `SeatingDisplayProfile` is structurally compatible with both `SeatingSingerProfile` (from `seatingService`) and `Pick<Profile, 'id' | 'name' | 'voicePart'>` (from `profileService`).

---

## Step 2: `src/components/seating/seatingDisplayUtils.ts`

```ts
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import type { SeatingDisplayProfile, SelectedSeatInfo } from './types';

export function getSingerInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getProfileSeatColor(
  profile: SeatingDisplayProfile | null,
  sections: SectionDef[],
  voiceParts: VoicePartDef[]
): string {
  if (!profile) return 'var(--color-border)';
  const voicePart = voiceParts.find((v) => v.label === profile.voicePart);
  const sectionCode = voicePart?.sectionCode || profile.voicePart?.[0];
  const section = sections.find((s) => s.code === sectionCode);
  return voicePart?.color || voicePart?.colorBg || section?.color || section?.colorBg || 'var(--color-primary)';
}

export function buildSelectedSeatInfo(params: {
  row: number;
  seat: number;
  singerId?: string;
  highlightedProfileId?: string | null;
  profilesById: Map<string, SeatingDisplayProfile>;
}): SelectedSeatInfo {
  const { row, seat, singerId, highlightedProfileId, profilesById } = params;
  if (!singerId) return { row, seat, status: 'empty' };
  const profile = singerId ? profilesById.get(singerId) ?? null : null;
  const isSelf = singerId === highlightedProfileId;
  if (profile) {
    return {
      row, seat,
      status: isSelf ? 'self' : 'assigned',
      profileId: singerId,
      name: profile.name,
      voicePart: profile.voicePart,
    };
  }
  return { row, seat, profileId: singerId, status: 'assignedUnknown' };
}
```

Improvement over current singer view: `getProfileSeatColor` prefers `voicePart.color` before falling back to `section.color`. The current view only uses `section.color`.

---

## Step 3: `src/components/seating/SeatingPerspectiveToggle.tsx`

```tsx
import { Button } from '../ui';
import type { SeatingPerspective } from './types';

type SeatingPerspectiveToggleProps = {
  value: SeatingPerspective;
  onChange: (value: SeatingPerspective) => void;
};

export function SeatingPerspectiveToggle({ value, onChange }: SeatingPerspectiveToggleProps) {
  return (
    <div className="mx-auto mb-1 flex w-max flex-row justify-center gap-1 rounded-md bg-[var(--surface-muted)] p-1">
      <Button
        variant={value === 'singer' ? 'primary' : 'outline'}
        size="small"
        onClick={() => onChange('singer')}
      >
        Singer View
      </Button>
      <Button
        variant={value === 'director' ? 'primary' : 'outline'}
        size="small"
        onClick={() => onChange('director')}
      >
        Director View
      </Button>
    </div>
  );
}
```

Persistence (localStorage) stays in the consuming view with different keys:
- Singer view: `'seating-perspective'`
- Admin panel: `'admin-seating-perspective'`

---

## Step 4: `src/components/seating/ReadOnlySeatingGrid.tsx`

Core extraction from singer view's inline grid (lines 330-423 of `SeatingFinderView.tsx`).

### Structure (unchanged from singer view)

1. Outer wrapper: `rounded-lg border p-4 px-3 shadow-sm sm:p-8 sm:px-6`
2. Scroll wrapper: `flex-col-reverse items-stretch gap-3 overflow-x-auto py-[40px] pb-[10px]`
3. Row wrapper: `grid grid-cols-[64px_max-content_64px] items-center gap-x-2 sm:grid-cols-[72px_max-content_72px]`
4. Row label (left): `text-right text-xs font-bold uppercase select-none sm:text-sm`
5. Seat row container: `flex min-w-max items-center gap-[8px] sm:gap-[10px]` with `flexDirection` toggle for perspective
6. Each seat: `<button>` with `h-8 w-8 rounded-full` styling, hover scaling
7. CSS tooltip: `group-hover:visible` popover with `profile.name (profile.voicePart)` — **preserved from original**
8. Stage front marker: dashed top-border + "Director & Audience" badge
9. `aria-label` on each seat for accessibility

### Props flow

```tsx
<ReadOnlySeatingGrid
  rowCounts={rowCounts}
  assignments={assignments}
  profilesById={profilesById}
  sections={sections}
  voiceParts={voiceParts}
  perspective={perspective}
  selectedSeat={selectedSeat}
  highlightedProfileId={singerProfileId}   // or undefined for admin
  showVoicePartColors
  onSeatSelect={(seat) => setSelectedSeat(seat)}
/>
```

### Seat color logic

```ts
const seatColor = showVoicePartColors && profile
  ? getProfileSeatColor(profile, sections, voiceParts)
  : singerId
    ? 'var(--color-primary)'
    : 'var(--color-border)';
```

### Seat status indicators

| State | Visual |
|-------|--------|
| Empty seat | White background, border color `--color-border` |
| Assigned (known) | Colored background (voice part/section color), white text with initials or `•` |
| Highlighted seat | `!border-primary-deep` + `shadow-[0_0_0_4px_rgba(74,124,89,0.3)]` |
| Selected seat | `outline-primary-deep outline-[3px] outline-offset-[3px]` |
| Self (singer view) | Combination of highlighted + selected treatment |

---

## Step 5: `src/components/seating/SelectedSeatCard.tsx`

Extracted from singer view (lines 429-462 of `SeatingFinderView.tsx`).

```ts
type SelectedSeatCardProps = {
  selectedSeat: SelectedSeatInfo;
  onClear: () => void;
};
```

Renders:
- Row number and seat number
- Status text: "Empty seat", "Assigned singer", `profile.name`, or "Your seat"
- Voice part label (when assigned)
- Dismiss button (to close the card, renamed from "Clear" to avoid admin confusion)

---

## Step 6: Update `SeatingFinderView.tsx`

**No behavioral change.** Replace inline grid, toggle, and seat card with shared components.

### Changes

**Imports added:**
```ts
import { SeatingPerspectiveToggle } from '../../components/seating/SeatingPerspectiveToggle';
import { ReadOnlySeatingGrid } from '../../components/seating/ReadOnlySeatingGrid';
import { SelectedSeatCard } from '../../components/seating/SelectedSeatCard';
import { getSingerInitials, getProfileSeatColor, buildSelectedSeatInfo } from '../../components/seating/seatingDisplayUtils';
```

**Imports removed:**
- None (inline helpers stay until refactored)

**Inline helpers removed from view body:**
- `getSingerInitials(singerId)` → replaced by `getSingerInitials(profile.name)` from utils
- `getSingerColor(singerId)` → replaced by `getProfileSeatColor(profile, sections, voiceParts)` from utils
- `handleSeatSelect()` → replaced by `buildSelectedSeatInfo(...)` from utils

**Inline helpers kept in view:**
- `getSingerProfile(singerId)` — still needed by neighbor HUD and `profilesById` lookup
- `getNeighborInfo`, `getNeighborName`, `getNeighborPart` — neighbor HUD is singer-specific

**JSX replaced:**

```tsx
// OLD (lines 307-322):
<div className="mx-auto mb-1 flex w-max flex-row ...">
  <Button ...>Singer View</Button>
  <Button ...>Director View</Button>
</div>

// NEW:
<SeatingPerspectiveToggle value={perspective} onChange={setPerspective} />
```

```tsx
// OLD (lines 330-423):
<div className="border-border bg-surface ...">
  <div className="mb-8 flex ... flex-col-reverse ...">
    {rowCounts.map((count, rIdx) => (
      <div ...>
        <span ...>Row {rIdx + 1}</span>
        <div ...> // seats
          {Array.from({ length: count }).map((_, sIdx) => (
            <button ...>...</button>
          ))}
        </div>
        <span ...>Row {rIdx + 1}</span>
      </div>
    ))}
  </div>
  <div className="border-border ..."> // stage front
    🎼 Director & Audience
  </div>
</div>

// NEW:
<ReadOnlySeatingGrid
  rowCounts={rowCounts}
  assignments={assignments}
  profilesById={profilesById}
  sections={sections}
  voiceParts={voiceParts}
  perspective={perspective}
  selectedSeat={selectedSeat}
  highlightedProfileId={singerProfileId}
  showVoicePartColors
  onSeatSelect={(seat) => setSelectedSeat(seat)}
/>
```

```tsx
// OLD (lines 429-462):
{!isOpenSeating && selectedSeat && (
  <AppCard className="max-sm:block">
    <div className="flex items-center justify-between ...">
      <div>
        <div ...>Row {selectedSeat.row + 1} • Seat {selectedSeat.seat + 1}</div>
        <div ...>...</div>
        ...
      </div>
      <Button ... onClick={() => setSelectedSeat(null)}>Dismiss</Button>
    </div>
  </AppCard>
)}

// NEW:
{selectedSeat && (
  <SelectedSeatCard selectedSeat={selectedSeat} onClear={() => setSelectedSeat(null)} />
)}
```

**Loading state** (lines 327-329) and **isOpenSeating** branch (lines 254-274) remain unchanged.

---

## Step 7: `src/components/admin/ReadOnlyAdminSeatingPanel.tsx`

Composes shared components with admin-specific UI. Lives alongside other admin seating components.

```tsx
interface ReadOnlyAdminSeatingPanelProps {
  rowCounts: number[];
  assignments: Record<string, string>;
  profilesById: Map<string, SeatingDisplayProfile>;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
  chartName?: string;
  onEditAnyway: () => void;
}
```

Internal state:
- `perspective` — persisted in `localStorage` key `'admin-seating-perspective'`
- `selectedSeat` — local to panel, not persisted

Renders:
1. Info banner: "Mobile seating view is read-only. Tap a seat to view singer details."
2. Chart name heading (when provided)
3. `SeatingPerspectiveToggle`
4. `ReadOnlySeatingGrid`
5. `SelectedSeatCard` (conditionally, when `selectedSeat` is set)
6. `Button variant="outline" onClick={onEditAnyway}` with label "Edit seating anyway"

Does **not** render:
- `SeatingBottomDock` (unassigned singers — no drag on mobile)
- Print mode controls
- Chart/formation selectors (those stay in parent `SeatingView`)

---

## Step 8: Integrate into `SeatingView.tsx`

### New state

```tsx
const [forceMobileEditor, setForceMobileEditor] = useState(false);
```

Not persisted. Defaults to `false` on every mobile visit.

### New derived data

```tsx
const seatingDisplayProfilesById = useMemo(() => {
  const map = new Map<string, SeatingDisplayProfile>();
  activeProfiles.forEach((p) => map.set(p.id, { id: p.id, name: p.name, voicePart: p.voicePart }));
  return map;
}, [activeProfiles]);
```

### Responsive split

Replace the visual-mode `SeatingGrid` block (current lines 689-707) with:

```tsx
{printMode === 'visual' && (
  <>
    {/* Mobile: read-only panel or forced editor */}
    <div className="md:hidden">
      {forceMobileEditor ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Editing seating on mobile may be cramped. For best results, use a tablet or desktop.
          </div>
          <Button variant="outline" onClick={() => setForceMobileEditor(false)}>
            Back to read-only view
          </Button>
          <SeatingGrid
            rowCounts={rowCounts}
            assignments={optimisticAssignments}
            suggestions={suggestions}
            activeProfiles={activeProfiles}
            sections={sections}
            voiceParts={voiceParts}
            onAssign={assignSinger}
            onUpdateRowCounts={handleUpdateRowCounts}
            isVoicePartLayout={currentFormation?.isVoicePartLayout}
            sectionOrder={currentFormation?.sectionOrder}
          />
        </div>
      ) : (
        <ReadOnlyAdminSeatingPanel
          rowCounts={rowCounts}
          assignments={optimisticAssignments}
          profilesById={seatingDisplayProfilesById}
          sections={sections}
          voiceParts={voiceParts}
          chartName={activeChart?.name}
          onEditAnyway={() => setForceMobileEditor(true)}
        />
      )}
    </div>

    {/* Desktop: unchanged */}
    <div className="hidden md:block">
      <SeatingGrid
        rowCounts={rowCounts}
        assignments={optimisticAssignments}
        suggestions={suggestions}
        activeProfiles={activeProfiles}
        sections={sections}
        voiceParts={voiceParts}
        onAssign={assignSinger}
        onUpdateRowCounts={handleUpdateRowCounts}
        isVoicePartLayout={currentFormation?.isVoicePartLayout}
        sectionOrder={currentFormation?.sectionOrder}
      />
    </div>
  </>
)}
```

### Guards

- The responsive split only applies when `printMode === 'visual'`. Text/print mode is unaffected.
- The responsive split only applies when `!selectedVenue?.isOpenSeating` — the existing open-seating block at lines 642-660 is untouched.
- All chart controls (Performance, Venue, Formation, Chart selectors) and toolbar items remain outside the responsive split.

### What gets hidden on mobile

- `SeatingBottomDock` (lines 710-724) — drag doesn't work well on mobile. Admins use seat dropdowns in the editor instead. This component will be explicitly wrapped with a `hidden md:block` class so it only renders on desktop.
- Editor mode hint banner (lines 663-688) — replaced by the read-only panel's info banner.

---

## Step 9: Verification

```bash
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 \
  src/components/seating/ \
  src/components/admin/ReadOnlyAdminSeatingPanel.tsx \
  src/views/singer/SeatingFinderView.tsx \
  src/views/admin/SeatingView.tsx

rtk npx tsc --noEmit
```

### Manual checks

**Singer view:**
- Assigned singer sees current seat highlighted (green glow)
- Singer/Director toggle still works and persists
- Seat tap opens selected-seat card
- Empty seats show "Empty seat"
- Assigned seats show name + voice part
- CSS tooltip on hover shows name + voice part
- Standing neighbors HUD still works
- Charts with multiple formations still switch correctly

**Admin mobile:**
- Defaults to read-only viewer on mobile (< 768px)
- Shows all assigned singers by initials/color
- Tapping a seat shows full name and voice part
- Singer/Director toggle works
- Voice part / section colors appear
- "Edit seating anyway" reveals editable `SeatingGrid`
- "Back to read-only view" returns to mobile viewer
- Reload resets to read-only mode
- Open seating venues show the existing open-seating content (not the panel)
- Chart/formation selectors still work

**Admin desktop:**
- Existing editable `SeatingGrid` appears by default
- Drag/drop assignment still works
- Row add/remove still works
- Print mode still works
- Chart selection still works

---

## Commit strategy (single PR, three commits)

### Commit 1: Extract reusable read-only seating components

Files: `types.ts`, `seatingDisplayUtils.ts`, `SeatingPerspectiveToggle.tsx`, `ReadOnlySeatingGrid.tsx`, `SelectedSeatCard.tsx`

No behavioral change. Pure extraction with no consumers yet.

### Commit 2: Refactor singer view to use shared components

File: `SeatingFinderView.tsx`

No intended behavior change. Replace inline grid with shared components.

### Commit 3: Add admin mobile read-only panel with edit escape hatch

Files: `ReadOnlyAdminSeatingPanel.tsx`, `SeatingView.tsx`

Mobile admin defaults to read-only. Existing editable grid remains available through escape hatch. Desktop unchanged.
