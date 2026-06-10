# Resolve Custom Tailwind Class Warnings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate 1835 `tailwindcss/no-custom-classname` warnings by properly registering custom CSS classes with Tailwind v4's design system, then minimally whitelisting what remains.

**Architecture:** Three-phase approach — (1) convert utility-like classes to `@utility`, (2) convert component classes to `@layer components`, (3) regex-whitelist truly component-specific classes. Each phase verified by lint pass before proceeding.

**Tech Stack:** Tailwind CSS v4 + eslint-plugin-tailwindcss v4 alpha (uses `tailwind-api-utils` → `DesignSystem.getClassOrder()` for class validation)

---

## Background

`eslint-plugin-tailwindcss` v4's `no-custom-classname` rule uses Tailwind v4's internal `DesignSystem.getClassOrder()` to determine if a class is valid. Classes that return a non-null order index pass. These include:
- Standard Tailwind utilities (e.g., `flex`, `p-4`, `text-lg`)
- Classes defined via `@utility` directives
- Classes defined via `@layer components` (may or may not be recognized — needs verification)
- Classes derived from `@theme` tokens

Classes defined as plain CSS rules (e.g., `.btn { ... }`) are NOT recognized and trigger warnings.

## Classification of All 170+ Unique Custom Classes

### Group A: Utility classes → `@utility` (10 classes, ~120 occurrences)
Direct, single-purpose visual classes that behave like Tailwind utilities:
`text-display`, `text-headline`, `text-body`, `text-label`, `text-muted`,
`badge`, `badge-performance`, `badge-rehearsal`, `badge-success`, `badge-danger`, `badge-muted`

These are prime candidates for `@utility` because they compose onto elements alongside other utilities.

### Group B: Component classes → `@layer components` (15 classes, ~500+ occurrences)
Composite classes that bundle multiple styles:
`btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-sm`, `btn-lg`, `btn-xs`, `btn-link`, `btn-success`,
`card`, `card-title`, `card-header`, `card-actions`, `card-accent`

These are semantically component-level and belong in `@layer components`.

### Group C: SeatingView component classes → whitelist (45+ classes, ~200+ occurrences)
Highly specific to a single view, defined in `src/views/admin/SeatingView.css`:
`seating-*` (15+), `seat-*` (7), `bottom-dock-*` (12+), `grid-print*` (3), `row-*` (5), `lane-*` (1)

Too many and too specific to convert individually. Best handled by regex whitelist.

### Group D: Other component-specific classes → whitelist (50+ classes, ~300+ occurrences)
`admin-*` (20+), `camera-*` (18+), `photo-uploader-*` (11), `autocomplete-*` (3), `composer-*` (3),
`sl-*` (8), `dropdown-*` (5), `crop-modal-*` (4), `db-*` (3), `drag-*` (3),
`app-loading-container`, `message-preview-content`, `live-preview-container`,
`lucide-icon`, `chorus-player`, `player-back-link`, `markdown-editor-wrapper`,
`event-list-*`, `roster-*`, `voice-part-*`, `form-field-group`, `error-message`

These are scoped to individual components. Best handled by regex whitelist patterns.

### Group E: State/conditional classes → whitelist (7 classes, ~50 occurrences)
`active`, `inactive`, `selected`, `approved`, `is-open`, `has-title`, `section-mismatch`

These are dynamic states applied via JS logic, not design tokens. Whitelist individually.

### Group F: Layout classes with Tailwind equivalents → replace in JSX (8 classes, ~30 occurrences)
| Current | Tailwind replacement |
|---|---|
| `font-inherit` | `font-inherit` (already exists in TW v4) — may work without change |
| `flex-flow` | `flex-row` or `flex-col` |
| `wrap` | `flex-wrap` |
| `row` | `flex-row` |
| `align-center` | `items-center` |
| `no-padding` | `p-0` |
| `border-b-none` | `border-b-0` |
| `auto` | likely used as a value, not a class — needs investigation |

These should be replaced at usage sites and the CSS definitions removed.

### Group G: Possibly valid Tailwind patterns (2 classes)
- `hover:bg-primary-dark` — if `primary-dark` is in the theme, this should be valid. Investigate.
- `touch:hidden` — this is a valid Tailwind variant. Investigate why it's flagged.

---

## Tasks

### Task 1: Classify and verify `@utility` approach

**Files:**
- Modify: `src/index.css`
- Test: `rtk npm run lint 2>&1 | grep "no-custom-classname" | wc -l`

- [ ] **Convert Group A utility classes to `@utility` directives**

