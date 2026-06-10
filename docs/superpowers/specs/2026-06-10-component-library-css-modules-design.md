# Component Library + CSS Modules Design

## Motivation

The codebase has 43 global CSS files, 53 React components, and zero CSS Modules. Every component relies on global class names (`.btn`, `.card`, `.badge`) with no scoping, leading to name collision risk and inconsistent visual output. Common UI patterns are duplicated across the codebase: 7 different tab implementations, 4 spinner variants, 2 progress bar implementations, and ad-hoc modal styling everywhere.

Inline styles proliferate despite a custom ESLint rule — 33 files are on a legacy whitelist because their styles haven't been migrated to CSS classes.

The goal: use React as a visual consistency layer by building a shared component library backed by CSS Modules, eliminating duplicated patterns, scoping styles locally, and providing a single source of truth for every UI primitive.

## Approach

**Component library + CSS Modules, no Tailwind.** Build a shared library of React components (`src/components/ui/`) where each component is a thin wrapper around a native HTML element with variant/size props. Every component uses a co-located `.module.css` file for locally-scoped styles. Components consume design tokens via `var(--primary)` from the existing `:root` cascade in `index.css`.

The library uses a layered architecture: Tier 1 primitives (`Button`, `Input`, `Card`, etc.) are thin wrappers. Tier 2 compositions (`FormField`, `EmptyState`, `ConfirmDialog`, etc.) compose Tier 1 primitives. Tier 3 replaces existing `src/components/common/` components with CSS Module equivalents.

Coexistence strategy: the new library is built alongside the old code. Nothing in `common/` or global CSS is touched. Future migration is gradual — views adopt library components when they get refactored. Old components are deleted only after zero consumers remain.

## Architecture

### File structure

```
src/components/ui/          # new library — all CSS Modules
├── Button/
│   ├── Button.tsx
│   └── Button.module.css
├── Input/
│   ├── Input.tsx
│   └── Input.module.css
├── Select/
│   ├── Select.tsx
│   └── Select.module.css
├── Card/
│   ├── Card.tsx
│   └── Card.module.css
├── Badge/
│   ├── Badge.tsx
│   └── Badge.module.css
├── Modal/
│   ├── Modal.tsx
│   └── Modal.module.css
├── Spinner/
│   ├── Spinner.tsx
│   └── Spinner.module.css
├── Tabs/
│   ├── Tabs.tsx
│   └── Tabs.module.css
├── ProgressBar/
│   ├── ProgressBar.tsx
│   └── ProgressBar.module.css
├── FormField/
│   ├── FormField.tsx
│   └── FormField.module.css
├── EmptyState/
│   ├── EmptyState.tsx
│   └── EmptyState.module.css
├── ConfirmDialog/
│   ├── ConfirmDialog.tsx
│   └── ConfirmDialog.module.css
├── Toast/
│   ├── Toast.tsx
│   └── Toast.module.css
├── Table/
│   ├── Table.tsx
│   └── Table.module.css
├── Pagination/
│   ├── Pagination.tsx
│   └── Pagination.module.css
├── PhotoUploader/
│   ├── PhotoUploader.tsx
│   └── PhotoUploader.module.css
├── MarkdownEditor/
│   ├── MarkdownEditor.tsx
│   └── MarkdownEditor.module.css
├── FloatingSaveBar/
│   ├── FloatingSaveBar.tsx
│   └── FloatingSaveBar.module.css
├── SavingIndicator/
│   ├── SavingIndicator.tsx
│   └── SavingIndicator.module.css
└── index.ts                  # barrel export
```

### Barrel export

`src/components/ui/index.ts` re-exports all components:

```ts
export { Button } from './Button/Button'
export { Input } from './Input/Input'
```

Consumers import as:

```ts
import { Button, Card, Modal } from '@/components/ui'
```

### Token access

