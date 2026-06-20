# Form Control Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize Input, Select, and Textarea borders/padding/font/focus through a shared `formControlBase`, then clean up consumer overrides.

**Architecture:** Create `src/components/ui/formControlBase.ts` with:
- `formControlBase` — Tailwind class string for borders, colors, font, focus ring, transitions. **Does not include height** because Textarea must auto-size and Select has size variants.
- `formControlHeight` — The standard single-line control height (`h-11`), applied by Input and Select's default size but not Textarea.
- `formControlStyles` — Shoelace CSS custom properties for Input/Select (includes `--sl-input-height`).
- `formControlStylesNoHeight` — Same as above minus `--sl-input-height`, for Textarea.

Each component wrapper imports what it needs, replacing its hard-coded classes. Consumer overrides that redundantly set `h-11` or `h-[44px]` are removed.

**Tech Stack:** React, Shoelace, Tailwind CSS v4, Vitest

---

### Task 1: Create shared base definitions

**Files:**
- Create: `src/components/ui/formControlBase.ts`

- [ ] **Step 1: Create the file**

```ts
import type React from 'react';

/**
 * Shared Tailwind classes for all form controls (Input, Select, Textarea).
 * Does NOT include height — single-line controls add `formControlHeight`,
 * while Textarea auto-sizes to its rows prop.
 */
export const formControlBase =
  'w-full rounded-md border border-border bg-surface px-3 text-sm text-text outline-none transition-[border-color,box-shadow] duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]';

/** Standard height for single-line form controls (Input, Select default). */
export const formControlHeight = 'h-11';

/** Shoelace CSS custom properties for single-line controls (Input, Select). */
export const formControlStyles: React.CSSProperties = {
  '--sl-input-height': '2.75rem',
  '--sl-input-border-radius': '0.375rem',
  '--sl-input-font-size': '0.875rem',
  '--sl-input-border-color': 'var(--color-border)',
  '--sl-input-background-color': 'var(--color-surface)',
  '--sl-input-color': 'var(--color-text)',
  '--sl-input-focus-ring-color': 'rgba(74,124,89,0.25)',
  '--sl-input-focus-ring-width': '3px',
  '--sl-input-border-color-focus': 'var(--color-primary)',
} as React.CSSProperties;

/**
 * Shoelace CSS custom properties for Textarea.
 * Excludes --sl-input-height so rows/auto-sizing works correctly.
 */
export const formControlStylesNoHeight: React.CSSProperties = {
  '--sl-input-border-radius': '0.375rem',
  '--sl-input-font-size': '0.875rem',
  '--sl-input-border-color': 'var(--color-border)',
  '--sl-input-background-color': 'var(--color-surface)',
  '--sl-input-color': 'var(--color-text)',
  '--sl-input-focus-ring-color': 'rgba(74,124,89,0.25)',
  '--sl-input-focus-ring-width': '3px',
  '--sl-input-border-color-focus': 'var(--color-primary)',
} as React.CSSProperties;
```

- [ ] **Step 2: Verify exports compile**

Run: `rtk npx tsc --noEmit src/components/ui/formControlBase.ts`

---

### Task 2: Refactor Select

**Files:**
- Modify: `src/components/ui/Select/Select.tsx`
- Modify: `src/components/ui/Select/Select.test.ts`

- [ ] **Step 1: Update Select.tsx imports and sizeClasses**

Add import at top:
```ts
import { formControlBase, formControlHeight, formControlStyles } from '../formControlBase';
```

Change `sizeClasses` — every size now carries its own height/padding so there is no Tailwind cascade conflict:
```ts
const sizeClasses: Record<SelectSize, string> = {
  default: formControlHeight + ' pl-3 pr-9 py-2 text-sm',
  small: 'h-10 pl-3 pr-9 py-1.5 text-sm',
  compact: 'h-8 pl-2 pr-7 py-0.5 text-xs',
};
```

- [ ] **Step 2: Update test-mode native `<select>`**

Replace the existing className construction block (lines 90-102) with:

```tsx
if (process.env.NODE_ENV === 'test' || visuallyHidden) {
  const classNames = [
    visuallyHidden
      ? '!absolute !inset-0 !size-full !cursor-pointer !opacity-0 !border-none !bg-transparent !p-0 hover:!bg-transparent focus:!shadow-none'
      : formControlBase + ' appearance-none cursor-pointer transition-[border-color,box-shadow,background-color] hover:border-primary hover:bg-primary-light',
    !visuallyHidden && sizeClasses[size],
    !visuallyHidden &&
      invalid &&
      'border-danger-text focus:shadow-[0_0_0_3px_rgba(153,27,27,0.25)]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <select
      ref={ref}
      ...
    >
      {children}
    </select>
  );
}
```

Key changes:
- `formControlBase` provides borders, colors, font, focus ring — but **no height**
- `sizeClasses[size]` is always applied (no `size !== 'default'` guard needed) and each entry carries its own height, so there's no cascade conflict
- The redundant `border border-border rounded-md ...` visual classes are no longer needed inline — `formControlBase` provides them

- [ ] **Step 3: Update Shoelace production path**

Add `formControlStyles` to the `<SlSelect style>` prop:

```tsx
// Inside the SlSelect safeSlProps call:
style: {
  ...formControlStyles,
  ...(invalid ? { '--sl-input-border-color': 'var(--color-danger)' } : {}),
} as React.CSSProperties,
```

- [ ] **Step 4: Update Select test**

In `Select.test.ts`, line 50:
```ts
// Change:
assert.ok(el.classList.contains('h-[44px]'), 'default size has 44px height');
// To:
assert.ok(el.classList.contains('h-11'), 'default size has h-11 height');
```

- [ ] **Step 5: Run tests to verify**

Run: `rtk npx vitest run src/components/ui/Select/Select.test.ts`
Expected: All tests pass (default size assertion updated)

---

### Task 3: Refactor Input

**Files:**
- Modify: `src/components/ui/Input/Input.tsx`

- [ ] **Step 1: Update imports and base classes**

Add import at top:
```ts
import { formControlBase, formControlHeight, formControlStyles } from '../formControlBase';
```

Remove the `baseInputClasses` constant entirely.

Replace `baseInputClasses` references with `formControlBase + ' ' + formControlHeight` in:
- The `type === 'file'` path (line 63)
- The `process.env.NODE_ENV === 'test'` path (line 91)

- [ ] **Step 2: Update Shoelace production path**

Replace the `focusRingStyles` spread and invalid override (line 172) with:

```tsx
// @allow-inline-style - Shoelace CSS variable overrides for focus ring and border
style: {
  ...formControlStyles,
  ...(invalid ? { '--sl-input-border-color': 'var(--color-danger)' } : {}),
} as React.CSSProperties,
```

Note: `formControlStyles` contains the same three CSS vars as the existing `focusRingStyles` constant (`--sl-input-focus-ring-color`, `--sl-input-focus-ring-width`, `--sl-input-border-color-focus`) with identical values. So `focusRingStyles` becomes redundant — we remove it.

- [ ] **Step 3: Remove focusRingStyles**

Delete the `focusRingStyles` constant (lines 120-124). The `formControlStyles` spread provides the same values.

- [ ] **Step 4: Run tests to verify**

Run: `rtk npx vitest run src/components/ui/Input/Input.test.ts`
Expected: All tests pass

---

### Task 4: Refactor Textarea

**Files:**
- Modify: `src/components/ui/Textarea/Textarea.tsx`

- [ ] **Step 1: Update imports**

Add import at top:
```ts
import { formControlBase, formControlStylesNoHeight } from '../formControlBase';
```

Note: Textarea imports `formControlStylesNoHeight` (not `formControlStyles`) so `--sl-input-height` doesn't constrain the textarea to a fixed 2.75rem height.

- [ ] **Step 2: Update test-mode path**

Replace the hard-coded class string (line 55):
```ts
// FROM:
'block w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary',

// TO:
formControlBase + ' resize-none py-3 placeholder:text-slate-400',
```

Note: `formControlBase` already includes `px-3`. We add `py-3` to restore the original `p-3` vertical padding. We do **not** add `formControlHeight` — Textarea must auto-size to its `rows` prop.

