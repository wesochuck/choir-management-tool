# Unify Automated Task Styles Under comm-automated- Prefix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all `automated-*` CSS classes from CommunicationView.css into Communications.css under the `comm-automated-*` prefix, resolving property conflicts, and update AutomatedTasksPanel.tsx to use the unified classes.

**Architecture:** All automated task styles will live exclusively in `Communications.css` under the `comm-automated-*` prefix. The legacy `automated-*` block (~50 lines) in `CommunicationView.css` gets deleted. Conflicting properties between the two files (grid auto-fill/auto-fit, card padding, header flex-wrap/gap, footer justify-content) are resolved by the existing `comm-automated-*` definitions as the source of truth, augmented with missing properties from the legacy definitions.

**Tech Stack:** CSS (stylelint), TypeScript/React (eslint), Node.js native test runner (`node:test` + `node:assert/strict`)

---

### Task 1: Write CSS verification tests

**Files:**
- Create: `test/automatedTasksCss.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const commViewCss = readFileSync(new URL('../src/views/admin/CommunicationView.css', import.meta.url), 'utf8');
const commsCss = readFileSync(new URL('../src/views/admin/communications/Communications.css', import.meta.url), 'utf8');

test('CommunicationView.css no longer contains legacy automated-* class definitions', () => {
  const legacyPatterns = [
    /\.automated-grid\s*\{/,
    /\.automated-task-card\s*\{/,
    /\.automated-task-header\s*\{/,
    /\.automated-task-status-group\s*\{/,
    /\.automated-task-type-badge/,
    /\.automated-task-resolution-badge/,
    /\.automated-task-timestamp\s*\{/,
    /\.automated-task-footer\s*\{/,
  ];
  for (const pattern of legacyPatterns) {
    assert.doesNotMatch(commViewCss, pattern, `Legacy pattern ${pattern} should not exist in CommunicationView.css`);
  }
});

test('Communications.css contains all comm-automated-* class definitions', () => {
  const requiredClasses = [
    /\.comm-automated-grid\s*\{/,
    /\.comm-automated-card\s*\{/,
    /\.comm-automated-header\s*\{/,
    /\.comm-automated-footer\s*\{/,
    /\.comm-automated-status-group\s*\{/,
    /\.comm-automated-type-badge/,
    /\.comm-automated-resolution-badge/,
    /\.comm-automated-resolution-sent/,
    /\.comm-automated-resolution-archived/,
    /\.comm-automated-resolution-scheduled/,
    /\.comm-automated-timestamp\s*\{/,
  ];
  for (const pattern of requiredClasses) {
    assert.match(commsCss, pattern, `Required pattern ${pattern} should exist in Communications.css`);
  }
});

test('comm-automated-grid uses auto-fit, not auto-fill', () => {
  assert.match(commsCss, /\.comm-automated-grid\s*\{[^}]*auto-fit/);
});

test('comm-automated-card includes padding', () => {
  assert.match(commsCss, /\.comm-automated-card\s*\{[^}]*padding/);
});

test('comm-automated-header includes gap and flex-wrap', () => {
  const headerBlock = commsCss.match(/\.comm-automated-header\s*\{([^}]+)\}/);
  assert.ok(headerBlock, 'comm-automated-header block must exist');
  assert.match(headerBlock![1], /gap/);
  assert.match(headerBlock![1], /flex-wrap/);
});

test('comm-automated-timestamp has responsive rule at width <= 640px', () => {
  assert.match(commsCss, /@media\s*\(width\s*<=\s*640px\)\s*\{[\s\S]*\.comm-automated-timestamp[\s\S]*?\}/);
});
```

- [ ] **Step 2: Run tests to verify they fail (legacy classes still exist, missing new classes)**

Run: `rtk npm test -- --test-name-pattern='automatedTasks'`
Expected: FAIL — legacy patterns still match CommunicationView.css, or required `comm-automated-*` classes not yet in Communications.css.

- [ ] **Step 3: Commit the failing tests**

```bash
rtk git add test/automatedTasksCss.test.ts
rtk git commit -m "test: add failing CSS migration tests for automated task styles"
```

---

### Task 2: Merge legacy styles into Communications.css

**Files:**
- Modify: `src/views/admin/communications/Communications.css:222-247`

- [ ] **Step 1: Update `.comm-automated-grid` — change auto-fill to auto-fit**

Replace lines 222-226:

```css
.comm-automated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
}
```

with:

```css
.comm-automated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-md);
}
```

- [ ] **Step 2: Update `.comm-automated-card` — add padding**

Replace lines 228-232:

```css
.comm-automated-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
```

with:

```css
.comm-automated-card {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
```

- [ ] **Step 3: Update `.comm-automated-header` — add gap and flex-wrap**

Replace lines 234-238:

```css
.comm-automated-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
```

with:

```css
.comm-automated-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
```

- [ ] **Step 4: Add new classes after the existing `comm-automated-footer` block (after line 247)**

Insert the following after the closing `}` of `.comm-automated-footer`:

