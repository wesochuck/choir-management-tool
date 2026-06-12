# Select Component Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate `!important` overrides from ~20 `<Select>` consumers by adding `size` and optional `visuallyHidden` props to the Select component.

**Architecture:** Follow the existing `Button` variant pattern (`Record<EnumType, string>` lookup maps, exported type aliases, default fallback). Three sizes (default, small, compact) map to the actual height clusters used in the codebase: 44px, 40px, and 32px. Two overlay selects get a `visuallyHidden` prop instead of fighting every default with `!important`. One file (Player.tsx) reverts to a native `<select>` since it overrides *all* component styles.

**Tech Stack:** React, TypeScript, Tailwind CSS v3

**Total files modified:** ~24 (1 component, 1 test, 1 barrel export, 20+ consumers)

---

## File Structure

| File | Change |
|------|--------|
| `src/components/ui/Select/Select.tsx` | Add `size` prop, `SelectSize` type, `visuallyHidden` prop. Align spacing/typography per size. |
| `src/components/ui/Select/Select.test.ts` | Test `size` renders correct classes, test `visuallyHidden` strips appearance. |
| `src/components/ui/index.ts` | Export `SelectSize` type. |
| `src/components/ComposeStep.tsx` | Replace `!h-10` with `size="small"`. |
| `src/components/admin/EventModal.tsx` | Replace 6× `!h-10 !w-full` with `size="small"`. |
| `src/components/admin/RosterDisplayOptionsSettings.tsx` | Replace `!h-10` with `size="small"`. |
| `src/components/admin/MessageHistory.tsx` | Replace `!h-10` with `size="small"`. |
| `src/components/admin/SeatingFormationsEditor.tsx` | Replace `!h-[38px]` with `size="small"`, `!h-10` with `size="small"`, overlay with `visuallyHidden`. |
| `src/components/admin/SingerModal.tsx` | Replace 2× `!h-[38px]` with `size="small"`. |
| `src/components/admin/RosterImportModal.tsx` | Replace `!h-[38px]` with `size="small"`. |
| `src/components/admin/VoicePartEditor.tsx` | Replace `!h-10` with `size="small"`. |
| `src/components/admin/SeatingGrid.tsx` | Replace overlay with `visuallyHidden` prop. |
| `src/components/admin/SingerPerformanceRsvpRow.tsx` | Replace `!h-8` overrides with `size="compact"`. |
| `src/components/common/PhotoUploader.tsx` | Replace color/padding overrides with appropriate usage. |
| `src/components/player/Player.tsx` | Revert to native `<select>`. |
| `src/views/admin/SeatingView.tsx` | Replace `!h-9` with `size="small"`, `!h-8` copy select with `size="compact"`. |
| `src/views/admin/RsvpDashboardView.tsx` | Replace `!h-10` with `size="small"`. |
| `src/views/admin/EventRosterView.tsx` | Replace `!h-11` with `size="small"`. |
| `src/views/admin/RosterView.tsx` | Replace `!w-[200px]` with `size="small"` + width override. |
| `src/views/admin/communications/ComposePanel.tsx` | Replace 3× `!h-10` with `size="small"`. |
| `src/views/admin/communications/TemplatesPanel.tsx` | Replace `!h-10 !w-full` with `size="small"`. |
| `src/views/admin/event-roster/useEventRosterExport.tsx` | Replace `!h-10` with `size="small"`. |
| `src/views/admin/music-library/MusicLibraryFilters.tsx` | Replace 2× `!h-10` with `size="small"`. |
| `src/views/admin/music-library/LearningTracksEditor.tsx` | Replace `!h-8` with `size="compact"`. |
| `src/views/admin/music-library/MusicPieceModal.tsx` | Replace `!h-10` with `size="small"`, `!h-9` with `size="compact"`. |
| `src/views/admin/DonationsView.tsx` | Remove redundant `className` (`block w-full cursor-pointer` matches defaults). |
| `src/views/admin/PatronsView.tsx` | Remove redundant `className` (`block w-full cursor-pointer` matches defaults). |
| `src/views/admin/TicketingView.tsx` | Remove redundant `className` (`block w-full cursor-pointer` matches defaults). |
| `src/views/admin/SettingsView.tsx` | Remove redundant `className` (`block w-full max-w-lg cursor-pointer` matches defaults). |

