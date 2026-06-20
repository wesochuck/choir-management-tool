# Form Control Alignment Design

**Date:** 2026-06-20
**Status:** Draft

## Overview

The singer directory filter row shows a search input and voice-part select that are visually close but do not read as the same control family. The root cause is that Input, Select, and Textarea each hard-code their own Tailwind classes (test path) and lack a shared CSS custom property contract (Shoelace production path).

Fix: create a shared `formControlBase` module with Tailwind classes for the test/native path and matching CSS custom properties (`--sl-input-*`) for the Shoelace production path, then refactor all three components to use it. Clean up consumer overrides.

## Design Decisions

### 1. Shared Base — `src/components/ui/formControlBase.ts`

Four exports:

```ts
import type React from 'react';

// Tailwind classes shared by all form controls. No height — Textarea auto-sizes,
// and Select has size variants, so height is added per-component.
export const formControlBase =
  'w-full rounded-md border border-border bg-surface px-3 text-sm text-text outline-none transition-[border-color,box-shadow] duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]';

// Standard height for single-line controls (Input, Select default).
export const formControlHeight = 'h-11';

// Shoelace CSS custom properties for single-line controls (Input, Select).
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

// Same as formControlStyles but without --sl-input-height, for Textarea.
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

**Why height is separate:** Tailwind CSS v4 does not guarantee last-class-wins cascade ordering. If `formControlBase` contained `h-11` and Select's `sizeClasses.small` added `h-10`, the outcome would depend on stylesheet generation order, not class attribute order. Splitting height out eliminates the cascade conflict entirely — each size variant provides its own height with no competing class.

**Why `h-11` instead of `h-[44px]`:** both equal 44 px, but `h-11` is a Tailwind theme spacing token that matches Button's default height. Using arbitrary values for the default size makes future maintenance fragile.

**Why `React.CSSProperties` instead of `Record<string, string>`:** typed at the source so consumers don't need `as React.CSSProperties` casts at every spread site.

### 2. Input Refactor

Path | Current | After
---|---|---
Native `<input>` (test) | `baseInputClasses` with `h-[44px]` | `formControlBase + ' ' + formControlHeight`
Native `<input>` (file) | Same `baseInputClasses` | `formControlBase + ' ' + formControlHeight`
Shoelace `<SlInput>` | Only focus ring vars; no `--sl-input-*` for height/border/font | Merge `formControlStyles` onto `style`; delete now-redundant `focusRingStyles` constant

### 3. Select Refactor

Path | Current | After
---|---|---
Native `<select>` (test/default) | `h-[44px] pl-3 pr-9 py-2 text-sm` | `formControlBase` + `sizeClasses.default` (which includes `formControlHeight`)
Native `<select>` (test/small) | `h-10` via sizeClasses | `h-10` via sizeClasses (no change)
Native `<select>` (test/compact) | `h-8` via sizeClasses | `h-8` via sizeClasses (no change)
Shoelace `<SlSelect>` | No `--sl-input-*` vars | Merge `formControlStyles` onto `style`
Shoelace size mapping | `medium`/`small` | Keep mapping. `--sl-input-height` override handles the pixel height across sizes.

`sizeClasses` stays a full `Record<SelectSize, string>` — every entry carries its own height so there is never a cascade conflict:

```ts
const sizeClasses: Record<SelectSize, string> = {
  default: formControlHeight + ' pl-3 pr-9 py-2 text-sm',
  small: 'h-10 pl-3 pr-9 py-1.5 text-sm',
  compact: 'h-8 pl-2 pr-7 py-0.5 text-xs',
};
```

### 4. Textarea Refactor

Path | Current | After
---|---|---
Native `<textarea>` (test) | Hard-coded `rounded-lg border border-slate-200 bg-white p-3 text-sm ...` | `formControlBase + ' resize-none py-3 placeholder:text-slate-400'`
Shoelace `<SlTextarea>` | No `--sl-input-*` vars, **no `w-full`** | Merge `formControlStylesNoHeight`, add `w-full` to className

Key: Textarea uses `formControlBase` (no height) and `formControlStylesNoHeight` (no `--sl-input-height`). This lets the textarea auto-size to its `rows` prop instead of being pinned to 44px.

The `rounded-lg` → `rounded-md` and `bg-white` → `bg-surface` changes make Textarea consistent with Input/Select. The `focus:ring-1 focus:ring-primary` → `focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]` aligns the focus ring style. These are intentional — the existing differences were themselves inconsistencies.

### 5. Consumer Cleanups

| File | Current | Fix |
|---|---|---|
| `src/views/singer/ProfileView.tsx` (lines 433, 450, 465) | `className="h-11 w-full"` | `className="w-full"` |
| `src/views/PublicAuditionView.tsx` (line 232) | `className="h-11"` | Remove className |
| `src/views/PublicDonationView.tsx` (line 221) | Raw `border-border bg-surface focus:border-primary h-11 flex-1 rounded-md border px-3` | Change to `flex-1` only (visual classes are provided by component; `flex-1` is layout-only and passes through `layoutOnly()`) |
| `src/components/admin/AuditionModal.tsx` (lines 199, 225) | `className="h-[44px] transition-colors outline-none"` | Remove className (all three classes are now provided by `formControlBase` + `formControlHeight`) |

### 6. Intentionally Excluded `h-[44px]` Usages

The following use `h-[44px]` or `min-h-[44px]` on custom elements (buttons, divs, tabs) — not on Input/Select/Textarea wrappers. They use the value as a touch-target minimum, not as a form-control dimension, and are left as-is:

- `MultiSelectDropdown.tsx` — custom dropdown trigger `<button>`
- `SetListInlineCreator.tsx` — inline creator toggle/button
- `AdminPageTabs.tsx`, `SeatingView.tsx`, `ReportsView.tsx`, `RosterView.tsx` — tab bar items
- `EventCard.tsx` — RSVP buttons (`max-sm:min-h-[44px]`)
- `AuditionsView.tsx` — status chip bar
- `CommunicationTabs.tsx` — tab items
- `SeatingFormationsEditor.tsx` — formation container
- `ProfileView.tsx:307, 318` — read-only display divs, not inputs

### 7. Singer Directory Filter

`DirectoryView.tsx:67-87` — already uses shared `Input` and `Select`. The alignment fix comes for free from the refactors above. No layout wrapper needed — the existing `flex-col gap-3 sm:flex-row` div is the only instance of this pattern on a form-control filter row.

### 8. What Does NOT Change

- Shoelace wrapper architecture (test/production duality)
- Invalid state styling (per-component)
- Select `size` prop and its variant mapping
- Chevron icon approach for native select
- No new npm dependencies
- No Tailwind config changes
- No new components (FilterBar deferred — only one consumer currently)

## Files Changed

### Created
- `src/components/ui/formControlBase.ts` — shared Tailwind classes + CSS vars (four exports)

### Modified
- `src/components/ui/Input/Input.tsx` — use `formControlBase` + `formControlHeight`, add `formControlStyles`, remove `baseInputClasses` and `focusRingStyles`
- `src/components/ui/Select/Select.tsx` — use `formControlBase`, add `formControlStyles`, `sizeClasses` uses `formControlHeight` for default, `h-[44px]` → `h-11`
- `src/components/ui/Select/Select.test.ts` — update height assertion from `h-[44px]` to `h-11`
- `src/components/ui/Textarea/Textarea.tsx` — use `formControlBase` (no height), add `formControlStylesNoHeight`, add `w-full`
- `src/views/singer/ProfileView.tsx` — remove `h-11` overrides
- `src/views/PublicAuditionView.tsx` — remove `h-11` override
- `src/views/PublicDonationView.tsx` — remove raw visual overrides
- `src/components/admin/AuditionModal.tsx` — remove `h-[44px]` overrides

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Textarea `rounded-lg` → `rounded-md` and `bg-white` → `bg-surface` changes appearance in existing forms | Check all Textarea usage sites; the change makes it consistent with Input/Select which is the goal |
| Consumer overrides silently dropped by `layoutOnly()` in production | DonationView is the main case — explicit visual overrides are stripped in production already today, so relying on defaults is safer |
| Select `h-[44px]` → `h-11` breaks something that depends on the arbitrary value | Both equal 44 px; test verifies with `expect(slSelect).toHaveClass('h-11')` |
| `w-full` added to Textarea Shoelace path changes layout | Previously Textarea relied on consumer to set width. Adding `w-full` matches Input and Select behavior — verify any consumer that relied on non-full-width Textarea |
| Shoelace version upgrade changes default `--sl-input-*` values | The CSS vars are explicit now, so a version upgrade won't affect rendering |
| Tailwind v4 cascade ordering between competing height classes | Eliminated by design — height is a separate token (`formControlHeight`), not part of `formControlBase`. Each Select size variant carries its own height exclusively. |
