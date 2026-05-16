---
phase: 01-clickable-rows
reviewed: 2024-05-15T12:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - .planning/phase-1/PLAN.md
  - .planning/phase-1/SPEC.md
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: resolved
---

# Phase 1: Code Review Report (Plan & Spec)

**Reviewed:** 2024-05-15
**Depth:** standard
**Files Reviewed:** 2
**Status:** resolved

## Resolution

Resolved in `src/App.css` and the affected admin list components by using the Expanded Hit Area pattern instead of making rows/cards into ARIA buttons. The primary Edit controls retain native keyboard behavior, while secondary controls use propagation guards and higher stacking context to remain independently clickable.

## Summary

The implementation plan and design specification for "Clickable Rows" successfully align with the aesthetic goals of "The Modern Rehearsal" and the product goal of "Frictionless Utility." However, the current technical approach has significant accessibility (WCAG 2.1 AA) and usability flaws regarding keyboard interaction and nested interactive elements.

## Critical Issues

### CR-01: Missing Keyboard Interaction for Clickable Elements

**File:** `.planning/phase-1/SPEC.md:27`, `.planning/phase-1/PLAN.md:46`
**Issue:** The specification adds `role="button"` and `tabIndex={0}` to `AppCard` and list rows but fails to define `onKeyDown` handlers. Under WCAG 2.1 AA (2.1.1 Keyboard), any element with a button role must be triggerable via the Enter and Space keys.
**Fix:**
Ensure that when `onClick` is provided, a corresponding keydown handler is added to the component:
```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onClick();
  }
};
// Apply to div: onKeyDown={handleKeyDown}
```

### CR-02: Invalid Nested Interactivity (ARIA Violation)

**File:** `.planning/phase-1/SPEC.md:38`, `.planning/phase-1/PLAN.md:55`
**Issue:** Making an entire row or `AppCard` a `role="button"` while it contains other buttons (e.g., "RSVP List", "Delete") is an ARIA violation. Screen readers will announce the row as a single button, obscuring the presence of internal actions, and clicking the row may trigger multiple actions if event propagation is not perfectly managed.
**Fix:**
Instead of making the container a button, use the **Expanded Hit Area** pattern:
1. Make the "Edit" button the "primary action."
2. Use a CSS pseudo-element (`::after`) on the primary action button that expands to cover the relative-positioned row.
3. Ensure other buttons in the row have `position: relative` and a higher `z-index` so they remain clickable.
4. This preserves valid HTML structure and clean ARIA semantics.

## Warnings

### WR-01: Non-standard Table Row Interaction

**File:** `.planning/phase-1/SPEC.md:31`, `.planning/phase-1/PLAN.md:54`
**Issue:** Adding `onClick` and `role="button"` to a `<tr>` element is technically discouraged as it can interfere with table semantics and screen reader table navigation modes.
**Fix:**
Prefer wrapping the row's content in a single cell that contains a button covering the row area, or ensure the `tr` maintains its row semantics while the "Edit" action is triggered by a keyboard-accessible element within the first cell.

### WR-02: User Experience Inconsistency in AuditionsView

**File:** `.planning/phase-1/SPEC.md:52`, `.planning/phase-1/PLAN.md:65`
**Issue:** The spec suggests that clicking a row in `AuditionsView` will "focus the status select for now," whereas in all other lists, it triggers an "Edit Modal." This violates the principle of "Reliable Stability" and "Familiarity" defined in `PRODUCT.md`.
**Fix:**
Implement a consistent `AuditionModal` for editing audition details, or at minimum, ensure the click action is consistent with the "Edit" pattern used elsewhere.

### WR-03: Insufficient stopPropagation Scope

**File:** `.planning/phase-1/SPEC.md:42`, `.planning/phase-1/PLAN.md:62`
**Issue:** While `stopPropagation` is mentioned for buttons, `CheckInList` contains `input[type="text"]` and `input[type="checkbox"]`. Clicking these to focus or toggle will trigger the parent `AppCard` click handler (the Edit Modal) unless propagation is stopped on the inputs and their associated labels.
**Fix:**
Ensure `stopPropagation()` is applied to `onChange` or `onClick` for all form controls, including the `label` wrapping the checkbox in `CheckInList`.

## Info

### IN-01: Missing "Active/Pressed" Visual State

**File:** `.planning/phase-1/SPEC.md:12`
**Issue:** The design system defines hover states, but "The Modern Rehearsal" experience would benefit from a subtle "pressed" state (`:active`) for clickable rows to provide tactile feedback on mobile.
**Fix:**
Add a `.clickable-row:active` state in `src/App.css` that slightly darkens the background or applies a subtle transform (e.g., `transform: scale(0.99)`).

---

_Reviewed: 2024-05-15 12:00:00_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