Components reference design tokens via CSS custom properties from the `:root` cascade (defined in `src/index.css`). Tokens are NOT `@import`-ed or duplicated into CSS Modules. The `:root` block in `index.css` is the single source of truth.

CSS Module files use `var(--primary)`, `var(--space-md)`, etc. directly, relying on the cascade.

### No config changes

- Vite supports `.module.css` files natively — zero config.
- `vite/client` types in `tsconfig.app.json` already provide type support for CSS Module imports.
- No new dependencies.

## Component APIs

### Tier 1 — Core Primitives

#### Button

```tsx
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'default' | 'small'

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}
```

- `loading`: disables the button and shows an inline `Spinner` (size `small`, `className` from CSS Module).
- `icon`: leading icon slot rendered before children.
- All other `<button>` props pass through.

#### Input

```tsx
interface InputProps extends React.ComponentPropsWithoutRef<'input'> {
  invalid?: boolean
}
```

- `invalid`: applies a red border using `var(--color-danger-text)`.
- Does NOT render a label or error message. That is `FormField`'s responsibility.

#### Select

```tsx
interface SelectProps extends React.ComponentPropsWithoutRef<'select'> {
  invalid?: boolean
}
```

- Same pattern as `Input`.
- CSS Module includes the custom chevron SVG background, hover/focus states currently in `index.css`.
- The `select`'s `appearance: none` and chevron are scoped to this component. The global `select` rule in `index.css` is left unchanged for consumers that still use raw `<select>`.

#### Card

```tsx
interface CardProps {
  children: React.ReactNode
  title?: React.ReactNode
  actions?: React.ReactNode
  noPadding?: boolean
  className?: string
}
```

- When `title` is provided, renders a `card-header` row with a `card-title` and optional `card-actions`.
- `noPadding` removes the default `var(--space-lg)` padding.
- `className` merges with the CSS Module classes via a simple utility.

#### Badge

```tsx
type BadgeTone = 'performance' | 'rehearsal' | 'concert' | 'success' | 'danger' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  tone?: BadgeTone
}
```

- Merges the global `.badge` pattern and the `StatusBadge` component into one.
- `neutral` replaces the old `muted` variant from `StatusBadge`.
- Color tokens come from `var(--color-*-bg)` and `var(--color-*-text)`.

#### Modal

```tsx
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}
```

- Uses a portal (`createPortal` to `document.body`).
- Overlay click calls `onClose`. Escape key calls `onClose`.
- `maxWidth` is a CSS value string (e.g., `'600px'`), applied via `@allow-inline-style` annotation.
- Focus is trapped inside the modal while open.
- `aria-modal="true"`, `role="dialog"`.

#### Spinner

```tsx
type SpinnerSize = 'small' | 'medium' | 'large'

interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}
```

- Pure presentational. Merges all 4 existing spinner sizes into one component.
- CSS Module defines the three sizes.
- `Button` uses `Spinner` internally when `loading={true}` — consumers do not wire this themselves.

#### Tabs

```tsx
interface TabsProps {
  tabs: { id: string; label: React.ReactNode }[]
  activeTab: string
  onTabChange: (tabId: string) => void
}
```

- Renders a horizontal tab bar. Each tab is a button styled by the CSS Module.
- Active tab gets a bottom border accent in `var(--primary)`.
- `TabPanel` is a separate presentational component:

```tsx
interface TabPanelProps {
  tabId: string
  activeTab: string
  children: React.ReactNode
}
```

- Renders `children` only when `tabId === activeTab` (uses `hidden` attribute, not conditional rendering, to preserve form state across tab switches).

#### ProgressBar

```tsx
interface ProgressBarProps {
  value: number       // 0–100
  label?: string
  className?: string
}
```

- `role="progressbar"`, `aria-valuenow={value}`, `aria-valuemin="0"`, `aria-valuemax="100"`.
- Fill width is set via `@allow-inline-style` for `width: `${value}%`` — a truly dynamic value.

### Tier 2 — Compositions

