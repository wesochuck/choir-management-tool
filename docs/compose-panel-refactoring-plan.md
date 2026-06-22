# ComposePanel Refactoring Plan

## Current State

**File:** `src/views/admin/communications/ComposePanel.tsx` — 1104 lines, 51 props.

| Aspect | Status |
|--------|--------|
| **Data fetching** | Already TanStack Query at parent level (`useCommunicationDraft`, `useCommunicationLibrary`, etc.). ComposePanel receives results via props — no internal fetching. |
| **Shoelace wrappers** | `<Button>` and `<Select>` imported from `src/components/ui/` and used in TARGETS/COMPOSE wizard steps. Not used in REVIEW step. |
| **Raw HTML** | ~12 raw `<button>`s (mostly REVIEW step), ~6 inline SVGs, ~20 raw `<input type="checkbox">` in voice part multi-select. |
| **Repeated patterns** | Stat cards (identical structure ×6 across two wizard steps), warning/alert banners (~12 copies, 3 color variants), sticky footer bars (×3), voice part multi-select (custom). |
| **Imports** | Already has `Button`, `Select` from `../../../components/ui`. No `Checkbox`, `Icon`, `Dropdown`, `Badge` imports yet. |

## Dependency Map

```
CommunicationView.tsx
  ├── useCommunicationDraft()      → filters, recipients, subject, content, mutations
  ├── useCommunicationLibrary()    → templates, commSettings, choirName
  ├── useCommunicationPreview()    → previewHtml, renderedSubject, renderedSmsBody
  ├── useEvents()                  → events
  ├── useVoiceParts()              → voicePartLabels, configSections
  └── useAuth()                    → user

ComposePanel receives everything by props (51 props in interface)
```

## Phase 1 — Extract Sub-Components

Rationale: Reduce file size from 1104 lines by extracting cohesive UI patterns into dedicated files under `src/views/admin/communications/`.

### 1a. `VoicePartSelector` (Update: Use native `<Select multiple>`)

Custom multi-select dropdown with sections + individual voice parts. Uses raw `<button>` toggle + raw `<input type="checkbox">` per item.

**Recommendation:** Instead of extracting a custom dropdown component, follow the new pattern established in `RosterView.tsx` and use the native Shoelace `<Select multiple>` wrapper with standard `<option>` tags.

**Reduces ComposePanel by:** ~90 lines (and avoids creating a new custom component).

### 1b. `AudienceStatCards` — extract from lines 398–436 and 755–853

The Total / Email / SMS stat card grid is identical in structure across TARGETS and REVIEW steps (6 instances total).

**Design:** Pure Tailwind, no Shoelace needed. Extract as a reusable component that accepts a list of stat card configs.

**Props interface:**
```ts
interface StatCardConfig {
  label: string;
  count: number;
  subtitle: string;
  color: 'neutral' | 'emerald' | 'blue';
}
interface AudienceStatCardsProps {
  cards: StatCardConfig[];
  onCardClick?: (index: number) => void;
}
```

**New file:** `src/views/admin/communications/AudienceStatCards.tsx`

**Reduces ComposePanel by:** ~120 lines.

### 1c. `AlertBanner` — extract the warning banner pattern

Identical structure repeated ~12 times across 3 color variants (amber/warning, blue/info, emerald/success). Each has: icon/emoji, bold title, body text, optional action button/link.

**Props interface:**
```ts
interface AlertBannerProps {
  variant: 'warning' | 'info' | 'success';
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}
```

**New file:** `src/views/admin/communications/AlertBanner.tsx`

Then compose into `PreFlightChecklist` (or keep inline — either way reduces repetition).

**Reduces ComposePanel by:** ~15 lines per banner × 12 = ~180 lines, plus eliminates the CSS duplication.

### 1d. `PreFlightChecklist` — extract from lines 857–1028

The pre-flight checklist panel in the REVIEW step. Composes `AlertBanner` instances and the sending actions card.

**Props as needed:** subject, content, messageType, selectedRecipients, filters, selectedEvent, commSettings, setTab, setEditingTemplate.