Visual changes from the old classes (intentional alignment):
- `rounded-lg` → `rounded-md` (aligns with Input/Select)
- `border-slate-200` → `border-border` (uses design token)
- `bg-white` → `bg-surface` (uses design token)
- `text-slate-900` → `text-text` (uses design token)
- `focus:ring-1 focus:ring-primary` → `focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]` (aligns with Input/Select focus ring)
- `shadow-sm` dropped (Input/Select don't have it)

- [ ] **Step 3: Update Shoelace production path**

Set `className` on `<SlTextarea>` to include `w-full`:
```tsx
// FROM:
className: layoutOnly(className),

// TO:
className: 'w-full' + (className ? ' ' + layoutOnly(className) : ''),
```

Add `formControlStylesNoHeight` to the `<SlTextarea style>` prop:
```tsx
// FROM:
style: invalid
  ? ({ '--sl-input-border-color': 'var(--color-danger)' } as React.CSSProperties)
  : undefined,

// TO:
style: {
  ...formControlStylesNoHeight,
  ...(invalid ? { '--sl-input-border-color': 'var(--color-danger)' } : {}),
} as React.CSSProperties,
```

- [ ] **Step 4: Run tests to verify**

Run: `rtk npx vitest run src/components/ui/Textarea/Textarea.test.ts`
Expected: All tests pass

---

### Task 5: Consumer cleanups

**Files:**
- Modify: `src/views/singer/ProfileView.tsx` (3 occurrences, around lines 433, 450, 465)
- Modify: `src/views/PublicAuditionView.tsx` (line 232)
- Modify: `src/views/PublicDonationView.tsx` (line 221)
- Modify: `src/components/admin/AuditionModal.tsx` (lines 199, 225)

- [ ] **Step 1: ProfileView — remove h-11 from Select instances**

Find each `<Select` with `className="h-11 w-full"` and change to `className="w-full"`.

```tsx
// Change at ~line 433:
<Select
  className="w-full"
  value={sortField}
  ...
>
```

Same for the other two instances (lines 450, 465).

- [ ] **Step 2: PublicAuditionView — remove className from Select**

```tsx
// line 232: change
<Select className="h-11">
// to:
<Select>
```

- [ ] **Step 3: PublicDonationView — remove raw visual overrides from Select**

```tsx
// line 221: change
className="border-border bg-surface focus:border-primary h-11 flex-1 rounded-md border px-3"
// to:
className="flex-1"
```

- [ ] **Step 4: AuditionModal — remove h-[44px] from Input instances**

```tsx
// lines 199 and 225: change
className="h-[44px] transition-colors outline-none"
// to: remove className entirely (or keep only if non-height classes are needed)
```

The `transition-colors` and `outline-none` are already provided by `formControlBase`, so the entire `className` can be removed.

- [ ] **Step 5: Intentionally excluded consumers**

The following `h-[44px]` usages are on custom `<button>` or `<div>` elements, not wrapped form controls. They don't benefit from `formControlBase` and are left as-is:

- `MultiSelectDropdown.tsx:193, 237` — custom dropdown trigger buttons
- `SetListInlineCreator.tsx:86, 181` — inline creator toggle/button
- `AdminPageTabs.tsx`, `SeatingView.tsx`, `ReportsView.tsx`, `RosterView.tsx` — tab bar items using `min-h-[44px]` for touch targets
- `EventCard.tsx:249, 256` — RSVP buttons using `max-sm:min-h-[44px]`
- `AuditionsView.tsx:1086` — status chip bar
- `CommunicationTabs.tsx` — tab items
- `SeatingFormationsEditor.tsx` — formation container
- `ProfileView.tsx:307, 318` — read-only display divs, not inputs

- [ ] **Step 6: Run component tests to verify no regressions**

Run: `rtk npx vitest run src/components/ui/Select/Select.test.ts src/components/ui/Input/Input.test.ts src/components/ui/Textarea/Textarea.test.ts`
Expected: All pass

---

### Task 6: Final verification

- [ ] **Step 1: Run full test suite**

Run: `rtk npm test`
Expected: All pass

- [ ] **Step 2: Run full lint**

Run: `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0 src/components/ui/formControlBase.ts src/components/ui/Input/Input.tsx src/components/ui/Select/Select.tsx src/components/ui/Textarea/Textarea.tsx src/components/ui/index.ts src/views/singer/ProfileView.tsx src/views/PublicAuditionView.tsx src/views/PublicDonationView.tsx src/components/admin/AuditionModal.tsx`
Expected: No errors, zero warnings

- [ ] **Step 3: Full type check**

Run: `rtk npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Build**

Run: `rtk npm run build`
Expected: Clean build