#### FormField

```tsx
interface FormFieldProps {
  label: React.ReactNode
  htmlFor?: string
  error?: string
  helpText?: string
  required?: boolean
  children: React.ReactNode
}
```

- Renders a `<label>` with the field label, then `children`, then error/help text below.
- `required` appends an asterisk to the label.
- When `error` is provided, the component clones its `children` and injects `invalid={true}` if the child is a library `Input` or `Select`. This uses `React.isValidElement` and a type check on the child's `type`. Falls back gracefully for non-library children.

#### EmptyState

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}
```

- Centered layout with optional icon, title, description, and action button.
- Replaces all `*-empty-state` class patterns across the codebase.

#### ConfirmDialog

```tsx
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
}
```

- Wraps `Modal`. Danger variant shows confirm button in `Button variant="danger"`.
- Cancel button always uses `variant="ghost"`.
- `loading` passes through to the confirm `Button`.

#### Toast

```tsx
type ToastTone = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  children: React.ReactNode
  tone: ToastTone
  onDismiss?: () => void
  duration?: number
}
```

- Horizontal bar with tone-colored left border and icon.
- If `duration > 0`, auto-dismisses after that many ms.
- `onDismiss` is called on auto-dismiss or manual close.

#### Table

```tsx
interface Column<T> {
  key: string
  header: React.ReactNode
  render: (row: T, index: number) => React.ReactNode
  width?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  onRowClick?: (row: T) => void
  emptyState?: React.ReactNode
}
```

- Renders a standard `<table>`. At `width <= 768px`, switches to a stacked card layout via CSS Module media query.
- `emptyState` is rendered when `data` is empty. If not provided, renders `<EmptyState title="No data" />`.
- Column `width` is applied as `min-width` on the `<th>` and `<td>` cells.

### Tier 3 — Replacements for Existing Shared Components

Each shadows an existing component in `src/components/common/` with an identical or near-identical contract surface, but using CSS Modules. The old component stays in place until all consumers migrate.

#### Pagination

```tsx
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
}
```

- Same API as `common/Pagination`. CSS Module scoped styles.
- Sliding window logic is extracted into a pure function in `paginationUtils.ts` for testability.

#### PhotoUploader

```tsx
type PhotoSize = 'small' | 'medium' | 'large'

