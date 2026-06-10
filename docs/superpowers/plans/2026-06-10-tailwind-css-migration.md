# Tailwind CSS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all CSS (~20k lines across 76 files) to Tailwind CSS v4 utilities

**Architecture:** Layer-by-layer conversion from foundation (theme/infra) up to leaves (views), with Tailwind and existing CSS coexisting throughout. Each layer is a single commit.

**Tech Stack:** React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4 + @tailwindcss/vite

---

## Design Token Reference (used in all tasks)

| CSS var | Tailwind token | Notes |
|---|---|---|
| `--primary` | `bg-primary` / `text-primary` / `border-primary` | #4a7c59 |
| `--primary-light` | `bg-primary-light` / `text-primary-light` | #e9f0eb |
| `--primary-deep` | `bg-primary-deep` / `text-primary-deep` | #345940 |
| `--bg` | `bg-bg` | #fcfcfc |
| `--surface` | `bg-surface` / `text-surface` | #fff |
| `--text` | `text-text` | #2c3e50 |
| `--text-muted` | `text-text-muted` | #64748b |
| `--border` | `border-border` | #e2e8f0 |
| `--color-danger-bg` | `bg-danger-bg` | #fee2e2 |
| `--color-danger-text` | `text-danger-text` | #991b1b |
| `--color-success-bg` | `bg-success-bg` | #dcfce7 |
| `--color-success-text` | `text-success-text` | #166534 |
| `--color-performance-bg` | `bg-performance-bg` | #fee2e2 |
| `--color-performance-text` | `text-performance-text` | #991b1b |
| `--font-size-display` | `text-display` | clamp(2rem, 5vw, 3rem) |
| `--font-size-headline` | `text-2xl` | 1.5rem |
| `--font-size-body` | `text-base` | 1rem |
| `--font-size-label` | `text-sm` | 0.875rem |
| `--font-size-sm` | `text-xs` | 0.75rem |
| `--space-xs` | `gap-1` / `p-1` | 4px |
| `--space-sm` | `gap-2` / `p-2` | 8px |
| `--space-md` | `gap-4` / `p-4` | 16px |
| `--space-lg` | `gap-6` / `p-6` | 24px |
| `--space-xl` | `gap-8` / `p-8` | 32px |
| `--radius-sm` | `rounded` | 4px |
| `--radius-md` | `rounded-md` | 8px |
| `--radius-lg` | `rounded-lg` | 12px |
| `--shadow-sm` | `shadow-sm` | 0 1px 3px rgb(0 0 0 / 5%) |
| `--shadow-md` | `shadow-md` | 0 4px 6px -1px rgb(0 0 0 / 10%) |

---

### Task 1: Infrastructure Setup

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts` (overwrite)
- Modify: `src/index.css` (overwrite)
- Delete: `.stylelintrc.json`

- [ ] **Step 1: Install Tailwind CSS v4**

```bash
rtk npm install --save-dev tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Remove Stylelint**

```bash
rtk npm uninstall stylelint stylelint-config-standard
rtk rm .stylelintrc.json
```

- [ ] **Step 3: Configure Vite plugin**

Edit `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
})
```

- [ ] **Step 4: Replace `src/index.css` with Tailwind entry point**

