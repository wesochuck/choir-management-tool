# Code Health Refactor Plan: Shared `useClickOutside` Hook

## 🎯 Objective

Eliminate duplicated click-outside and Escape-key dismissal logic across the React frontend by introducing a single, tested `useClickOutside` hook.

---

## 🔍 1. Issue Understanding

Seven components currently hand-roll their own `useEffect` that attaches a `document` `mousedown` listener (and sometimes a `keydown` listener for Escape) to close dropdowns, suggestion lists, or overflow menus. The implementations are nearly identical but duplicated throughout the codebase.

| File | Current Pattern | Listener Type |
|---|---|---|
| `src/components/admin/AutocompleteInput.tsx` | ref containment | `mousedown` |
| `src/components/admin/SetListInlineCreator.tsx` | ref containment | `mousedown` |
| `src/components/admin/ChartCopyDropdown.tsx` | ref containment | `mousedown` + `Escape` |
| `src/views/admin/music-library/MultiSelectDropdown.tsx` | ref containment | `mousedown` + `Escape` |
| `src/views/admin/communications/ComposePanel.tsx` | ref containment, conditional on open | `mousedown` |
| `src/views/admin/RosterView.tsx` | `closest()` selector | `mousedown` |
| `src/components/admin/EventList.tsx` | `closest()` selector | `mousedown` |

### Why this matters

- **Behavior drift risk:** Some components close on Escape, some do not; some guard with an `isOpen` flag, some do not.
- **Listener leak risk:** Cleanup logic is repeated, making it easier to introduce a missing removal.
- **Noise:** Each component contains ~10–20 lines of boilerplate unrelated to its domain logic.
- **Review burden:** Future changes to dismissal behavior (e.g., touch events, focus trapping) must be applied in many places.

---

## ⚖️ 2. Risk Assessment

| Question | Assessment |
|---|---|
| **Who depends on this code?** | UI dropdown / suggestion / overflow components only. No PocketBase hooks, migrations, or business-logic services are affected. |
| **Are there similar patterns elsewhere?** | Yes. `RosterView.tsx` and `EventList.tsx` use the same intent but rely on DOM selectors rather than refs. These are marked as follow-up work to keep the PR focused. |
| **What is the risk of breaking functionality?** | Low for the five ref-based components if we preserve the exact listener type (`mousedown`), cleanup timing, and optional Escape handling. The selector-based cases are intentionally out of scope for this PR. |
| **Scope creep risk?** | Medium if we try to refactor all seven files at once. This plan limits the first PR to the five ref-based cases. |

---

## 📋 3. Implementation Plan

### 3.1 Scope

Migrate the **five ref-based components** to a new shared hook:

1. `src/components/admin/AutocompleteInput.tsx`
2. `src/components/admin/SetListInlineCreator.tsx`
3. `src/components/admin/ChartCopyDropdown.tsx`
4. `src/views/admin/music-library/MultiSelectDropdown.tsx`
5. `src/views/admin/communications/ComposePanel.tsx`

Out of scope (follow-up):

- `src/views/admin/RosterView.tsx` — uses `closest('#voice-part-dropdown-container')`; should be converted to a ref first.
- `src/components/admin/EventList.tsx` — uses `closest('[data-event-overflow-anchor]')` because multiple dropdowns share state; needs a per-row ref strategy.

### 3.2 New file: `src/hooks/useClickOutside.ts`

```ts
import { useEffect, type RefObject } from 'react';

interface UseClickOutsideOptions {
  enabled?: boolean;
  escape?: boolean;
}

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  options: UseClickOutsideOptions = {}
): void {
  const { enabled = true, escape = false } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    if (escape) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      if (escape) {
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [enabled, escape, onClickOutside, ref]);
}
```

### 3.3 Example replacement pattern

Before:

```ts
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

After:

```ts
useClickOutside(containerRef, () => setShowSuggestions(false), {
  enabled: showSuggestions,
});
```

### 3.4 Per-component notes

| Component | Hook options | Notes |
|---|---|---|
| `AutocompleteInput.tsx` | `{ enabled: showSuggestions }` | Remove local `useEffect`. |
| `SetListInlineCreator.tsx` | `{ enabled: showSuggestions }` | Remove local `useEffect`. |
| `ChartCopyDropdown.tsx` | `{ enabled: isOpen, escape: true }` | Remove local `useEffect` that also handled Escape. |
| `MultiSelectDropdown.tsx` | `{ enabled: isOpen, escape: true }` | Remove both local `useEffect` blocks (mousedown and Escape). |
| `ComposePanel.tsx` | `{ enabled: isDropdownOpen }` | Remove local conditional `useEffect`. |

### 3.5 New tests: `src/hooks/useClickOutside.test.ts`

```ts
// @vitest-environment jsdom
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useRef, useState } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { useClickOutside } from './useClickOutside';