interface PhotoUploaderProps {
  profileId: string
  profileName: string
  currentPhotoUrl?: string
  size?: PhotoSize
  onSuccess: () => void
  readOnlyOnDesktop?: boolean
}
```

- Same API as `common/PhotoUploader`. All camera modal, crop, drag-drop, and upload styles move from `index.css` into the CSS Module.
- Size variants handled via CSS Module classes (`.sizeSmall`, `.sizeMedium`, `.sizeLarge`), not inline styles.
- `@allow-inline-style` remains only for the camera viewfinder `aspect-ratio` and drag overlay position.

#### MarkdownEditor

```tsx
interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  instanceRef?: React.MutableRefObject<EasyMDE | null>
  minHeight?: string
  placeholder?: string
  className?: string
}
```

- Same API as `common/MarkdownEditor`. CSS Module for the container.
- EasyMDE's own CSS is loaded globally — this is unavoidable. The component's CSS Module only styles the wrapper.

#### FloatingSaveBar

```tsx
interface FloatingSaveBarProps {
  visible: boolean
  onSave: () => void
  onDiscard?: () => void
  saveLabel?: string
  saving?: boolean
  dirtyFieldCount?: number
}
```

- Replaces `admin/FloatingSaveBar`. Sticky bottom bar using CSS Module.
- When `visible`, slides up from bottom with a CSS transition.

#### SavingIndicator

```tsx
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface SavingIndicatorProps {
  state: SaveState
  errorMessage?: string
  onRetry?: () => void
  lastSavedAt?: Date
}
```

- Replaces `admin/SavingIndicator`.
- `saving`: shows `<Spinner size="small" />` + text.
- `saved`: shows checkmark + timestamp.
- `error`: shows error icon + message + retry button.

## Migration Strategy

### Build phase — no changes to existing code

- All new components live in `src/components/ui/`.
- Zero changes to `src/components/common/`, any view, or any global CSS file.
- The barrel export at `src/components/ui/index.ts` is the only public API surface.

### Migration contract

- New features MUST use library components exclusively.
- When a view is refactored, its inline styles and old `common/` component imports are replaced with library equivalents.
- Old `common/` components are deleted only after ALL consumers have migrated. Verified by grepping for imports of the old component path.
- Global CSS classes (`.btn`, `.card`, `.badge`, `.status-badge`, `.admin-responsive-table`, etc.) are removed only after zero consumers remain. Verified by grepping for the class name across all `.tsx` files.
- The `@allow-inline-style` whitelist (33 files) is not modified in this sprint. Those files migrate when their views adopt the new library.

### Enforcement

- The existing `no-hardcoded-inline-styles` ESLint rule remains unchanged.
- A new ESLint rule may be added later to warn on `common/` imports in files that already use `ui/`. NOT in scope for this sprint.
- CSS Module type safety: `vite/client` types cover `*.module.css` imports. No additional config.

### Build order within the sprint

1. Tier 1 primitives: `Button`, `Input`, `Select`, `Card`, `Badge`, `Modal`, `Spinner`, `Tabs`, `ProgressBar`
2. Tier 2 compositions: `FormField`, `EmptyState`, `ConfirmDialog`, `Toast`, `Table`
3. Tier 3 replacements: `Pagination`, `PhotoUploader`, `MarkdownEditor`, `FloatingSaveBar`, `SavingIndicator`
4. Tests for all components
5. Update `DESIGN.md` to reference the new library

At the end of the sprint, `src/components/common/` and `src/components/ui/` coexist. No deletions.

## Styling Rules

From `DESIGN.md`, reinforced for the new library:

- **No hardcoded values**: spacing, colors, radii, shadows use CSS custom properties from `:root`.
- **Inline styles only for dynamic values**: `@allow-inline-style` annotation required.
- **44px tap targets**: all interactive elements have `min-height: 44px`.
- **Focus states**: never disable default focus outlines without providing a `var(--primary)` themed alternative.
- **WCAG AA contrast**: text meets contrast ratios against backgrounds.
- **Class naming**: CSS Modules produce scoped names, but source class names in `.module.css` files follow kebab-case (e.g., `.form-field`, `.save-bar`).

## Testing

Each component has a co-located test file:

```text
src/components/ui/Button/Button.test.tsx
```

Tests cover:

- Renders with default props
- Each variant renders correctly
- `loading` state shows spinner and disables click
- `icon` slot renders
- Accessibility attributes (`role`, `aria-*`)
- Event handlers fire correctly
- CSS Module classes are applied

Tests use `@testing-library/react` and `jsdom` — consistent with existing test infrastructure. No PocketBase server needed.

A dedicated token-usage test in `test/` verifies that no component CSS Module file contains hardcoded color/spacing values that duplicate existing tokens (regex-based lint test, not runtime).

## Risks

- **EasyMDE global styles**: `MarkdownEditor` wraps EasyMDE which injects its own global CSS. The component's CSS Module only styles the wrapper.
- **PocketBase file URLs**: `PhotoUploader` uses `pb.files.getURL(...)`. This is an existing dependency.
- **React.cloneElement in FormField**: auto-wiring `invalid` into children relies on `React.isValidElement`. Non-library inputs silently ignore it — `FormField` documents this.
- **Modal focus trapping**: needs a small focus-trap implementation (a `useEffect` + tab key handler). Well-bounded new code.
- **No deletions**: the `common/` directory grows stale but is not deleted. Risk of contributors using old components is mitigated by the barrel import pattern and future ESLint warnings.