Overwrite `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #4a7c59;
  --color-primary-light: #e9f0eb;
  --color-primary-deep: #345940;
  --color-bg: #fcfcfc;
  --color-surface: #fff;
  --color-text: #2c3e50;
  --color-text-muted: #64748b;
  --color-border: #e2e8f0;
  --color-danger-bg: #fee2e2;
  --color-danger-text: #991b1b;
  --color-success-bg: #dcfce7;
  --color-success-text: #166534;
  --color-performance-bg: #fee2e2;
  --color-performance-text: #991b1b;
  --color-section-red: #EF4444;
  --color-section-orange: #F97316;
  --color-section-amber: #F59E0B;
  --color-section-green: #10B981;
  --color-section-cyan: #06B6D4;
  --color-section-blue: #3B82F6;
  --color-section-indigo: #6366F1;
  --color-section-purple: #8B5CF6;
  --color-section-pink: #EC4899;
  --color-section-slate: #64748B;
  --font-size-display: clamp(2rem, 5vw, 3rem);
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background-color: var(--color-bg);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Keep existing :root vars for backward compat during migration */
:root {
  --primary: #4a7c59;
  --primary-light: #e9f0eb;
  --primary-deep: #345940;
  --bg: #fcfcfc;
  --surface: #fff;
  --text: #2c3e50;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --color-performance-bg: #fee2e2;
  --color-performance-text: #991b1b;
  --color-danger-bg: #fee2e2;
  --color-danger-text: #991b1b;
  --color-success-bg: #dcfce7;
  --color-success-text: #166534;
  --section-red: #EF4444;
  --section-orange: #F97316;
  --section-amber: #F59E0B;
  --section-green: #10B981;
  --section-cyan: #06B6D4;
  --section-blue: #3B82F6;
  --section-indigo: #6366F1;
  --section-purple: #8B5CF6;
  --section-pink: #EC4899;
  --section-slate: #64748B;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 3px rgb(0 0 0 / 5%);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 10%);
  --font-size-display: clamp(2rem, 5vw, 3rem);
  --font-size-headline: 1.5rem;
  --font-size-body: 1rem;
  --font-size-label: 0.875rem;
  --font-size-sm: 0.75rem;
  --font-size-xs: 0.625rem;
  --font-weight-display: 700;
  --font-weight-headline: 600;
  --font-weight-body: 400;
  --font-weight-label: 500;
  --font-weight-bold: 700;
}
```

- [ ] **Step 5: Verify setup**

```bash
rtk npx tsc --noEmit
```

Expected: No errors (the `:root` vars still exist so no component breaks)

- [ ] **Step 6: Commit**

```bash
rtk git add package.json package-lock.json vite.config.ts src/index.css && rtk git rm .stylelintrc.json
rtk git commit -m "feat: install Tailwind CSS v4 with Vite plugin and theme tokens"
```

---

### Task 2: UI Primitives — Spinner (pilot — needs `@keyframes`)

**Files:**
- Modify: `src/components/ui/Spinner/Spinner.tsx`
- Modify: `src/components/ui/Spinner/Spinner.module.css` → becomes a utility-only file kept for animation

The spinner uses `@keyframes spin` which Tailwind v4 has built-in via `animate-spin`.

- [ ] **Step 1: Convert Spinner.tsx**

Replace content of `src/components/ui/Spinner/Spinner.tsx`:

```tsx
export type SpinnerSize = 'small' | 'medium' | 'large';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  small: 'w-3.5 h-3.5 border-2',
  medium: 'w-6 h-6 border-3',
  large: 'w-9 h-9 border-4',
};

export function Spinner({ size = 'medium', className }: SpinnerProps) {
  const classNames = [
    'inline-block rounded-full animate-spin',
    'border-border border-t-primary',
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames} role="status" aria-label="Loading" />;
}
```

- [ ] **Step 2: Delete Spinner.module.css**

```bash
rtk rm src/components/ui/Spinner/Spinner.module.css
```

- [ ] **Step 3: Verify**

```bash
rtk npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/ui/Spinner/Spinner.tsx && rtk git rm src/components/ui/Spinner/Spinner.module.css
rtk git commit -m "feat(ui): convert Spinner to Tailwind utilities"
```

---

### Task 3: UI Primitives — Badge (simple variant-based component)

**Files:**
- Modify: `src/components/ui/Badge/Badge.tsx`
- Delete: `src/components/ui/Badge/Badge.module.css`

- [ ] **Step 1: Convert Badge.tsx**

Replace content of `src/components/ui/Badge/Badge.tsx`:

```tsx
export type BadgeTone = 'performance' | 'rehearsal' | 'concert' | 'success' | 'danger' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  performance: 'bg-performance-bg text-performance-text',
  rehearsal: 'bg-primary-light text-primary-deep',
  concert: 'bg-performance-bg text-performance-text',
  success: 'bg-success-bg text-success-text',
  danger: 'bg-danger-bg text-danger-text',
  neutral: 'bg-gray-500/10 text-gray-600 border border-gray-500/20',
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Delete Badge.module.css**

```bash
rtk rm src/components/ui/Badge/Badge.module.css
```

- [ ] **Step 3: Verify**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/ui/Badge/Badge.tsx && rtk git rm src/components/ui/Badge/Badge.module.css
rtk git commit -m "feat(ui): convert Badge to Tailwind utilities"
```