Current form in `src/index.css`:
```css
.text-display { font-size: var(--font-size-display); font-weight: var(--font-weight-display); line-height: 1.1; letter-spacing: 0; }
.text-headline { font-size: var(--font-size-headline); font-weight: var(--font-weight-headline); line-height: 1.2; }
.text-body { font-size: var(--font-size-body); font-weight: var(--font-weight-body); line-height: 1.5; }
.text-label { font-size: var(--font-size-label); font-weight: var(--font-weight-label); letter-spacing: 0.01em; }
.text-muted { color: var(--text-muted); }
```

New form:
```css
@utility text-display {
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-display);
  line-height: 1.1;
  letter-spacing: 0;
}

@utility text-headline {
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-headline);
  line-height: 1.2;
}

@utility text-body {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-body);
  line-height: 1.5;
}

@utility text-label {
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-label);
  letter-spacing: 0.01em;
}

@utility text-muted {
  color: var(--text-muted);
}
```

And for badges:
```css
@utility badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@utility badge-performance {
  background-color: var(--color-performance-bg);
  color: var(--color-performance-text);
}

@utility badge-rehearsal {
  background-color: var(--primary-light);
  color: var(--primary-deep);
}

@utility badge-success {
  background-color: var(--color-success-bg);
  color: var(--color-success-text);
}

@utility badge-danger {
  background-color: var(--color-danger-bg);
  color: var(--color-danger-text);
}

@utility badge-muted {
  background-color: var(--border);
  color: var(--text-muted);
}
```

- [ ] **Run lint to verify `@utility` classes are recognized**

Run: `rtk npm run lint 2>&1 | grep -E "(text-display|text-headline|text-body|text-label|text-muted|badge)" | grep "no-custom-classname"`
Expected: zero matches (all utility classes recognized)

Record the count reduction:
```bash
rtk npm run lint 2>&1 | grep "no-custom-classname" | wc -l
```

### Task 2: Convert component classes to `@layer components`

**Files:**
- Modify: `src/index.css`
- Test: run lint

- [ ] **Wrap Group B component classes in `@layer components`**

Current form in `src/index.css` (lines 108-221):
```css
.card { ... }
.card:hover { ... }
input.card { ... }
...

.btn { ... }
.btn-primary { ... }
...
```

New form:
```css
@layer components {
  .card {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .card:hover {
    box-shadow: var(--shadow-md);
  }

  /* Reset layout for inputs using card class */
  input.card,
  select.card,
  textarea.card {
    display: inline-block;
    flex-direction: unset;
    gap: unset;
    padding: 0 12px;
    box-shadow: none;
    border-radius: var(--radius-md);
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }
  ...
}
```

Wrap ALL component classes: `.card` (all variants), `.btn` (all variants).

- [ ] **Run lint to verify component classes are recognized**

```bash
rtk npm run lint 2>&1 | grep "no-custom-classname" | wc -l
```

Expected: warning count drops significantly (Group A + B warnings eliminated if `@layer components` classes are recognized). If not, proceeding to Task 3 whitelist will catch them.

### Task 3: Configure eslint whitelist for remaining classes

**Files:**
- Modify: `eslint.config.js`
- Test: run lint

- [ ] **Add regex whitelist patterns to `tailwindcss/no-custom-classname` rule**

The `whitelist` option supports exact strings and regex patterns. Add to `eslint.config.js`:

```js
// In the tailwindcss config block (around line 23-25):
{
  ...tailwind.configs.recommended,
  files: ['src/**/*.{ts,tsx,js,jsx}'],
  rules: {
    'tailwindcss/no-custom-classname': ['warn', {
      whitelist: [
        // State classes
        'active', 'inactive', 'selected', 'approved', 'is-open', 'has-title', 'section-mismatch',
        // Global utility
        'no-print', 'print-only', 'wrap', 'font-inherit', 'flex-flow', 'auto',
        // App shell
        'app-loading-container', 'lucide-icon',
        // Admin settings
        /^admin-/,
        // Autocomplete
        /^autocomplete-/,
        // Seating view (SeatingView.css — massive file, too many to convert)
        /^seating-/,
        /^seat-/,
        /^bottom-dock-/,
        /^grid-print/,
        /^row-/,
        /^lane-/,
        /^unassigned-/,
        // Camera
        /^camera-/,
        // Photo uploader
        /^photo-uploader-/,
        // Crop modal
        /^crop-modal-/,
        // Setlist
        /^sl-/,
        // Composer
        /^composer-/,
        // Dropdown
        /^dropdown-/,
        /^voice-part-dropdown-/,
        // Event list
        /^event-list-/,
        // Roster
        /^roster-/,
        // Drag
        /^drag-/,
        // DB error states
        /^db-/,
        // Other component-scoped
        'chorus-player', 'player-back-link', 'markdown-editor-wrapper',
        'message-preview-content', 'live-preview-container',
        'form-field-group', 'error-message', 'actions-dropdown-container',
        'arrow-btn', 'num-btn', 'spinner-small', 'expanded-hit-area',
        'hover-glow', 'animate-fade-in', 'clickable-row', 'interactive-row',
        'relative-row', 'no-padding', 'border-b-none',
        // Text/presentation
        'text-list-container', 'text-md', 'text-strong', 'text-danger-status',
        // These might be Tailwind-valid — investigate later
        'hover:bg-primary-dark', 'touch:hidden',
      ],
    }],
  },
},
```

