# Tailwind CSS Migration Design

> **Status:** Approved design — ready for implementation planning
> **Date:** 2026-06-10
> **Goal:** Migrate all CSS (~20k lines across 76 files) to Tailwind CSS v4 utilities

**Architecture:** Layer-by-layer conversion from foundation (theme/infra) up to leaves (views), with Tailwind and existing CSS coexisting throughout. Each layer is a single commit.

**Tech Stack:** React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4 via `@tailwindcss/vite`

---

## 1. Infrastructure Setup

### 1a. Dependencies

Add:
- `tailwindcss` ^4 (`@tailwindcss/vite` plugin — no PostCSS needed)

Remove:
- `stylelint` + `stylelint-config-standard` (obsoleted by utility-first CSS)

### 1b. Vite config

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
})
```

### 1c. Theme (`src/index.css`)

Replace current contents with:

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
}
```

The existing `:root` custom properties remain during migration for backward compat. They get removed in the final cleanup layer.

### 1d. Global CSS imports in `main.tsx`

```tsx
// Keep these during migration, remove as each layer converts:
// import './App.css'
// import './admin.css'
// import './views/PublicViews.css'
```

### 1e. Stylelint config

Delete `.stylelintrc.json` — utility classes don't need BEM/kebab-case linting.

---

## 2. Migration Order (Layer by Layer)

### Layer 1: Theme & Infrastructure
1 file: `src/index.css` (covered above)

### Layer 2: UI Primitives (CSS Modules)
19 files, ~900 lines. Smallest, most isolated, best practice targets.

Files: Badge, Button, Card, ConfirmDialog, EmptyState, FloatingSaveBar, FormField, Input, MarkdownEditor, Modal, Pagination, PhotoUploader, ProgressBar, SavingIndicator, Select, Spinner, Table, Tabs, Toast.

### Layer 3: Common Components
~8 plain CSS files, ~400 lines.

Includes: PageLayout, AppCard, BaseModal, StatusBadge, etc.

### Layer 4: Player Components
~3 plain CSS files, ~900 lines. Player, Playlist, VoicePartSelector.

### Layer 5: Singer Components
~2 plain CSS files, ~200 lines.

### Layer 6: Admin Components
~46 plain CSS files, ~6,000 lines. Largest layer.

### Layer 7: Views
~30 plain CSS files, ~11,000 lines. Largest CSS volume.

### Layer 8: Global Cleanup
Remove: `src/App.css`, `src/admin.css`, `src/views/PublicViews.css`, remaining `:root` vars from `index.css`.

---

## 3. Conversion Pattern

### For CSS Modules (.module.css)

Replace:
```tsx
import styles from './Button.module.css'
const classNames = [styles.btn, styles[variant], size !== 'default' && styles.small]
  .filter(Boolean).join(' ')
```

With:
```tsx
const base = 'inline-flex items-center justify-center h-11 px-6 rounded-md ...'
const variants: Record<string, string> = { primary: 'bg-primary text-surface ...', ... }
const sizes: Record<string, string> = { small: 'h-8 px-4 text-xs' }
const classNames = [base, variants[variant], sizes[size], className].filter(Boolean).join(' ')
```

Delete `.module.css` file. Remove no longer needed `import styles` line.

### For Plain CSS (.css imported directly)

Replace JSX class names with Tailwind utilities:

```tsx
// Before
<div className="login-card-container">
  <div className="login-box">

// After
<div className="min-h-screen flex items-center justify-center bg-bg p-4">
  <div className="bg-surface rounded-lg shadow-md p-8 w-full max-w-md">
```

Delete `.css` file. Remove `import './Foo.css'` from component.

### Global utility class mappings

| Old class | Tailwind equivalent |
|---|---|
| `.flex-center` | `flex items-center justify-center` |
| `.flex-between` | `flex justify-between` |
| `.flex-wrap` | `flex flex-wrap` |
| `.flex-responsive` | `flex flex-col md:flex-row` |
| `.gap-xs` through `.gap-xl` | `gap-1` through `gap-8` |
| `.text-left/center/right` | `text-left/center/right` |
| `.text-muted` | `text-text-muted` |
| `.card` | `bg-surface rounded-lg shadow-md p-6` |
| `.btn` | handled by Button component |
| `.btn-primary` | handled by Button component |

---

## 4. Verification

At each layer:
1. `rtk npx tsc --noEmit` — no broken imports
2. Visual smoke test affected pages
3. `rtk npm test` — component tests pass
4. Grep for orphaned class names after deleting CSS files

---

## 5. Coexistence & Rollback

- Old CSS files stay until their layer is verified
- `:root` variables stay until Layer 8
- Each layer = one commit, easy to revert
- Pilot a representative admin component before Layer 6 full blast
