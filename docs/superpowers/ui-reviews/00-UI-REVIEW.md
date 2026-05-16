# Retroactive — UI Review

**Audited:** 2024-05-14
**Baseline:** DESIGN.md
**Screenshots:** Captured (.planning/ui-reviews/retroactive/)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Functional labels, but some generic error messages. |
| 2. Visuals | 2/4 | Strong functional structure but inconsistent component implementation. |
| 3. Color | 3/4 | Good adherence to Sage palette; some hardcoded state colors. |
| 4. Typography | 2/4 | Excessive hardcoded font sizes and weights in JSX. |
| 5. Spacing | 2/4 | Inconsistent density and frequent hardcoded pixel values. |
| 6. Experience Design | 3/4 | Solid state coverage (loading/error/empty); basic interaction feedback. |

**Overall: 15/24**

---

## Top 3 Priority Fixes

1. **Tokenize Typography & Spacing** — The codebase is riddled with hardcoded `fontSize`, `fontWeight`, and `padding` values (e.g., `0.8125rem`, `12px`). This violates the `DESIGN.md` spec and makes the UI feel "jittery." **Fix:** Remove inline styles and use a standardized utility class system mapping to the `xs` through `xl` scale.
2. **Standardize Layout Components** — Page headers, modals, and card layouts are implemented with slightly different spacing and structures in every file. **Fix:** Create a `PageLayout`, `Modal`, and `AppCard` component to enforce consistent padding (`24px` per spec) and shadow usage.
3. **Formalize State Transitions** — Interactions feel abrupt. Modals "pop" and lists "snap" into place. **Fix:** Add CSS transitions for hover states (as required by the "Action Shadow" rule in `DESIGN.md`) and basic entry animations for modals and view changes.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)
- **Strengths:** Action labels are descriptive ("Generate Rehearsals", "Schedule Event"). Empty states are explicitly handled in components like `EventList` and `CheckInList`.
- **Weaknesses:** Some simple text-string error states still need stronger recovery guidance, though native alert dialogs have been replaced with app modals.

### Pillar 2: Visuals (2/4)
- **Hierarchy:** Pages like `AdminDashboardView` have good icon-based navigation, but the `SeatingView` becomes visually cluttered due to a lack of clear vertical rhythm.
- **Consistency:** The `App.tsx` contains duplicate header structures for different routes instead of a unified layout component.
- **Components:** Buttons in `src/components/admin/EventModal.tsx` use a mix of `btn-ghost` classes and custom inline styles for positioning.

### Pillar 3: Color (3/4)
- **Adherence:** Primary Sage Green (`#4a7c59`) is used correctly as an anchor.
- **Flags:** Hardcoded colors for "Performance" status (`#fee2e2`, `#991b1b`) are found in `EventList.tsx`, `RosterTable.tsx`, and `AttendanceView.tsx`. These should be mapped to a `--color-danger` or `--color-performance` variable.
- **Rule Check:** The "Sage 10% Rule" is generally followed, keeping the UI calm and white-dominant.

### Pillar 4: Typography (2/4)
- **Distribution:** `src/components/admin/SeatingGrid.tsx` uses `0.5rem`, `0.625rem`, `0.8125rem`. `src/components/admin/RosterSummary.tsx` uses `2rem`, `0.75rem`, `1.25rem`.
- **Weights:** Heavy use of `fontWeight: 600`, `700`, and `800` in JSX.
- **Deviance:** The `DESIGN.md` specifies only four typography roles (Display, Headline, Body, Label), but the implementation uses at least 8 different font sizes.

### Pillar 5: Spacing (2/4)
- **Inconsistency:** Spec calls for `md: 16px` and `lg: 24px`. Code frequently uses `12px` (e.g., `src/components/admin/EventModal.tsx:114`) and `6px` (e.g., `src/components/admin/RosterSummary.tsx:41`).
- **Density:** Modals feel cramped with `gap: 'var(--space-xs)'` (4px) between labels and inputs, while page containers have generous `var(--space-xl)` (32px) padding.

### Pillar 6: Experience Design (3/4)
- **States:** Good loading coverage in all data-fetching views. `isLoading` check in `App.tsx` prevents flash of unauthenticated content.
- **Feedback:** "Saving..." and "Logging in..." states on buttons provide good functional feedback.
- **Destructive Actions:** App-level confirmation modals protect deletes and resets from accidental activation.

---

## Files Audited
- `src/App.tsx`
- `src/App.css`
- `src/index.css`
- `src/components/admin/EventModal.tsx`
- `src/components/admin/SeatingGrid.tsx`
- `src/components/admin/RosterTable.tsx`
- `src/views/admin/AdminDashboardView.tsx`
- `src/views/admin/SeatingView.tsx`
- `src/views/LoginView.tsx`
- `src/views/singer/SeatingFinderView.tsx`