afterEach(() => {
  cleanup();
});

function TestComponent({
  enabled = true,
  escape = false,
}: {
  enabled?: boolean;
  escape?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [closed, setClosed] = useState(false);
  useClickOutside(ref, () => setClosed(true), { enabled, escape });
  return (
    <div ref={ref} data-testid="inside">
      <span data-testid="status">{closed ? 'closed' : 'open'}</span>
    </div>
  );
}

test('calls callback on mousedown outside', () => {
  render(React.createElement(TestComponent));
  fireEvent.mouseDown(document.body);
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'closed');
});

test('does not call callback on mousedown inside', () => {
  render(React.createElement(TestComponent));
  const inside = document.querySelector('[data-testid="inside"]');
  assert.ok(inside);
  fireEvent.mouseDown(inside);
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'open');
});

test('does not call callback when disabled', () => {
  render(React.createElement(TestComponent, { enabled: false }));
  fireEvent.mouseDown(document.body);
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'open');
});

test('calls callback on Escape when escape option is true', () => {
  render(React.createElement(TestComponent, { escape: true }));
  fireEvent.keyDown(document, { key: 'Escape' });
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'closed');
});

test('does not call callback on Escape when escape option is false', () => {
  render(React.createElement(TestComponent, { escape: false }));
  fireEvent.keyDown(document, { key: 'Escape' });
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'open');
});
```

---

## ✅ 4. Verification Checklist

Run after implementation:

```bash
rtk npm run lint
rtk npx vitest run src/hooks/useClickOutside.test.ts
rtk npm run test
rtk npm run build
```

Manual review checks:

- [ ] Each migrated component imports `useClickOutside` from `src/hooks/useClickOutside`.
- [ ] The `enabled` option matches the previous conditional behavior (e.g., `isOpen`, `showSuggestions`, `isDropdownOpen`).
- [ ] Components that previously closed on Escape pass `escape: true`.
- [ ] No `any` types, `// @ts-ignore`, or `// eslint-disable` comments are introduced.
- [ ] Generated files (especially `pocketbase/pb_hooks/main.pb.js`) are not edited.
- [ ] No behavioral changes are visible in the UI.

---

## ✨ 5. Expected Result

- Five components no longer contain duplicated listener-management boilerplate.
- A single, tested hook handles outside-click dismissal with optional Escape support.
- Lint, unit tests, and build remain green.
- The codebase is slightly easier to maintain and extend.

---

## 📝 6. Proposed PR

**Title:** `🧹 Extract shared useClickOutside hook to deduplicate dropdown dismissal logic`

**Description:**

- **What:** Replaces duplicated `useEffect` + `document.addEventListener('mousedown', …)` patterns with a single `useClickOutside` hook.
- **Why:** Improves maintainability by centralizing listener management, cleanup, and optional Escape handling; reduces the risk of behavior drift and listener leaks.
- **Verification:** Added unit tests for the hook; full lint/test/build passes; behavior preserved for all migrated components.
- **Result:** Five components now use a single, tested abstraction for outside-click dismissal.

---

## 🚀 7. Follow-up Opportunities

After this PR lands, the same hook can be applied to the remaining selector-based cases:

1. **Convert `RosterView.tsx`** — assign a ref to the voice-part dropdown container and replace the `closest('#voice-part-dropdown-container')` check with `useClickOutside`.
2. **Convert `EventList.tsx`** — store a ref to the currently active dropdown container (since only one is open at a time) and replace the `closest('[data-event-overflow-anchor]')` check.

Other code-health issues observed during analysis (not part of this plan):

- Duplicated MM:SS time formatting in `src/components/player/Player.tsx` and `src/views/LoginView.tsx`.
- Duplicated bulk-rehearsal date calculation in `src/services/eventService.ts` and `src/components/admin/BulkEventModal.tsx`.
- Oversized tabbed views (`MusicPieceModal.tsx`, `TicketingView.tsx`, `ComposePanel.tsx`) that mix data, state, and UI.