**New file:** `src/views/admin/communications/PreFlightChecklist.tsx`

**Reduces ComposePanel by:** ~170 lines.

### 1e. `ReviewSidebar` — extract from lines 722–1097

The entire right column of the REVIEW step: recipient summary card + pre-flight checklist + sending actions card.

This is the highest-level extraction from the REVIEW step. ComposePanel's REVIEW render drops to ~50 lines (back button + send buttons + `<ReviewSidebar>`).

**New file:** `src/views/admin/communications/ReviewSidebar.tsx`

**Reduces ComposePanel by:** ~380 lines.

### Impact of Phase 1

| Extraction | Lines removed from ComposePanel | New files |
|------------|--------------------------------|-----------|
| VoicePartSelector | ~90 | 0 (Use `<Select multiple>`) |
| AudienceStatCards | ~120 | 1 |
| AlertBanner | N/A (enabler) | 1 |
| PreFlightChecklist | ~170 | 1 |
| ReviewSidebar | ~380 | 1 |
| **Total** | **~760** | **3 new files** |

Result: ComposePanel drops from ~1104 lines to ~350 lines.

---

## Phase 2 — Replace Raw HTML with Wrappers

Replace remaining raw HTML elements with available Shoelace wrappers. This can happen incrementally, either before or after Phase 1.

### Button replacements