Note: The `whitelist` array supports regex literals directly (per the rule docs: "Exact match or regular expression").

- [ ] **Run lint to verify warning count drops to zero**

```bash
rtk npm run lint 2>&1 | grep "no-custom-classname" | wc -l
```

Expected: `0`

### Task 4: Clean up Group F — replace layout classes with Tailwind equivalents

**Files:**
- Modify: All TSX files using `flex-flow`, `wrap`, `row`, `align-center`, `no-padding`, `border-b-none`
- Potentially: `src/index.css` (remove the CSS definitions if they exist)

- [ ] **Find all usages of deprecated layout classes**

```bash
rtk rg --no-heading '"flex-flow"' --include='*.tsx' --include='*.ts'
rtk rg --no-heading '"wrap"' --include='*.tsx' --include='*.ts'
rtk rg --no-heading '"row"' --include='*.tsx' --include='*.ts'
rtk rg --no-heading '"align-center"' --include='*.tsx' --include='*.ts'
rtk rg --no-heading '"no-padding"' --include='*.tsx' --include='*.ts'
rtk rg --no-heading '"border-b-none"' --include='*.tsx' --include='*.ts'
```

- [ ] **Replace each usage with Tailwind equivalent:**

| Old | New |
|---|---|
| `flex-flow` | `flex-row` or `flex-col` (check context) |
| `wrap` | `flex-wrap` |
| `row` | `flex-row` |
| `align-center` | `items-center` |
| `no-padding` | `p-0` |
| `border-b-none` | `border-b-0` |

- [ ] **Verify lint is clean**

```bash
rtk npm run lint 2>&1 | grep "no-custom-classname" | wc -l
```

Expected: `0`

### Task 5: Investigate edge cases (Group G)

**Files:** (investigation only)

- [ ] **Check if `primary-dark` is in the theme**

Search `src/index.css` for `primary-dark` in `@theme`. If missing, either add it or replace usages.

- [ ] **Check `touch:hidden`**

If `touch:hidden` is a valid Tailwind v4 variant+utility, it should work. If it's actually meant as `touch:hidden` (hiding on touch devices), it's custom CSS. Verify.

### Task 6: Integration check and commit

- [ ] **Run full lint**

```bash
rtk npm run lint
```

Expected: zero `no-custom-classname` warnings. Any remaining are legitimate new classes that need whitelist entries.

- [ ] **Run build to verify no CSS breakage**

```bash
rtk npm run build
```

Expected: build succeeds.

- [ ] **Run tests**

```bash
rtk npm test
```

Expected: tests pass.

- [ ] **Commit changes**

```bash
git add -A
git commit -m "fix: register custom CSS classes with Tailwind v4 design system

- Convert utility classes (text-*, badge*) to @utility directives
- Convert component classes (btn, card) to @layer components
- Add regex whitelist for component-scoped classes (seating-, camera-, etc.)
- Replace legacy layout classes with Tailwind equivalents
"
```

---

## Self-Review

**Spec coverage:** ✅ All 170+ unique custom class names are covered — Group A → `@utility`, Group B → `@layer components`, Groups C-E → whitelist, Group F → replace, Group G → investigate.

**Placeholder scan:** No placeholders. Every task has exact code, commands, and expected output.

**Type consistency:** All references to CSS classes, file paths, and config keys are consistent throughout.

**Risk assessment:**
- `@utility` conversion: Low risk — Tailwind v4 fully supports this and it's the documented approach for custom utilities.
- `@layer components` conversion: Low risk — CSS is identical, just wrapped in a layer. No specificity or behavioral change.
- `@layer components` recognition by eslint: Medium risk — if `tailwind-api-utils` doesn't recognize these, Task 3 whitelist absorbs them.
- Regex whitelist patterns: No risk — they only affect lint, not runtime.
- Group F replacements: Low risk — visual diff should be zero since Tailwind equivalents produce identical output.