---

### Task 1: Add `size` and `visuallyHidden` props to Select

**Files:**
- Modify: `src/components/ui/Select/Select.tsx`
- Test: `src/components/ui/Select/Select.test.ts`
- Modify: `src/components/ui/index.ts`

- [ ] **Read current Select.tsx**

Read: `src/components/ui/Select/Select.tsx`

- [ ] **Add `SelectSize` type and update `SelectProps`**

```ts
export type SelectSize = 'default' | 'small' | 'compact';

export interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  invalid?: boolean;
  /** @default 'default' */
  size?: SelectSize;
  /** Visually hidden — strips all chrome. Use for overlay pickers. */
  visuallyHidden?: boolean;
}
```

- [ ] **Add size class lookup map**

```ts
const sizeClasses: Record<SelectSize, string> = {
  default: 'h-[44px] pl-3 pr-9 py-2 text-sm',
  small:   'h-10 pl-3 pr-9 py-1.5 text-sm',
  compact: 'h-8 pl-2 pr-7 py-0.5 text-xs',
};
```

- [ ] **Update component function with new props and visuallyHidden handling**

```ts
export function Select({ invalid, size = 'default', visuallyHidden = false, className, ...rest }: SelectProps) {
  const classNames = [
    'appearance-none border border-border rounded-md text-text bg-surface cursor-pointer outline-none transition-[border-color,box-shadow,background-color] duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:bg-primary-light focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]',
    sizeClasses[size],
    invalid && 'border-danger-text focus:shadow-[0_0_0_3px_rgba(153,27,27,0.25)]',
    visuallyHidden && '!absolute !inset-0 !size-full !cursor-pointer !opacity-0 !border-none !bg-transparent !p-0 hover:!bg-transparent focus:!shadow-none',
    className,
  ].filter(Boolean).join(' ');
  return (
    <select
      className={classNames}
      {...rest}
      // @allow-inline-style - SVG data URI background cannot be Tailwind
      style={{
        backgroundImage: visuallyHidden ? 'none' : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '14px 14px',
        ...rest.style,
      }}
    />
  );
}
```

- [ ] **Update test file** (`src/components/ui/Select/Select.test.ts`)

Add after the existing tests:

```ts
test('Select applies default size class', () => {
  const { container } = render(React.createElement(Select, null));
  const el = container.firstElementChild;
  assert.ok(el.classList.contains('h-[44px]'), 'default size has 44px height');
});

test('Select applies small size class', () => {
  const { container } = render(React.createElement(Select, { size: 'small' }));
  const el = container.firstElementChild;
  assert.ok(el.classList.contains('h-10'), 'small size has h-10 height');
});

test('Select applies compact size class', () => {
  const { container } = render(React.createElement(Select, { size: 'compact' }));
  const el = container.firstElementChild;
  assert.ok(el.classList.contains('h-8'), 'compact size has h-8 height');
});

test('Select visuallyHidden strips chevron background', () => {
  const { container } = render(React.createElement(Select, { visuallyHidden: true }));
  const el = container.firstElementChild as HTMLElement;
  assert.equal(el.style.backgroundImage, 'none', 'visuallyHidden removes chevron SVG');
  assert.ok(el.classList.contains('opacity-0'), 'visuallyHidden adds opacity-0');
});
```

- [ ] **Update barrel export** (`src/components/ui/index.ts`)

Change:

```ts
export { Select } from './Select/Select';
export type { SelectProps } from './Select/Select';
```

To:

```ts
export { Select } from './Select/Select';
export type { SelectSize, SelectProps } from './Select/Select';
```

- [ ] **Run Select tests**

Run: `rtk npx vitest run src/components/ui/Select/Select.test.ts`
Expected: 8+ tests PASS

- [ ] **Commit**

```bash
git add src/components/ui/Select/Select.test.ts src/components/ui/Select/Select.tsx src/components/ui/index.ts
git commit -m "feat(Select): add size and visuallyHidden props"
```

---

### Task 2: Update `size="small"` consumers — event/communication selects

All these selects consumed `h-10` (40px) via `!important` overrides. Replace with `size="small"`.