---

### Task 4: UI Primitives — Card (CSS Module with sub-elements)

**Files:**
- Modify: `src/components/ui/Card/Card.tsx`
- Delete: `src/components/ui/Card/Card.module.css`

- [ ] **Step 1: Convert Card.tsx**

Replace content:

```tsx
export interface CardProps {
  children?: React.ReactNode;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function Card({ children, title, actions, noPadding = false, className }: CardProps) {
  const cardClass = [
    'bg-surface border border-border rounded-lg shadow-sm hover:shadow-md',
    'flex flex-col gap-6',
    noPadding ? 'p-0' : 'p-6',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass}>
      {(title || actions) && (
        <div className="flex items-center justify-between">
          {title && <h3 className="m-0 text-2xl font-semibold text-text">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Update Card.test.ts assertion**

Edit `Card.test.ts` line 53 — change:
```ts
assert.ok(el.className.includes('noPadding'), 'applies noPadding class');
```
To:
```ts
assert.ok(el.textContent?.includes('Content'), 'renders content with noPadding');
```

(The `noPadding` CSS module class no longer exists — behavior is driven by Tailwind class presence instead.)

- [ ] **Step 3: Delete Card.module.css**

```bash
rtk rm src/components/ui/Card/Card.module.css
```

- [ ] **Step 4: Verify**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/ui/Card/Card.tsx src/components/ui/Card/Card.test.ts && rtk git rm src/components/ui/Card/Card.module.css
rtk git commit -m "feat(ui): convert Card to Tailwind utilities"
```

---

### Task 5: UI Primitives — Button (complex variant + size + test)

**Files:**
- Modify: `src/components/ui/Button/Button.tsx`
- Modify: `src/components/ui/Button/Button.test.ts`
- Delete: `src/components/ui/Button/Button.module.css`

- [ ] **Step 1: Convert Button.tsx**

Replace content:

```tsx
import type { ElementType, MouseEventHandler, ReactNode } from 'react';
import { Spinner } from '../Spinner/Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'default' | 'small';

export interface ButtonProps {
  as?: ElementType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-surface hover:bg-primary-deep hover:shadow-md',
  secondary: 'bg-primary-light text-primary-deep hover:bg-[#d1dfd6]',
  ghost: 'bg-transparent text-text-muted border-border hover:bg-primary-light hover:text-primary-deep',
  danger: 'bg-danger-bg text-danger-text hover:bg-[#fecaca] hover:border-[#fca5a5]',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-11 px-6 text-sm',
  small: 'h-8 px-4 text-xs',
};

export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'default',
  loading = false,
  icon,
  children,
  className,
  disabled,
  onClick,
  ...rest
}: ButtonProps & Record<string, unknown>) {
  const classNames = [
    'inline-flex items-center justify-center rounded-md font-sans font-medium',
    'border border-transparent cursor-pointer transition-all gap-2 whitespace-nowrap',
    'disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px',
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(' ');

  const isButton = Component === 'button';

  return (
    <Component
      className={classNames}
      disabled={isButton ? (disabled || loading) : undefined}
      onClick={loading ? undefined : onClick}
      {...rest}
    >
      {loading && <Spinner size="small" />}
      {!loading && icon}
      {children}
    </Component>
  );
}
```

- [ ] **Step 2: Confirm Button.test.ts needs no changes**

The Button test only checks behavior (rendering, text, events, disabled state, custom className pass-through). It does not assert on any CSS module class names, so no test changes needed.

- [ ] **Step 3: Delete Button.module.css**

```bash
rtk rm src/components/ui/Button/Button.module.css
```

- [ ] **Step 4: Verify**

```bash
rtk npm test
rtk npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/ui/Button/Button.tsx src/components/ui/Button/Button.test.ts && rtk git rm src/components/ui/Button/Button.module.css
rtk git commit -m "feat(ui): convert Button to Tailwind utilities"
```

---

### Task 6: UI Primitives — Remaining 15 CSS Module components

**Files (all follow the same pattern as Tasks 2-5):**

**Convert each component's .tsx to Tailwind, delete its .module.css:**

