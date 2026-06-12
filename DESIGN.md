# Design System

This document defines the visual language and UI standards for the Choir Management Tool. Adhering to these tokens and patterns ensures consistency, maintainability, and accessibility across the application.

## 1. Design Tokens (CSS Variables & Tailwind Config)

All styles should use standard Tailwind CSS classes matching the configured theme variables, or consume the custom tokens defined in `index.css` under the `@theme` block.

### Colors

| CSS Variable      | Tailwind Utility Class | Role                                         |
| :---------------- | :--------------------- | :------------------------------------------- |
| `--primary`       | `bg-primary`           | Primary action color (Forest Green)          |
| `--primary-light` | `bg-primary-light`     | Background for primary light elements        |
| `--primary-deep`  | `text-primary-deep`    | Deep green for text/borders on primary light |
| `--bg`            | `bg-bg`                | Main application background                  |
| `--surface`       | `bg-surface`           | Background for cards, modals, and inputs     |
| `--text`          | `text-text`            | Primary text color                           |
| `--text-muted`    | `text-text-muted`      | Muted text, labels, and secondary info       |
| `--border`        | `border-border`        | Standard border color                        |

### Semantic Colors

| CSS Variable               | Tailwind Utility Class | Role                                      |
| :------------------------- | :--------------------- | :---------------------------------------- |
| `--color-performance-bg`   | `bg-performance-bg`    | Background for performance-related badges |
| `--color-performance-text` | `text-performance-text`| Text color for performance-related badges |
| `--color-danger-bg`        | `bg-danger-bg`         | Background for destructive/error actions  |
| `--color-danger-text`      | `text-danger-text`     | Text for destructive/error actions        |
| `--color-success-bg`       | `bg-success-bg`        | Background for success/completed states   |
| `--color-success-text`     | `text-success-text`    | Text for success/completed states         |

### Spacing

Spacing is driven by Tailwind's standard spacing scale (based on 4px/8px increments). Custom increments map to the standard token variables:

- `--space-xs`: 4px (`gap-1`, `p-1`, etc.)
- `--space-sm`: 8px (`gap-2`, `p-2`, etc.)
- `--space-md`: 16px (`gap-4`, `p-4`, etc.)
- `--space-lg`: 24px (`gap-6`, `p-6`, etc.)
- `--space-xl`: 32px (`gap-8`, `p-8`, etc.)

### Typography

- **Font Family**: Inter, system-ui, sans-serif (Tailwind `font-sans`).
- **Weights**: `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` / `font-black` (700/900).
- **Scale**:
  - `--text-display`: Tailwind Display size (`text-display` / clamp)
  - `--text-headline`: Tailwind Headline size (`text-headline`)
  - `--text-body`: Tailwind Body size (`text-body`)
  - `--text-label`: Tailwind Label size (`text-label`)

### Radii & Shadow

- **Radii**: `rounded-sm` (4px), `rounded-md` (8px), `rounded-xl` (12px).
- **Shadows**: Use `shadow-sm` for cards, and `shadow-md` for interactive hover elements and modals.

## 2. Component Styling Standards

All styling is driven by **Tailwind CSS utility classes** in the `className` prop.

### Standards

1. **Tailwind First**: Do not create standalone CSS or CSS Module files (`.css` or `.module.css`) for styles that can be expressed with Tailwind utility classes.
2. **Dedicated CSS Exception**: Standalone CSS files are acceptable ONLY for complex keyframe animations, printing layouts, or advanced selectors Tailwind cannot express.
3. **No Hardcoded Inline Styles**: Do not use hardcoded inline styles (`style={{ ... }}`) for layout, sizing, or spacing in React components. 
4. **Dynamic Styles Exception**: Inline styles are allowed ONLY for truly dynamic, runtime-computed values (e.g., drag-and-drop offsets, canvas calculations). These must be documented with a `// @allow-inline-style - [explanation]` comment.
5. **Layouts**: Prefer Flexbox (`flex`) and CSS Grid (`grid`) utility classes for all component and view layouts.

## 3. Accessibility

- **Tap Targets**: All interactive elements (buttons, inputs, select) MUST have a minimum height of **44px** (e.g., `h-11` or `min-h-[44px]`).
- **Contrast**: Text must meet WCAG AA standards against its background.
- **Focus States**: Never disable default focus outlines without providing a visible focus-ring themed alternative (e.g., `focus:border-primary focus:ring-1 focus:ring-primary`).

## 4. Maintenance Guidelines for Agents

- **Surgical Edits**: When refactoring, do not change unrelated layout logic.
- **TDD Requirement**: Before removing inline styles or migrating a complex view, ensure Behavioral Integration Tests are passing to prevent regressions.
- **Token Usage**: Use Tailwind utility classes matching the design system token values rather than hardcoding pixel values.

## 5. Component Library

### Location

All shared UI components live in `src/components/ui/`. Each component is a directory with a `.tsx` and `.test.ts` file. Components are styled with Tailwind CSS classnames and are re-exported through `src/components/ui/index.ts`.

### Usage

```tsx
import { Button, Card, Modal, Badge, Spinner, Tabs, TabPanel } from '../components/ui';
```

### Available Components

**Tier 1 — Core Primitives** (thin HTML wrappers):
`Button`, `Input`, `Select`, `Card`, `Badge`, `Modal`, `Spinner`, `Tabs` / `TabPanel`, `ProgressBar`

**Tier 2 — Compositions** (combine Tier 1 primitives):
`FormField`, `EmptyState`, `ConfirmDialog`, `Toast`, `Table`

**Tier 3 — Replacements** (shadow existing `src/components/common/` components):
`Pagination`, `PhotoUploader`, `MarkdownEditor`, `FloatingSaveBar`, `SavingIndicator`

### Conventions

- **Tailwind Utility Classes**: Component styles are fully integrated with Tailwind classes. Theme properties (e.g. `bg-primary`, `text-primary-deep`, `border-border`) are mapped dynamically inside `className` props.
- Component files do NOT import `React` — React 19's automatic JSX transform handles JSX. Only named type imports from `react` are used.
- Every component exports a named function (`export function Button(...)`) and a corresponding `XxxProps` interface.
- Test files are `.test.ts` (not `.test.tsx`) and use `React.createElement(...)` instead of JSX (the project's tsconfig.test.json uses `erasableSyntaxOnly`).
- Dynamic inline styles require a `// @allow-inline-style - [explanation]` annotation.

### Migration

New features must use library components from `src/components/ui/`. Existing views are incrementally migrated to Tailwind utility classes. The `src/components/common/` and `src/components/admin/` directories contain legacy components that are refactored or phased out as their consumers are modernized.