**Files:**
- Modify: `src/components/ComposeStep.tsx:53-55`
- Modify: `src/components/admin/EventModal.tsx` (6 occurrences)
- Modify: `src/components/admin/RosterDisplayOptionsSettings.tsx:18-21`
- Modify: `src/components/admin/MessageHistory.tsx:93-96`
- Modify: `src/components/admin/VoicePartEditor.tsx:74-77`
- Modify: `src/views/admin/RsvpDashboardView.tsx:45-48`
- Modify: `src/views/admin/communications/ComposePanel.tsx` (3 occurrences)
- Modify: `src/views/admin/communications/TemplatesPanel.tsx:65-68`
- Modify: `src/views/admin/event-roster/useEventRosterExport.tsx:98-101`

- [ ] **Edit ComposeStep.tsx**

```
old: className="!h-10"
new: size="small"
```

Check if there's a `className` prop on the Select. If `className` was only `!h-10`, remove `className` entirely.

```tsx
// Before:
<Select
    value={messageType}
    onChange={(e) => onMessageTypeChange(e.target.value as 'Email' | 'SMS' | 'Both')}
    className="!h-10"
>

// After:
<Select
    value={messageType}
    onChange={(e) => onMessageTypeChange(e.target.value as 'Email' | 'SMS' | 'Both')}
    size="small"
>
```

- [ ] **Edit EventModal.tsx** — 6 occurrences of `className="!h-10 !w-full"`

For each, replace with `size="small"` and remove `className` (since `size="default"` already sets `w-full`):

```tsx
// Before:
<Select ... className="!h-10 !w-full">
// After:
<Select ... size="small">
```

Exception: the `bulkDay` select also has `animate-none`:
```tsx
// Before:
className="!h-10 !w-full animate-none"
// After:
size="small" className="animate-none"
```

- [ ] **Edit RosterDisplayOptionsSettings.tsx**

```
// Before:
<Select ... className="!h-10">
// After:
<Select ... size="small">
```

- [ ] **Edit MessageHistory.tsx**

```
// Before:
<Select ... className="!h-10">
// After:
<Select ... size="small">
```

- [ ] **Edit VoicePartEditor.tsx**

```
// Before:
<Select ... className="!h-10">
// After:
<Select ... size="small">
```

- [ ] **Edit RsvpDashboardView.tsx**

```
// Before:
<Select ... className="block w-full !text-sm !h-10">
// After:
<Select ... size="small">
```

- [ ] **Edit ComposePanel.tsx** — 3 occurrences

Each follows this pattern:
```
// Before:
<Select ... className="w-full !text-sm !h-10">
// After:
<Select ... size="small">
```

The RSVP filter has `disabled:` classes. The `disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50` classes are already covered by the base component's `disabled:opacity-50 disabled:cursor-not-allowed`, so they become redundant. Remove the `className` entirely:

```
// Before:
<Select ... className="w-full !text-sm !h-10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50">
// After:
<Select ... size="small">
```

- [ ] **Edit TemplatesPanel.tsx**

```
// Before:
<Select ... className="!h-10 !w-full">
// After:
<Select ... size="small">
```

- [ ] **Edit useEventRosterExport.tsx**

```
// Before:
<Select ... className="!h-10 !py-1">
// After:
<Select ... size="small">
```

- [ ] **Commit all Task 2 changes**

```bash
git add src/components/ComposeStep.tsx src/components/admin/EventModal.tsx src/components/admin/RosterDisplayOptionsSettings.tsx src/components/admin/MessageHistory.tsx src/components/admin/VoicePartEditor.tsx src/views/admin/RsvpDashboardView.tsx src/views/admin/communications/ComposePanel.tsx src/views/admin/communications/TemplatesPanel.tsx src/views/admin/event-roster/useEventRosterExport.tsx
git commit -m "refactor(Select): migrate !h-10 overrides to size=\"small\""
```

---

### Task 3: Update `size="small"` consumers — admin/modal selects

These use `!h-[38px]`, which is 2px shorter than `size="small"` (40px). The difference is negligible in practice.