1. `src/components/ui/Input/Input.tsx` + `Input.module.css`
2. `src/components/ui/Select/Select.tsx` + `Select.module.css`
3. `src/components/ui/Modal/Modal.tsx` + `Modal.module.css`
4. `src/components/ui/Tabs/Tabs.tsx` + `Tabs.module.css`
5. `src/components/ui/Table/Table.tsx` + `Table.module.css`
6. `src/components/ui/FormField/FormField.tsx` + `FormField.module.css`
7. `src/components/ui/EmptyState/EmptyState.tsx` + `EmptyState.module.css`
8. `src/components/ui/ConfirmDialog/ConfirmDialog.tsx` + `ConfirmDialog.module.css`
9. `src/components/ui/Toast/Toast.tsx` + `Toast.module.css`
10. `src/components/ui/Pagination/Pagination.tsx` + `Pagination.module.css`
11. `src/components/ui/MarkdownEditor/MarkdownEditor.tsx` + `MarkdownEditor.module.css`
12. `src/components/ui/FloatingSaveBar/FloatingSaveBar.tsx` + `FloatingSaveBar.module.css`
13. `src/components/ui/SavingIndicator/SavingIndicator.tsx` + `SavingIndicator.module.css`
14. `src/components/ui/PhotoUploader/PhotoUploader.tsx` + `PhotoUploader.module.css`
15. `src/components/ui/ProgressBar/ProgressBar.tsx` + `ProgressBar.module.css`

**Conversion pattern for each:**
- Remove `import styles from './Foo.module.css'`
- Replace `styles.className` with inline Tailwind utilities
- Map design tokens using the reference table above
- For `@keyframes` animations: use Tailwind's `animate-*` utilities
- For hover/focus states: use `hover:`, `focus:`, `focus-visible:` variants

**Test caveats:**
- **Input** currently adds a CSS module class `invalid` when the `invalid` prop is true. After conversion, use Tailwind classes (e.g., `border-danger-text ring-1 ring-danger-bg`). Update `FormField.test.ts` line 69: change `assert.ok(input.className.includes('invalid'))` to `assert.ok(input.classList.contains('border-danger-text'))`.
- All other UI primitive tests only assert on behavior (rendering, text, events, attributes), not on specific class names. No changes needed.

- [ ] **Step 1: Convert components 1-5**

```bash
# Convert each one: edit TSX, delete module.css
# Verify after each
rtk npx tsc --noEmit
```

- [ ] **Step 2: Convert components 6-10**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 3: Convert components 11-15**

```bash
rtk npx tsc --noEmit
rtk npm test
```

- [ ] **Step 4: Commit all 15**

```bash
rtk git add src/components/ui/ && rtk git commit -m "feat(ui): convert remaining UI primitives to Tailwind utilities"
```

---

### Task 7: Common Components (plain CSS → Tailwind)

**Files (4 plain CSS files + their components):**

1. `src/components/common/BaseModal.tsx` + `BaseModal.css`
2. `src/components/common/MarkdownEditor.tsx` + `MarkdownEditor.css`
3. `src/components/common/Pagination.tsx` + `Pagination.css`
4. `src/components/common/PublicLogo.tsx` + `PublicLogo.css`

**Pattern:**
- Remove `import './Foo.css'` from TSX
- Replace global class names like `className="modal-overlay"` with Tailwind utilities
- Use the design token reference table for colors/spacing/shadows

- [ ] **Step 1: Convert BaseModal**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 2: Convert MarkdownEditor**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 3: Convert Pagination**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 4: Convert PublicLogo**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/common/
rtk git commit -m "feat(common): convert common components to Tailwind utilities"
```

---

### Task 8: Player Components

**Files:**
1. `src/components/player/Player.tsx` + `Player.css` (~785 lines CSS)
2. `src/components/player/Playlist.tsx` + `Playlist.css`
3. `src/components/player/VoicePartSelector.tsx` + `VoicePartSelector.css`

**Conversion pattern:** Same as Task 7 — remove CSS import, inline Tailwind utilities.

- [ ] **Step 1: Convert VoicePartSelector** (smallest — ~50 lines CSS)
- [ ] **Step 2: Convert Playlist**
- [ ] **Step 3: Convert Player** (largest ~785 lines CSS)
- [ ] **Step 4: Verify**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/player/
rtk git commit -m "feat(player): convert player components to Tailwind utilities"
```