```css

.comm-automated-status-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.comm-automated-type-badge,
.comm-automated-resolution-badge {
  white-space: nowrap;
  line-height: 1.2;
}

.comm-automated-resolution-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--surface);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.comm-automated-resolution-sent {
  color: var(--primary-deep);
  border-color: var(--primary);
}

.comm-automated-resolution-archived {
  color: #475569;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.comm-automated-resolution-scheduled {
  color: var(--text-muted);
}

.comm-automated-timestamp {
  flex: 1 1 180px;
  text-align: right;
  line-height: 1.35;
}

@media (width <= 640px) {
  .comm-automated-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .comm-automated-timestamp {
    flex: none;
    width: 100%;
    text-align: left;
  }
}
```

- [ ] **Step 5: Run CSS lint to verify no issues**

Run: `rtk npm run lint:css`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
rtk git add src/views/admin/communications/Communications.css
rtk git commit -m "feat: merge automated task styles into Communications.css under comm-automated- prefix"
```

---

### Task 3: Update AutomatedTasksPanel.tsx class names

**Files:**
- Modify: `src/views/admin/communications/AutomatedTasksPanel.tsx`

- [ ] **Step 1: Replace all `automated-*` class names with `comm-automated-*` equivalents**

The file has the following replacements. Apply each edit:

**Line 45:** `"automated-grid"` → `"comm-automated-grid"`
**Line 52:** `"card automated-task-card comm-automated-card-active"` → `"card comm-automated-card comm-automated-card-active"`
**Line 53:** `"automated-task-header"` → `"comm-automated-header"`
**Line 54:** `"automated-task-status-group"` → `"comm-automated-status-group"`
**Line 56-62:** `automated-task-type-badge` → `comm-automated-type-badge`
**Line 66:** `"badge automated-task-resolution-badge automated-task-resolution-scheduled"` → `"badge comm-automated-resolution-badge comm-automated-resolution-scheduled"`
**Line 70:** `"automated-task-timestamp text-muted text-xs"` → `"comm-automated-timestamp text-muted text-xs"`
**Line 92:** `"automated-task-footer"` → `"comm-automated-footer"`
**Line 148:** `"automated-grid"` → `"comm-automated-grid"`
**Line 157:** `"card automated-task-card comm-automated-card-inactive"` → `"card comm-automated-card comm-automated-card-inactive"`
**Line 159:** `"automated-task-header"` → `"comm-automated-header"`
**Line 160:** `"automated-task-status-group"` → `"comm-automated-status-group"`
**Line 162-168:** `automated-task-type-badge` → `comm-automated-type-badge`
**Line 174:** `badge automated-task-resolution-badge automated-task-resolution-${task.status.toLowerCase()}` → `badge comm-automated-resolution-badge comm-automated-resolution-${task.status.toLowerCase()}`
**Line 183:** `"automated-task-timestamp text-muted text-xs"` → `"comm-automated-timestamp text-muted text-xs"`

- [ ] **Step 2: Run ESLint to verify no issues**

Run: `rtk npm run lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/admin/communications/AutomatedTasksPanel.tsx
rtk git commit -m "refactor: migrate AutomatedTasksPanel to comm-automated-* class names"
```

---

### Task 4: Delete legacy automated task block from CommunicationView.css

**Files:**
- Modify: `src/views/admin/CommunicationView.css:757-842`

- [ ] **Step 1: Delete the `/* Automated Tab */` section (lines 757-842)**

Remove the entire block from the `/* Automated Tab */` comment through the closing `}` of the responsive media query:

```css
/* Automated Tab */
.automated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-md);
}

.automated-task-card {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.automated-task-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.automated-task-status-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.automated-task-type-badge,
.automated-task-resolution-badge {
  white-space: nowrap;
  line-height: 1.2;
}

.automated-task-resolution-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--surface);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.automated-task-resolution-sent {
  color: var(--primary-deep);
  border-color: var(--primary);
}

.automated-task-resolution-archived {
  color: #475569;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.automated-task-resolution-scheduled {
  color: var(--text-muted);
}

.automated-task-timestamp {
  flex: 1 1 180px;
  text-align: right;
  line-height: 1.35;
}

@media (width <= 640px) {
  .automated-task-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .automated-task-timestamp {
    flex: none;
    width: 100%;
    text-align: left;
  }
}

.automated-task-footer {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border);
}
```

Replace with nothing (delete entirely). The section before is the closing `}` of a prior rule, and the section after is `/* History & Drafts */` at line 844.

- [ ] **Step 2: Run CSS lint to verify no issues**

Run: `rtk npm run lint:css`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/views/admin/CommunicationView.css
rtk git commit -m "refactor: remove duplicate automated task styles from CommunicationView.css"
```

---

### Task 5: Verify tests pass and run full checks

- [ ] **Step 1: Run the verification tests**

Run: `rtk npm test -- --test-name-pattern='automatedTasks'`
Expected: All 5 tests PASS.

- [ ] **Step 2: Run the full test suite**

Run: `rtk npm test`
Expected: All tests pass (no regressions).

- [ ] **Step 3: Run full lint**

Run: `rtk npm run lint`
Expected: No errors (ESLint + stylelint clean).