| Lines | Current | Replace with |
|-------|---------|-------------|
| 665–681 | Raw `<button>` with inline classes | `<Button variant="outline" onClick={...}>` with `<Icon name="chevron-left">` |
| 684–691, 1054–1073 | Raw "Send Test" `<button>` | `<Button variant="secondary" disabled={isSendingTest \|\| isSending}>` |
| 693–700, 1076–1095 | Raw "Send to N" `<button>` | `<Button variant="primary" disabled={isSending \|\| selectedRecipients.length === 0}>` |
| 756–786, 788–819, 821–852 | Raw stat card `<button>`s | If stat cards remain inline (not extracted), use `<Button variant="ghost">` or keep as `<button>` with Tailwind (they're complex with hover effects) |

### Checkbox replacements

| Lines | Current | Replace with |
|-------|---------|-------------|
| 339 | `<input type="checkbox">` in section list | `<Checkbox checked={...} onChange={...}>` |
| 365 | `<input type="checkbox">` in part list | `<Checkbox checked={...} onChange={...}>` |

**Note:** This is ~20 `<input>` total, but the pattern repeats in a `.map()` so it's 2 replace points.

### Icon replacements

| Lines | SVG meaning | Potential `<Icon name="...">` |
|-------|-------------|------------------------------|
| 318–327 | Chevron down (dropdown arrow) | `"chevron-down"` |
| 441–453 | Warning triangle | `"exclamation-triangle"` |
| 466–483 | Eye (view) | `"eye"` |
| 565–572 | Arrow left (back) | `"arrow-left"` or `"chevron-left"` |
| Various in REVIEW | Various arrows, people, mail, phone icons | Web Awesome equivalents |
| 1062–1072 | Letter icon (test) | `"envelope"` |
| 1082–1093 | Send icon (send) | `"send"` |

**Note:** Icon mapping requires checking Web Awesome catalog. Some complex SVGs (stat card icons, the compliance checkmark) may not have clean equivalents. Skip those and keep inline SVGs if no good match exists.

---

## Phase 3 — Push Hooks Down to Reduce Props

Currently ComposePanel receives data from parent that it could fetch itself. Moving these hooks reduces the prop interface and simplifies the parent.

### Candidates for hook push-down

| Prop | Current source | Suggested replacement | Risk |
|------|---------------|----------------------|------|
| `events` | `useEvents()` in CommunicationView | `useEvents()` directly in ComposePanel | **Medium** — The original plan suggested `usePublicEvents()`, but admin communications often target past/private events or rehearsals (not just upcoming ticketed events). Use the full admin `useEvents` query instead. |
| `voicePartLabels`, `configSections` | `useVoiceParts()` in CommunicationView | `useVoiceParts()` directly in ComposePanel (or `VoicePartSelector`) | Low — only ComposePanel uses these |
| `templates` | `useCommunicationLibrary()` in CommunicationView | `useCommunicationLibrary()` directly in ComposePanel | Medium — `useCommunicationLibrary` is also used by HistoryPanel, DraftsPanel, TemplatesPanel. If they share the same query key, no extra fetches. If they don't, potential duplication. |
| `commSettings` | `useCommunicationLibrary()` | Same as templates | Medium — same concern |
| `choirName` | `useCommunicationLibrary()` | Use `useDocumentTitle(choirName)` or push from context | Low |

### After push-down, props interface reduces from 51 → ~35

Props that stay (must come from parent):
- `wizardStep`, `setWizardStep` — parent-owned state
- `filters`, `updateFilter`, `recipients`, `selectedRecipients`, `recipientCounts` — from `useCommunicationDraft`
- `subject`, `setSubject`, `content`, `setContent`, `messageType`, `setMessageType` — from `useCommunicationDraft`
- `warnings` — computed from content/filters
- `previewHtml`, `renderedSubject`, `renderedSmsBody`, `previewRecipient` — from `useCommunicationPreview`
- `isSending`, `isSendingTest`, `isSavingDraft` — from mutations
- `handleSaveDraft`, `handleSendTest`, `sendMessage` — mutation triggers
- `onInsertPlaceholder` — local handler
- `editorRef` — parent-owned ref
- `onViewRecipients` — modal trigger
- `user` — from auth context
- `senderEmail` — config-derived
- `setTab`, `setEditingTemplate` — parent callbacks

---

## Phase 4 — CSS Cleanup

### Sticky footer bar pattern (×3)

Identical structure at lines 541–552, 587–596, 629–645:
```tsx
<div className="border-border bg-surface sticky inset-x-0 bottom-0 z-50 -mx-4 flex ... lg:static lg:mx-0 ... lg:shadow-none">
```

Extract to a `<StickyFooterBar>` sub-component or add to `AppCard`.

### Alert banner CSS (×12)

Already covered by `AlertBanner` extraction in Phase 1c.

---

## Execution Strategy

### Option A: Incremental (recommended)

Given the file is 1104 lines, do this in separate branches/PRs:

1. **PR 1:** Replace Voice Part `<input type="checkbox">` logic with native `<Select multiple>` (matching `RosterView.tsx`).
2. **PR 2:** Extract `AlertBanner` + `PreFlightChecklist` + `ReviewSidebar`.
3. **PR 3:** Extract `AudienceStatCards` + replace remaining raw `<button>`s with `<Button>`.
4. **PR 4:** Push hooks down (optional — only if props reduction is desired).
5. **PR 5:** SVG icon replacements (optional — cosmetic only).

### Option B: Single PR

Do all 4 phases in sequence. Requires careful verification after each extraction to avoid cascading issues.

**Risks with single PR:**
- Large diff (likely 600+ lines removed, 400+ added) is hard to review.
- If a sub-component has a bug, tracing it is harder in a single 1104-line file.
- Conflicts if other work touches `CommunicationView.tsx` props.

### Option C: Phase 1 only (sweet spot)

Do sub-component extractions + `<Select multiple>` replacements. Skip hooks push-down and icon replacements. This gives the biggest readability gain (~760 lines removed from ComposePanel) with the least risk of behavioral changes.

---

## Verification

After each extraction:

1. **ESLint:** `rtk node_modules/.bin/eslint --no-warn-ignored --max-warnings 0 src/views/admin/communications/`
2. **Tests:** `rtk npx vitest run test/views/admin/communications/` (create test file if none exists for ComposePanel)
3. **Type check:** `rtk npx tsc --noEmit` or verify via IDE that all props still match
4. **Manual check:** Verify each extracted component renders identically (sidebar cards still clickable, voice part selection still works, warning banners still colored correctly)

### Current test coverage

Check `test/views/admin/communications/` — if no tests exist for ComposePanel, add basic render tests for each extracted sub-component during Phase 1.