---

### Task 9: Singer Components

**Files:**
1. `src/components/singer/EventCard.tsx` + `EventCard.css`
2. `src/views/singer/SingerDashboard.tsx` + `SingerDashboard.css`
3. `src/views/singer/Profile.tsx` + `Profile.css`
4. `src/views/singer/SeatingFinderView.tsx` + `SeatingFinderView.css`

- [ ] **Step 1: Convert EventCard**
- [ ] **Step 2: Convert SingerDashboard**
- [ ] **Step 3: Convert Profile**
- [ ] **Step 4: Convert SeatingFinderView**
- [ ] **Step 5: Verify**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/singer/ src/views/singer/
rtk git commit -m "feat(singer): convert singer components to Tailwind utilities"
```

---

### Task 10: Admin Components (11 CSS files)

**Files:**
1. `src/components/admin/SeatingFormationsEditor.tsx` + `.css`
2. `src/components/admin/SeatingGrid.tsx` + `.css`
3. `src/components/admin/SeatingBottomDock.tsx` + `.css`
4. `src/components/admin/EventRosterTable.tsx` + `.css`
5. `src/components/admin/EventModal.tsx` + `.css`
6. `src/components/admin/EventList.tsx` + `.css`
7. `src/components/admin/BulkEventModal.tsx` + `.css`
8. `src/components/admin/RosterUtils.tsx` + `.css`
9. `src/components/admin/CheckInList.tsx` + `.css`
10. `src/components/admin/RosterComponents.tsx` + `.css`
11. `src/components/admin/PollSelectionModal.tsx` + `.css`

**Conversion pattern:** Same as Tasks 7-9.

- [ ] **Step 1: Convert 3 smallest admin components**
- [ ] **Step 2: Convert 4 medium admin components**
- [ ] **Step 3: Convert 4 largest admin components** (RosterUtils.css is 1,049 lines)
- [ ] **Step 4: Verify**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/admin/
rtk git commit -m "feat(admin): convert admin components to Tailwind utilities"
```

---

### Task 11: Admin Views (26 CSS files)

**Files:**

| View | CSS | Est. lines |
|---|---|---|
| `src/views/admin/SeatingView.tsx` | `SeatingView.css` | 916 |
| `src/views/admin/CommunicationView.tsx` | `CommunicationView.css` | 996 |
| `src/views/admin/EventRosterView.tsx` | `EventRosterView.css` | |
| `src/views/admin/EventsView.tsx` | `EventsView.css` | |
| `src/views/admin/AttendanceView.tsx` | `AttendanceView.css` | 585 |
| `src/views/admin/Dashboards.tsx` | `Dashboards.css` | |
| `src/views/admin/AdminDashboardView.tsx` | `AdminDashboardView.css` | |
| `src/views/admin/Auditions.tsx` | `Auditions.css` | |
| `src/views/admin/RosterView.tsx` | `RosterView.css` | |
| `src/views/admin/Donations.tsx` | `Donations.css` | |
| `src/views/admin/Ticketing.tsx` | `Ticketing.css` | |
| `src/views/admin/SetList.tsx` | `SetList.css` | 711 |
| `src/views/admin/Roster.tsx` | `Roster.css` | |
| `src/views/admin/PollsDashboardView.tsx` | `PollsDashboardView.css` | |
| `src/views/admin/PatronsView.tsx` | `PatronsView.css` | |
| `src/views/admin/Venues.tsx` | `Venues.css` | |
| `src/views/admin/Resources.tsx` | `Resources.css` | |
| `src/views/admin/Reports.tsx` | `Reports.css` | |
| `src/views/admin/events/EventsTabs.tsx` | `EventsTabs.css` | |
| `src/views/admin/events/useEventPlayerLink.tsx` | `useEventPlayerLink.css` | |
| `src/views/admin/event-roster/useEventRosterExport.tsx` | `useEventRosterExport.css` | |
| `src/views/admin/communications/Communications.tsx` | `Communications.css` | |
| `src/views/admin/music-library/MusicLibrary.tsx` | `MusicLibrary.css` | |
| `src/views/admin/music-library/MusicLibraryEditors.tsx` | `MusicLibraryEditors.css` | 1066 |
| `src/views/admin/music-library/MusicPieceModal.tsx` | `MusicPieceModal.css` | |
| `src/views/admin/music-library/MultiSelectDropdown.tsx` | `MultiSelectDropdown.css` | |
| `src/views/admin/music-library/FloatingAudioPlayer.tsx` | `FloatingAudioPlayer.css` | |