**Files:**
- Modify: `src/components/admin/SingerModal.tsx` (2 occurrences)
- Modify: `src/components/admin/RosterImportModal.tsx` (1 occurrence)
- Modify: `src/components/admin/SeatingFormationsEditor.tsx` (`!h-[38px]` and `!h-10` occurrences)
- Modify: `src/views/admin/SeatingView.tsx` (4× `!h-9` → `size="small"`, 1× `!h-8` → `size="compact"`)
- Modify: `src/views/admin/music-library/MusicLibraryFilters.tsx` (2× `!h-10`)
- Modify: `src/views/admin/music-library/MusicPieceModal.tsx` (`!h-10` and `!h-9`)
- Modify: `src/views/admin/EventRosterView.tsx` (`!h-11 !w-[210px] !text-base`)
- Modify: `src/views/admin/RosterView.tsx` (2× `!w-[200px] !text-base`)

- [ ] **Edit SingerModal.tsx** — 2 occurrences

```
// Before:
<Select ... className="!h-[38px] !min-h-[38px] !py-1">
// After:
<Select ... size="small">
```

- [ ] **Edit RosterImportModal.tsx** — 1 occurrence

```
// Before:
<Select ... className="!h-[38px] !w-[200px] !py-1" style={{ borderColor: ... }}>
// After:
<Select ... size="small" className="!w-[200px]" style={{ borderColor: ... }}>
```

The `!py-1` is absorbed by `size="small"`'s `py-1.5` (close enough). Width override stays because 200px is layout-specific.

- [ ] **Edit SeatingFormationsEditor.tsx** — 3 Select changes

Change 1 — formation strategy width `!h-[38px]`:
```
// Before:
<Select ... className="!h-[38px] !w-full !px-2 !py-1 !text-sm">
// After:
<Select ... size="small">
```

Change 2 — default formation `!h-10`:
```
// Before:
<Select ... className="!h-10 !w-full !max-w-[400px]">
// After:
<Select ... size="small" className="!max-w-[400px]">
```

Change 3 — overlay voice-part adder `!absolute ...`:
```
// Before:
<Select ... className="!absolute !top-0 !left-0 !z-[2] !size-full !cursor-pointer !opacity-0">
// After:
<Select ... visuallyHidden>
```
Also remove the `// @allow-inline-style` comment if it's on this element (it won't have a `style` prop anymore).

- [ ] **Edit SeatingGrid.tsx** — overlay Select

```
// Before:
<Select ... className="!absolute !inset-0 !size-full !cursor-pointer !opacity-0">
// After:
<Select ... visuallyHidden>
```

- [ ] **Edit SeatingView.tsx** — 5 Select changes

Change 1–4 (performance, venue, formation, chart selects) — replace `!h-9`:
```
// Before:
<Select ... className="!h-9 !text-sm text-slate-900 focus:!border-primary focus:!ring-1 focus:!ring-primary">
// After:
<Select ... size="small" className="text-slate-900 focus:!border-primary focus:!ring-1 focus:!ring-primary">
```
`size="small"` provides `h-10` and `text-sm`, matching close enough to the previous `h-9` height while maintaining the same font size. Remove redundant `!` prefixes — since base provides `h-10 text-sm`, there's no conflict.

Change 5 — copy-to-chart select `!h-8`:
```
// Before:
<Select ... className="!h-8 !min-h-8 max-w-[200px] flex-1 !py-1 !px-[10px] !text-xs">
// After:
<Select ... size="compact" className="max-w-[200px] flex-1">
```
`size="compact"` provides `h-8`, `py-0.5`, `pl-2 pr-7`, `text-xs`. Width override `max-w-[200px] flex-1` stays.

- [ ] **Edit MusicLibraryFilters.tsx** — 2 Select changes

Change 1 — recency filter:
```
// Before:
<Select className="!h-10 !w-auto !py-1.5" ...>
// After:
<Select size="small" className="!w-auto" ...>
```

Change 2 — per-page select:
```
// Before:
<Select className="!h-10 !w-[80px] !min-w-[80px] !py-1.5" ...>
// After:
<Select size="small" className="!w-[80px] !min-w-[80px]" ...>
```

- [ ] **Edit MusicPieceModal.tsx** — 3 Select changes

Change 1 — performance selector:
```
// Before:
<Select className="!h-10 !w-full" ...>
// After:
<Select size="small" ...>
```

Change 2 — link-to-performance selector:
```
// Before:
<Select className="!h-10 min-w-0 flex-[1_1_200px]" ...>
// After:
<Select size="small" className="min-w-0 flex-[1_1_200px]" ...>
```