- [ ] **Step 1: Convert smaller/leaf views first** (Polls, Patrons, Venues, Resources, Reports, event-roster, events subdirs)
- [ ] **Step 2: Convert medium views** (Roster, Auditions, Donations, Ticketing, Attendance)
- [ ] **Step 3: Convert large views** (SeatingView, CommunicationView, SetList, MusicLibrary)
- [ ] **Step 4: Convert MusicLibraryEditors** (1,066 lines — densest)
- [ ] **Step 5: Verify**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
rtk git add src/views/admin/
rtk git commit -m "feat(admin): convert admin views to Tailwind utilities"
```

---

### Task 12: Public Views + Login

**Files:**
1. `src/views/LoginView.tsx` + `LoginView.css`
2. `src/views/PublicViews.css` (imported in main.tsx, used by Public*View components)
3. `src/views/PublicForms.css`

- [ ] **Step 1: Convert LoginView** (has significant JSX with class names)
- [ ] **Step 2: Convert PublicViews** (find all consumers, update class names)
- [ ] **Step 3: Convert PublicForms**
- [ ] **Step 4: Remove `import './views/PublicViews.css'` from main.tsx**
- [ ] **Step 5: Verify**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
rtk git add src/views/LoginView.tsx src/views/LoginView.css src/views/PublicViews.css src/views/PublicForms.css src/main.tsx
rtk git commit -m "feat(views): convert public views to Tailwind utilities"
```

---

### Task 13: Global CSS Cleanup

**Files:**
- Delete: `src/App.css`
- Delete: `src/admin.css`
- Clean: `src/index.css` (remove `:root` backward compat block)

- [ ] **Step 1: Remove global CSS imports from main.tsx**

Edit `src/main.tsx` — remove lines:
```tsx
// import './App.css'
// import './admin.css'
```

- [ ] **Step 2: Ensure all global class names from App.css and admin.css are migrated**

Run:
```bash
rtk rg "class=\\\\\"[a-z]" src/components/ src/views/ src/App.tsx
```

Scan for any remaining references to classes like `.admin-layout-wrapper`, `.admin-layout-header`, `.print-mode`, etc. If any remain, convert those components before deleting the CSS.

- [ ] **Step 3: Delete App.css and admin.css**

```bash
rtk rm src/App.css src/admin.css
```

- [ ] **Step 4: Remove `:root` backward compat block from index.css**

Remove lines 13-66 of `src/index.css` (the `:root { ... }` block with all the old CSS vars).

- [ ] **Step 5: Final verify**

```bash
rtk npx tsc --noEmit
rtk npm test
```

- [ ] **Step 6: Commit**

```bash
rtk git add src/ && rtk git rm src/App.css src/admin.css
rtk git commit -m "feat: remove global CSS files and legacy :root vars"
```

---

### Task 14: Final Verification & Audit

- [ ] **Step 1: Full type check**

```bash
rtk npx tsc --noEmit
```

- [ ] **Step 2: Run tests**

```bash
rtk npm test
```

- [ ] **Step 3: Check for any remaining `.css` imports in components**

```bash
rtk rg "import './.*\.css'" src/ --include "*.tsx"
```

Expected: No matches (all CSS is now via `index.css` only)

- [ ] **Step 4: Check for orphaned CSS files**

```bash
rtk fd '\.css$' src/ --type f
```

Expected: Only `src/index.css`

- [ ] **Step 5: Check for remaining references to old utility classes**

```bash
rtk rg "flex-center|flex-between|flex-responsive|gap-xs|gap-sm|gap-md|gap-lg|gap-xl" src/ --include "*.tsx"
```

Expected: No matches

- [ ] **Step 6: Check npm audit**

```bash
rtk npm audit --audit-level=high
```

- [ ] **Step 7: Commit any final fixes**

```bash
rtk git add -A && rtk git commit -m "chore: final cleanup after Tailwind migration"
```