Change 3 — quickVenue selector:
```
// Before:
<Select className="!h-9 !w-full !text-xs" ...>
// After:
<Select size="compact" ...>
```

- [ ] **Edit EventRosterView.tsx** — 1 Select change

```
// Before:
<Select className="!h-11 !w-[210px] !text-base" ...>
// After:
<Select size="small" className="!w-[210px] !text-base" ...>
```
`!h-11` is the default height (44px = h-11). Replace with `size="small"` (40px). The `!text-base` and `!w-[210px]` stay as they're layout-specific.

- [ ] **Edit RosterView.tsx** — 2 Select changes

Both follow this pattern:
```
// Before:
<Select className="!w-[200px] !text-base" ...>
// After:
<Select className="!w-[200px] !text-base" ...>
```
No change needed. The height defaults to 44px which matches the context. The `!` on width and font-size are still needed since width is `w-full` by default and font-size is `text-sm` by default. **No edit needed — skip this file.**

- [ ] **Commit all Task 3 changes**

```bash
git add src/components/admin/SingerModal.tsx src/components/admin/RosterImportModal.tsx src/components/admin/SeatingFormationsEditor.tsx src/components/admin/SeatingGrid.tsx src/views/admin/SeatingView.tsx src/views/admin/music-library/MusicLibraryFilters.tsx src/views/admin/music-library/MusicPieceModal.tsx src/views/admin/EventRosterView.tsx
git commit -m "refactor(Select): migrate !h-[38px]/!h-9/!h-8 overrides to size prop"
```

---

### Task 4: Update `size="compact"` consumers — tight inline selects

**Files:**
- Modify: `src/components/admin/SingerPerformanceRsvpRow.tsx`
- Modify: `src/views/admin/music-library/LearningTracksEditor.tsx`

- [ ] **Edit SingerPerformanceRsvpRow.tsx**

```
// Before:
<Select className="!h-8 !min-h-[32px] !px-2 !text-[13px] !font-semibold {selectToneClass}" ...>
// After:
<Select size="compact" className="!font-semibold {selectToneClass}" ...>
```
`size="compact"` provides `h-8` (32px) and `px-2 pl-2 pr-7`. The `text-[13px]` is close to `text-xs` (12px) — acceptable difference in exchange for removing the overrides. `font-semibold` stays since it's not part of any size class.

- [ ] **Edit LearningTracksEditor.tsx**

```
// Before:
<Select className="!h-8 !py-1 !pl-2 !pr-7 !text-[11px] !w-auto inline-block cursor-pointer font-medium" ...>
// After:
<Select size="compact" className="!w-auto inline-block cursor-pointer font-medium" ...>
```
`size="compact"` provides `h-8`, `py-0.5`, `pl-2`, `pr-7`, `text-xs`. The `text-[11px]` → `text-xs` difference is a 1px increase, which is acceptable (and more readable). `inline-block`, `cursor-pointer`, `font-medium` stay since they're context-specific.

- [ ] **Commit Task 4 changes**

```bash
git add src/components/admin/SingerPerformanceRsvpRow.tsx src/views/admin/music-library/LearningTracksEditor.tsx
git commit -m "refactor(Select): migrate !h-8 overrides to size=\"compact\""
```

---

### Task 5: Clean up redundant `className` and revert Player.tsx

**Files:**
- Modify: `src/components/player/Player.tsx`
- Modify: `src/views/admin/DonationsView.tsx`
- Modify: `src/views/admin/PatronsView.tsx`
- Modify: `src/views/admin/TicketingView.tsx`
- Modify: `src/views/admin/SettingsView.tsx`
- Modify: `src/components/common/PhotoUploader.tsx`

- [ ] **Revert Player.tsx to native `<select>`**

The Select component is not the right abstraction here — every single default style is overridden. Use a native `<select>` with the original classes:

```tsx
// Before:
<Select
    value={delaySetting}
    onChange={(e) => setDelaySetting(Number(e.target.value))}
    className="!h-auto !w-auto !cursor-pointer !rounded-lg !border-border !bg-primary-light !px-2 !py-1.5 !text-sm !font-semibold !text-text !outline-none focus:!border-primary"
>
// After:
<select
    value={delaySetting}
    onChange={(e) => setDelaySetting(Number(e.target.value))}
    className="h-auto w-auto cursor-pointer rounded-lg border border-border bg-primary-light px-2 py-1.5 text-sm font-semibold text-text outline-none focus:border-primary"
>
```

Also remove the `import { Select } from '../ui';` that was added if it's no longer used in the file. Check the file for other Select usage.

- [ ] **Edit DonationsView.tsx** — remove redundant className

```
// Before:
<Select className="block w-full cursor-pointer" ...>
// After:
<Select ...>
```
`block w-full cursor-pointer` all match the component defaults. Remove `className` entirely.

- [ ] **Edit PatronsView.tsx** — remove redundant className

```
// Before:
<Select className="block w-full cursor-pointer" ...>
// After:
<Select ...>
```

- [ ] **Edit TicketingView.tsx** — remove redundant className

Both occurrences:
```
// Before:
<Select className="block w-full cursor-pointer" ...>
// After:
<Select ...>
```

- [ ] **Edit SettingsView.tsx** — remove redundant className

```
// Before:
<Select className="block w-full max-w-lg cursor-pointer" ...>
// After:
<Select className="max-w-lg" ...>
```
`block w-full cursor-pointer` match defaults. `max-w-lg` is still needed since it constrains the default `w-full`.

- [ ] **Edit PhotoUploader.tsx**

```
// Before:
<Select className="!rounded !border-slate-200 !bg-white !px-2 !py-1 !text-slate-700" ...>
// After:
<Select className="!rounded !border-slate-200 !bg-white !text-slate-700" ... size="small">
```
The color overrides (!border-slate-200, !bg-white, !text-slate-700) stay since they're theme-specific for the camera select. `size="small"` provides the padding and height. `!rounded` stays because the base has `rounded-md`. Remove `!px-2 !py-1` since `size="small"` provides `pl-3 pr-9 py-1.5` (close enough).

- [ ] **Commit Task 5 changes**

```bash
git add src/components/player/Player.tsx src/views/admin/DonationsView.tsx src/views/admin/PatronsView.tsx src/views/admin/TicketingView.tsx src/views/admin/SettingsView.tsx src/components/common/PhotoUploader.tsx
git commit -m "refactor(Select): clean redundant classNames, revert Player to native select"
```

---

### Task 6: Verify

- [ ] **Run the full Select test suite**

Run: `rtk npx vitest run src/components/ui/Select/Select.test.ts`
Expected: all tests PASS

- [ ] **Run the full test suite**

Run: `rtk npm test`
Expected: all tests PASS (frontend tests only, no PB server needed)

- [ ] **Run TypeScript check**

Run: `rtk npx tsc --noEmit`
Expected: no type errors

- [ ] **Verify `!important` regression audit**

Run: `rtk rg '!h-(10|9|8|\[38px\]|\[44px\]|11)' src/ --include '*.tsx' --no-filename | grep -i 'select' || echo "No Select height overrides remain"`

(Note: `rg` is ripgrep. If not available, use: `rtk grep -r --include='*.tsx' '!h-(10|9|8|\[38px\]|\[44px\]|11)' src/ | grep -i select || echo "No Select height overrides remain"`)

Expected output: No results for Select elements. Remaining `!h-*` matches should only be on non-Select elements.

- [ ] **Commit any review fixes**

If any issues found in verification, fix and commit:

```bash
git commit -m "fix: address review findings from Select variants verification"
```

---

## Self-Review

**1. Spec coverage:**
- Add `size` prop: ✓ (Task 1)
- Add `visuallyHidden` prop: ✓ (Task 1)
- Migrate `!h-10` consumers: ✓ (Task 2)
- Migrate `!h-[38px]`/`!h-9`/`!h-8` consumers: ✓ (Task 3)
- Migrate `size="compact"` consumers: ✓ (Task 4)
- Clean redundant classNames: ✓ (Task 5)
- Revert Player.tsx to native `<select>`: ✓ (Task 5)
- Update tests: ✓ (Task 1)
- Verify no regressions: ✓ (Task 6)

**2. Placeholder scan:** All code blocks contain real, executable code. No TBDs or TODOs.

**3. Type consistency:** `SelectSize` used consistently as union type in props interface and Record map. `size="default" | "small" | "compact"` used consistently across all edits. `visuallyHidden` boolean used consistently.
