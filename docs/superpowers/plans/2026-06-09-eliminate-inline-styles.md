# Eliminate Inline Styles & Shrink Whitelist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all static inline `style={{...}}` objects in 46 whitelisted source files to external CSS classes, annotate legitimate dynamic inline styles, and remove graduated files from both the ESLint rule whitelist and the codebase integrity test whitelist.

**Architecture:** Each whitelisted file is analyzed for `style={{` occurrences. Static styles are extracted into new or existing companion `.css` files using BEM-style class names. Truly dynamic styles (driven by component state or props) are annotated with `// @allow-inline-style - explanation`. Once all inline styles in a file are either migrated or annotated, the file is removed from both the ESLint rule's `legacyWhitelist` (`eslint-rules/no-hardcoded-inline-styles.js`) and the test's `legacyInlineStyleWhitelist` (`test/codebaseIntegrity.test.ts`). The ESLint rule enforces the policy at lint time; the test provides a safety net.

**Tech Stack:** TypeScript React, ESLint 10.3.0 custom rules, Vitest, CSS (no preprocessor)

---

## Prerequisites

The engineer must understand these constraints:

1. **Command prefix:** All shell commands use `rtk` (per AGENTS.md). Never run raw shell commands.
2. **CSS naming:** Use BEM-style class names scoped to the component (e.g., `.modal-overlay`, `.player-info-row`). Match existing naming in companion CSS files.
3. **CSS variables:** Use project CSS custom properties (`var(--space-md)`, `var(--primary)`, `var(--border)`, etc.) — do not hardcode pixel values unless the original style used them.
4. **Whitelist files:** TWO whitelists must stay in sync — `eslint-rules/no-hardcoded-inline-styles.js` line 20 (`legacyWhitelist`) and `test/codebaseIntegrity.test.ts` line 450 (`legacyInlineStyleWhitelist`).
5. **Dynamic vs static:** Static = all CSS values are hardcoded literals. Dynamic = any value uses a variable, prop, or expression. For dynamic, add annotation; do not try to extract to CSS.
6. **Files already clean** (zero `style={{`): These can graduate immediately — just remove from both whitelists. No code changes needed.

---

## Files That Need Zero Code Changes (Graduate Immediately)

These files contain no `style={{` usage. Remove from both whitelists:

| File |
|------|
| `src/views/PublicTicketPurchaseView.tsx` |
| `src/components/admin/SetListItemEditModal.tsx` |
| `src/components/LivePreview.tsx` |
| `src/components/admin/SingerRsvpHistoryTab.tsx` |
| `src/components/admin/SingerLookupModal.tsx` |
| `src/views/admin/music-library/MusicLibraryFilters.tsx` |
| `src/views/admin/music-library/MusicPieceModal.tsx` |
| `src/views/admin/SetListView.tsx` |
| `src/views/singer/ProfileView.tsx` |
| `src/views/PublicTicketListView.tsx` |
| `src/views/PublicTicketSuccessView.tsx` |
| `src/views/PublicBundlePurchaseView.tsx` |

---

### Task 0: Graduate Already-Clean Files

**Files:**
- Modify: `eslint-rules/no-hardcoded-inline-styles.js:20-69`
- Modify: `test/codebaseIntegrity.test.ts:450-501`

- [ ] **Step 1: Remove clean files from ESLint rule whitelist**

In `eslint-rules/no-hardcoded-inline-styles.js`, remove these entries from the `legacyWhitelist` Set:

```javascript
const legacyWhitelist = new Set([
  'src/App.tsx',
  'src/contexts/DialogContext.tsx',
  'src/components/admin/EventModal.tsx',
  'src/components/admin/MusicImportModal.tsx',
  'src/components/admin/SeatingBottomDock.tsx',
  'src/components/admin/EventRosterTable.tsx',
  'src/components/admin/BulkEventModal.tsx',
  'src/components/admin/SeatingFormationsEditor.tsx',
  'src/components/admin/EventList.tsx',
  'src/components/admin/AuditionModal.tsx',
  'src/components/admin/SortableSetListItem.tsx',
  'src/components/admin/RosterImportModal.tsx',
  'src/components/admin/SetListInlineCreator.tsx',
  'src/components/admin/CheckInList.tsx',
  'src/components/admin/SeatingGrid.tsx',
  'src/components/common/MarkdownEditor.tsx',
  'src/components/common/BaseModal.tsx',
  'src/components/common/PageLayout.tsx',
  'src/components/singer/EventCard.tsx',
  'src/components/player/Playlist.tsx',
  'src/components/player/Player.tsx',
  'src/views/PublicAuditionView.tsx',
  'src/views/admin/SeatingView.tsx',
  'src/views/admin/EventsView.tsx',
  'src/views/admin/EventRosterView.tsx',
  'src/views/admin/event-roster/useEventRosterExport.tsx',
  'src/views/admin/music-library/FloatingAudioPlayer.tsx',
  'src/views/admin/music-library/MusicLibraryTable.tsx',
  'src/views/admin/music-library/LearningTracksEditor.tsx',
  'src/views/admin/music-library/MultiSelectDropdown.tsx',
  'src/views/admin/events/useEventPlayerLink.tsx',
  'src/views/admin/events/EventsTabs.tsx',
  'src/views/admin/AttendanceView.tsx',
  'src/views/PublicPlayerView.tsx',
  'src/views/singer/SeatingFinderView.tsx',
  'src/views/singer/DashboardView.tsx',
]);
```

(Removed: `SetListItemEditModal`, `SingerRsvpHistoryTab`, `SingerLookupModal`, `LivePreview`, `MusicLibraryFilters`, `MusicPieceModal`, `SetListView`, `ProfileView`, `PublicTicketPurchaseView`, `PublicTicketListView`, `PublicTicketSuccessView`, `PublicBundlePurchaseView`)

- [ ] **Step 2: Remove clean files from test whitelist**

In `test/codebaseIntegrity.test.ts`, remove the 12 clean entries from the `legacyInlineStyleWhitelist` Set. Replace lines 450-501 with:

```typescript
  const legacyInlineStyleWhitelist = new Set([
    'src/App.tsx',
    'src/contexts/DialogContext.tsx',
    'src/components/admin/EventModal.tsx',
    'src/components/admin/MusicImportModal.tsx',
    'src/components/admin/SeatingBottomDock.tsx',
    'src/components/admin/EventRosterTable.tsx',
    'src/components/admin/BulkEventModal.tsx',
    'src/components/admin/SeatingFormationsEditor.tsx',
    'src/components/admin/EventList.tsx',
    'src/components/admin/AuditionModal.tsx',
    'src/components/admin/SortableSetListItem.tsx',
    'src/components/admin/RosterImportModal.tsx',
    'src/components/admin/SetListInlineCreator.tsx',
    'src/components/admin/CheckInList.tsx',
    'src/components/admin/SeatingGrid.tsx',
    'src/components/common/MarkdownEditor.tsx',
    'src/components/common/BaseModal.tsx',
    'src/components/common/PageLayout.tsx',
    'src/components/singer/EventCard.tsx',
    'src/components/player/Playlist.tsx',
    'src/components/player/Player.tsx',
    'src/views/PublicAuditionView.tsx',
    'src/views/admin/SeatingView.tsx',
    'src/views/admin/EventsView.tsx',
    'src/views/admin/EventRosterView.tsx',
    'src/views/admin/event-roster/useEventRosterExport.tsx',
    'src/views/admin/music-library/FloatingAudioPlayer.tsx',
    'src/views/admin/music-library/MusicLibraryTable.tsx',
    'src/views/admin/music-library/LearningTracksEditor.tsx',
    'src/views/admin/music-library/MultiSelectDropdown.tsx',
    'src/views/admin/events/useEventPlayerLink.tsx',
    'src/views/admin/events/EventsTabs.tsx',
    'src/views/admin/AttendanceView.tsx',
    'src/views/PublicPlayerView.tsx',
    'src/views/singer/SeatingFinderView.tsx',
    'src/views/singer/DashboardView.tsx',
  ]);
```

- [ ] **Step 3: Verify**

```bash
rtk npm run lint
rtk npm test
```

Expected: 0 lint errors, 590 tests pass.

- [ ] **Step 4: Commit**

```bash
rtk git add eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: graduate 12 clean files from inline style whitelists"
```

---

## Batch 1: Shared/Presentational Components

### Task 1: BaseModal.tsx — Extract Static Styles

**Files:**
- Create: `src/components/common/BaseModal.css`
- Modify: `src/components/common/BaseModal.tsx` (all 6 `style={{...}}` → CSS)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js` (remove from whitelist)
- Modify: `test/codebaseIntegrity.test.ts` (remove from whitelist)

**Current state:** 6 static styles, no CSS companion. Uses `maxWidth` and `minHeight` props — these are NOT dynamic style conditions; they are just primitive values passed to CSS. They must remain inline but are trivial.

- [ ] **Step 1: Create BaseModal.css**

```css
/* BaseModal — overlay, content, layout */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}

.modal-content {
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  gap: var(--space-lg);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  background-color: var(--surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
}

.modal-title-row {
  display: flex;
  align-items: center;
}

.modal-title-row h2 {
  margin: 0;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: auto;
}
```

- [ ] **Step 2: Update BaseModal.tsx**

Replace the JSX at lines 89-131. The `maxWidth` and `minHeight` props are single-CSS-value props that vary per instance — keep them as inline style on the content div. Replace the full JSX:

```tsx
  return (
    <div className="modal-overlay" role="presentation">
      <div
        ref={modalRef}
        className="card flex-col modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxWidth, minHeight }}
      >
        <div className="modal-title-row">
          <h2 id={titleId}>{title}</h2>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
```

Import the CSS at the top of the file (after existing imports):

```tsx
import './BaseModal.css';
```

- [ ] **Step 3: Remove from both whitelists**

Remove `'src/components/common/BaseModal.tsx',` from `eslint-rules/no-hardcoded-inline-styles.js` and `test/codebaseIntegrity.test.ts`.

**Note:** `maxWidth` and `minHeight` remain inline on the content div because they are variable prop values — they pass the ESLint rule since they're not `ObjectExpression` literals.

- [ ] **Step 4: Verify**

```bash
rtk npm run lint
rtk npm test
```

Expected: 0 lint errors, 590 tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/common/BaseModal.css src/components/common/BaseModal.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract BaseModal inline styles to CSS"
```

---

### Task 2: PageLayout.tsx — Annotate Dynamic Styles

**Files:**
- Modify: `src/components/common/PageLayout.tsx` (add `@allow-inline-style` annotations)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js` (remove from whitelist)
- Modify: `test/codebaseIntegrity.test.ts` (remove from whitelist)

**Current state:** 2 dynamic styles using `maxWidth` prop. No static styles to extract.

- [ ] **Step 1: Add annotations in PageLayout.tsx**

At line 31, change:
```tsx
style={{ maxWidth }}
```
to:
```tsx
// @allow-inline-style - maxWidth varies per page layout variant
style={{ maxWidth }}
```

At line 53, the same pattern. Change:
```tsx
style={{ maxWidth }}
```
to:
```tsx
// @allow-inline-style - maxWidth varies per page layout variant
style={{ maxWidth }}
```

- [ ] **Step 2: Remove from both whitelists**

Remove `'src/components/common/PageLayout.tsx',` from both `eslint-rules/no-hardcoded-inline-styles.js` and `test/codebaseIntegrity.test.ts`.

- [ ] **Step 3: Verify**

```bash
rtk npm run lint
rtk npm test
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/common/PageLayout.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: annotate PageLayout dynamic inline styles"
```

---

### Task 3: MarkdownEditor.tsx — Extract Static Style

**Files:**
- Modify: `src/components/common/MarkdownEditor.tsx` (move 1 static style to class)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js` (remove from whitelist)
- Modify: `test/codebaseIntegrity.test.ts` (remove from whitelist)

**Current state:** 1 static style `style={{ display: 'none' }}` at line 102.

- [ ] **Step 1: Update MarkdownEditor.tsx**

Add this CSS class to the component (prefer creating if no existing CSS file, or add to `src/App.css` if the component is small). Check if MarkdownEditor has an existing CSS import. If not:

At the top of the file, after imports:

```tsx
import './MarkdownEditor.css';
```

Replace:
```tsx
style={{ display: 'none' }}
```
with:
```tsx
className="markdown-editor-hidden"
```

- [ ] **Step 2: Optionally create MarkdownEditor.css**

If no existing CSS file is imported, create `src/components/common/MarkdownEditor.css`:

```css
.markdown-editor-hidden {
  display: none;
}
```

If the component already imports a CSS file, add the class there instead.

- [ ] **Step 3: Remove from both whitelists**

- [ ] **Step 4: Verify**

```bash
rtk npm run lint
rtk npm test
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/common/MarkdownEditor.tsx src/components/common/MarkdownEditor.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract MarkdownEditor inline style to CSS"
```

---

### Task 4: EventCard.tsx — Annotate Dynamic Styles

**Files:**
- Modify: `src/components/singer/EventCard.tsx` (add annotations)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js` (remove from whitelist)
- Modify: `test/codebaseIntegrity.test.ts` (remove from whitelist)

**Current state:** 2 dynamic styles using computed `styles` object (line 182-186, 194-196). CSS companion exists at `src/components/singer/EventCard.css`.

- [ ] **Step 1: Add annotations**

At lines 182-186:
```tsx
style={{ backgroundColor: styles.containerBg, border: styles.containerBorder, color: styles.containerColor }}
```
Add annotation:
```tsx
// @allow-inline-style - dynamic colors based on rehearsal miss statistics
style={{ backgroundColor: styles.containerBg, border: styles.containerBorder, color: styles.containerColor }}
```

At lines 194-196:
```tsx
style={{ backgroundColor: styles.badgeBg }}
```
Add annotation:
```tsx
// @allow-inline-style - dynamic badge color based on miss statistics
style={{ backgroundColor: styles.badgeBg }}
```

- [ ] **Step 2: Remove from both whitelists**

- [ ] **Step 3: Verify**

```bash
rtk npm run lint
rtk npm test
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/singer/EventCard.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: annotate EventCard dynamic inline styles"
```

---

## Batch 2: Media & Public Components

### Task 5: Playlist.tsx — Extract Static Styles

**Files:**
- Modify: `src/components/player/Playlist.tsx` (6 static styles → CSS)
- Modify: `src/components/player/Playlist.css` (add new classes)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

**Current state:** 6 static styles. CSS companion exists.

- [ ] **Step 1: Add CSS classes to Playlist.css**

```css
.playlist-track-index {
  font-size: 10px;
}

.playlist-action-button {
  background: none;
  border: none;
  cursor: pointer;
}

.playlist-action-button.accent {
  color: var(--accent-color);
}

.playlist-action-button.muted {
  color: var(--text-secondary);
}

.playlist-track-info {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
}

.playlist-track-title {
  font-weight: 600;
}

.playlist-track-artist {
  font-size: 0.75rem;
  opacity: 0.8;
}
```

- [ ] **Step 2: Update Playlist.tsx**

Replace inline styles:

Line 75:
```tsx
<span style={{ fontSize: '10px' }}>
```
→
```tsx
<span className="playlist-track-index">
```

Lines 88, 107 (two buttons with similar patterns):
```tsx
<button style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}>
```
→
```tsx
<button className="playlist-action-button accent">
```

```tsx
<button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
```
→
```tsx
<button className="playlist-action-button muted">
```

Lines 194-195:
```tsx
<div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
  <span style={{ fontWeight: 600 }}>
```
→
```tsx
<div className="playlist-track-info">
  <span className="playlist-track-title">
```

Line 201:
```tsx
<span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
```
→
```tsx
<span className="playlist-track-artist">
```

- [ ] **Step 3: Remove from both whitelists**

- [ ] **Step 4: Verify**

```bash
rtk npm run lint
rtk npm test
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/player/Playlist.tsx src/components/player/Playlist.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract Playlist inline styles to CSS"
```

---

### Task 6: Player.tsx — Extract Static Styles, Annotate Dynamic

**Files:**
- Modify: `src/components/player/Player.tsx` (4 static → CSS, 1 dynamic → annotate)
- Modify: `src/components/player/Player.css` (add new classes)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

**Current state:** 4 static, 1 dynamic (seekStyle at line 159 — `style={seekStyle}` is a variable reference, not an ObjectExpression, so it already passes the rule). Styles at lines 122, 139, 141, 210 are static.

- [ ] **Step 1: Add CSS classes to Player.css**

```css
.player-info-row {
  margin: 10px 0;
  padding: 10px;
  font-size: 0.9rem;
}

.player-track-badge {
  width: 60px;
  padding: 4px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}
```

For lines 139 and 141 (part badge conditional colors), these are dynamic CSS conditions — if they are conditionally chosen via ternary, annotate. If literally always the same, move to CSS. Check the actual code. If they are:

```tsx
style={{ background: 'var(--hover-bg)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}
```

And these appear in different branches of a conditional, they are dynamic (active vs inactive state). Annotate them:

```tsx
// @allow-inline-style - active part badge state
style={{ background: 'var(--hover-bg)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
// @allow-inline-style - inactive part badge state
style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}
```

Line 122 (info row):
```tsx
<div style={{ margin: '10px 0', padding: '10px', fontSize: '0.9rem' }}>
```
→
```tsx
<div className="player-info-row">
```

Line 210 (track badge):
```tsx
<span style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
```
→
```tsx
<span className="player-track-badge">
```

Line 159 (`style={seekStyle}`) — this is already a variable reference (not ObjectExpression). ESLint rule already allows it. No change needed.

- [ ] **Step 2: Remove from both whitelists**

- [ ] **Step 3: Verify**

```bash
rtk npm run lint
rtk npm test
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/player/Player.tsx src/components/player/Player.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract Player inline styles to CSS"
```

---

### Task 7: PublicPlayerView.tsx — Extract Static Styles

**Files:**
- Modify: `src/views/PublicPlayerView.tsx` (3 static → CSS)
- Modify: `src/views/PublicViews.css` (add classes at end)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

**Current state:** 3 static styles. CSS companion: `src/views/PublicViews.css`.

- [ ] **Step 1: Add to PublicViews.css**

```css
.public-player-loading {
  text-align: center;
  padding-top: 4rem;
}

.public-player-section {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.public-player-footer {
  margin-top: 2rem;
}
```

- [ ] **Step 2: Update PublicPlayerView.tsx**

Line 158:
```tsx
<div style={{ textAlign: 'center', paddingTop: '4rem' }}>
```
→
```tsx
<div className="public-player-loading">
```

Line 174:
```tsx
<p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
```
→
```tsx
<p className="public-player-section">
```

Line 209:
```tsx
<div style={{ marginTop: '2rem' }}>
```
→
```tsx
<div className="public-player-footer">
```

- [ ] **Step 3: Remove from both whitelists**

- [ ] **Step 4: Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/views/PublicPlayerView.tsx src/views/PublicViews.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract PublicPlayerView inline styles to CSS"
```

---

### Task 8: App.tsx & DialogContext.tsx — Extract Static Styles

**Files:**
- Modify: `src/App.tsx` (3 static styles → CSS)
- Modify: `src/App.css` (add new classes)
- Modify: `src/contexts/DialogContext.tsx` (6 static + 1 dynamic → annotate)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Add to App.css**

```css
.app-loading-container {
  text-align: center;
  padding-top: var(--space-xl);
}
```

- [ ] **Step 2: Update App.tsx**

Three identical occurrences of `style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}` at lines 77, 103, and 124. Replace all three:

```tsx
<div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>
```
→
```tsx
<div className="container app-loading-container">
```

- [ ] **Step 3: Update DialogContext.tsx**

Line 124-143 (toast container — all static):
```tsx
style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, backgroundColor: 'var(--text-color, #1f2937)', color: '#ffffff', padding: '12px 20px', borderRadius: 'var(--radius, 8px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', animation: 'toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards', pointerEvents: 'none' }}
```
→ add `className="dialog-toast"` and move all properties to CSS.

Create `src/contexts/DialogContext.css`:

```css
@keyframes toast-slide-in {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  background-color: var(--text-color, #1f2937);
  color: #ffffff;
  padding: 12px 20px;
  border-radius: var(--radius, 8px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  animation: toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  pointer-events: none;
}

.dialog-toast-icon {
  font-size: 15px;
}

.dialog-toast-body {
  gap: var(--space-md);
}

.dialog-toast-message {
  margin: 0;
  white-space: pre-wrap;
}

.dialog-toast-buttons {
  gap: 4px;
}

.dialog-toast-prompt-hint {
  text-align: right;
  font-size: 0.7rem;
  color: var(--text-muted);
}
```

Import CSS in DialogContext.tsx:
```tsx
import './DialogContext.css';
```

Replace the six inline style attributes:
- Toast container div: `className="dialog-toast"`
- Icon span (line 145): `className="dialog-toast-icon"`
- Body div (line 178): `className="dialog-toast-body"`
- Message (line 179): `className="dialog-toast-message"`
- Buttons row (line 183): `className="dialog-toast-buttons"`
- Prompt hint (line 203): `className="dialog-toast-prompt-hint"`

Line 190 (textarea prompting) — if it's hardcoded values, extract. If it references variables, annotate. Check the code and handle accordingly.

- [ ] **Step 4: Remove from both whitelists**

Remove `'src/App.tsx',` and `'src/contexts/DialogContext.tsx',` from both whitelists.

- [ ] **Step 5: Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/App.tsx src/App.css src/contexts/DialogContext.tsx src/contexts/DialogContext.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract App and DialogContext inline styles to CSS"
```

---

## Batch 3: Admin Modals

### Task 9: EventModal.tsx — Large Static Style Extraction

**Files:**
- Modify: `src/components/admin/EventModal.tsx` (~88 static styles → CSS classes)
- Modify: `src/components/admin/EventModal.css` (add new classes)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

**Current state:** ~91 static styles, 0 confirmed dynamic. CSS companion exists at `src/components/admin/EventModal.css`.

**Approach:** This file has the most inline styles of any whitelisted file. The styles follow predictable patterns:
- Flex wrappers: `style={{ gap: '...', display: 'flex', ... }}`
- Form inputs: `style={{ width: '100%', padding: '0 12px', ... }}`
- Labels/badges: `style={{ fontWeight: 600 }}`, `style={{ color: 'var(--primary-deep)' }}`
- Cards: `style={{ padding: 'var(--space-md)', backgroundColor: 'var(--primary-light)', ... }}`

- [ ] **Step 1: Read the current EventModal.css**

```bash
rtk cat src/components/admin/EventModal.css | wc -l
```

- [ ] **Step 2: Add CSS classes at the end of EventModal.css**

Add classes for recurring patterns:

```css
/* Inline-to-CSS refactor: layout wrappers */
.event-form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.event-form-row {
  display: flex;
  flex-direction: row;
  gap: var(--space-md);
  align-items: center;
}

.event-form-row-wrap {
  display: flex;
  flex-direction: row;
  gap: var(--space-md);
  align-items: center;
  flex-wrap: wrap;
}

.event-form-row-stretch {
  display: flex;
  flex-direction: row;
  gap: var(--space-md);
  align-items: stretch;
}

.event-form-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.event-form-compact {
  gap: var(--space-xs);
}

/* Form input styling */
.event-form-input {
  width: 100%;
  padding: 0 12px;
  height: 44px;
  border: 1px solid var(--border);
}

/* Typography */
.event-label-bold {
  font-weight: 600;
}

.event-label-heavy {
  font-weight: 700;
  color: var(--primary-deep);
}

/* Card/container accents */
.event-info-card {
  padding: var(--space-md);
  background-color: var(--primary-light);
  border-left: 4px solid var(--primary);
  border-radius: var(--radius-md);
}

.event-warning-card {
  padding: var(--space-md);
  background-color: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: var(--radius-md);
}

/* Status badges */
.event-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Ticket image preview */
.event-ticket-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  object-fit: contain;
}

.event-ticket-preview-remove {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 50%;
  cursor: pointer;
}
```

- [ ] **Step 3: Walk through EventModal.tsx and replace each inline style**

For each `style={{ gap: 'var(--space-md)' }}` on a div that already has `className="flex-col"`:
→ Add `className="flex-col event-form-section"`

For each `style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}`:
→ Add `className="event-form-input"` (keep existing classes)

For each `style={{ fontWeight: 600 }}`:
→ `className="event-label-bold"`

For each `style={{ fontWeight: 700, color: 'var(--primary-deep)' }}`:
→ `className="event-label-heavy"`

For each `style={{ padding: 'var(--space-md)', backgroundColor: 'var(--primary-light)', borderLeft: '4px solid var(--primary)', ... }}`:
→ `className="event-info-card"`

**Do this for ALL ~88 static inline styles in the file.** Each replacement must preserve any existing className — combine with the new one: `className="flex-col event-form-section"`.

- [ ] **Step 4: Remove from both whitelists**

- [ ] **Step 5: Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/components/admin/EventModal.tsx src/components/admin/EventModal.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract EventModal inline styles to CSS"
```

---

### Task 10: MusicImportModal.tsx — Annotate Dynamic

**Files:**
- Modify: `src/components/admin/MusicImportModal.tsx` (2 dynamic → annotate)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Add annotations**

Lines 396-398:
```tsx
style={{ backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined }}
```
→
```tsx
// @allow-inline-style - conditional error/warning background
style={{ backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined }}
```

Lines 462-464:
```tsx
style={{ width: `${importProgress}%` }}
```
→
```tsx
// @allow-inline-style - dynamic progress bar width
style={{ width: `${importProgress}%` }}
```

- [ ] **Step 2: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/components/admin/MusicImportModal.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: annotate MusicImportModal dynamic inline styles"
```

---

### Task 11: AuditionModal.tsx — Annotate Dynamic

**Files:**
- Modify: `src/components/admin/AuditionModal.tsx` (1 static → CSS/class or annotate, 5 dynamic → annotate)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

All 6 styles in AuditionModal are conditionally-driven (tab active state, `formData.scheduledTimeSlot`, `isChecked`). One is already annotated (`style={{ /* @allow-inline-style */ }}`). Add annotations to the remaining 5.

- [ ] **Step 1: Add annotations**

Lines 145-150:
```tsx
style={{ borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: activeTab === 'info' ? 600 : 500, color: activeTab === 'info' ? 'var(--primary)' : 'var(--text-muted)' }}
```
→
```tsx
// @allow-inline-style - tab active state indicator
style={{ borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: activeTab === 'info' ? 600 : 500, color: activeTab === 'info' ? 'var(--primary)' : 'var(--text-muted)' }}
```

Lines 158-163:
```tsx
style={{ borderBottom: activeTab === 'slots' ? '2px solid var(--primary)' : '2px solid transparent', ... }}
```
→
```tsx
// @allow-inline-style - tab active state indicator
style={{ borderBottom: activeTab === 'slots' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: activeTab === 'slots' ? 600 : 500, color: activeTab === 'slots' ? 'var(--primary)' : 'var(--text-muted)' }}
```

Lines 170-205:
```tsx
style={{ color: formData.scheduledTimeSlot ? 'var(--text)' : 'var(--text-muted)', fontWeight: formData.scheduledTimeSlot ? 700 : 400 }}
```
→
```tsx
// @allow-inline-style - dynamic based on scheduled time slot
style={{ color: formData.scheduledTimeSlot ? 'var(--text)' : 'var(--text-muted)', fontWeight: formData.scheduledTimeSlot ? 700 : 400 }}
```

Lines 288-292:
```tsx
style={{ border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)', backgroundColor: isChecked ? 'var(--primary-light)' : 'var(--bg)' }}
```
→
```tsx
// @allow-inline-style - checkbox checked state
style={{ border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)', backgroundColor: isChecked ? 'var(--primary-light)' : 'var(--bg)' }}
```

- [ ] **Step 2: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/components/admin/AuditionModal.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: annotate AuditionModal dynamic inline styles"
```

---

## Batch 4: Complex Layout Modules

### Task 12: SeatingGrid.tsx — Extract Static + Annotate Dynamic

**Files:**
- Modify: `src/components/admin/SeatingGrid.tsx` (~10 static → CSS, 17 dynamic → annotate)
- Create: `src/components/admin/SeatingGrid.css`
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

**Current state:** 27 styles (10 static, 17 dynamic). No CSS companion.

- [ ] **Step 1: Create SeatingGrid.css**

```css
.seating-grid-error {
  background-color: var(--color-danger-bg);
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  text-align: center;
}

.seating-grid-info {
  background-color: var(--primary-light);
  color: var(--primary-deep);
  border: 1px dashed var(--primary);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  text-align: center;
}

.seat-empty {
  min-height: 28px;
  height: 28px;
  width: 28px;
  background-color: var(--color-danger-bg);
}

.seat-add-button {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.seat-row-add-container {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
```

- [ ] **Step 2: Update SeatingGrid.tsx**

For STATIC styles: replace with new CSS classes.
For DYNAMIC styles: add `// @allow-inline-style - explanation` annotations.

Example replacements:
- Line 194-208 (error state): `className="seating-grid-error"`
- Line 228-240 (info state): `className="seating-grid-info"`
- Line 302-321 (empty seat): `className="seat-empty"`
- Line 480-483 (add button): `className="seat-add-button"`

Import CSS:
```tsx
import './SeatingGrid.css';
```

- [ ] **Step 3: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/components/admin/SeatingGrid.tsx src/components/admin/SeatingGrid.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract SeatingGrid static styles, annotate dynamic"
```

---

### Task 13: SeatingFormationsEditor.tsx — Extract Static + Annotate Dynamic

**Files:**
- Modify: `src/components/admin/SeatingFormationsEditor.tsx` (~26 static → CSS, 10 dynamic → annotate)
- Create: `src/components/admin/SeatingFormationsEditor.css`
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Create SeatingFormationsEditor.css**

```css
.formation-drag-handle {
  display: flex;
  align-items: center;
  color: inherit;
  opacity: 0.55;
  font-size: 1rem;
  cursor: grab;
  flex-shrink: 0;
}

.formation-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.formation-help-icon {
  cursor: help;
  flex-shrink: 0;
}

.formation-action-button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0 2px;
  font-size: 1rem;
  font-weight: bold;
  opacity: 0.65;
}

.formation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
}

.formation-badge-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.formation-message-error {
  align-self: flex-start;
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.formation-message-info {
  align-self: flex-start;
  background-color: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}
```

- [ ] **Step 2: Update SeatingFormationsEditor.tsx**

Replace static styles with CSS classes. For dynamic styles (dnd kit transform, `isExpanded`, `isRows`, `message` conditionals), add annotations:

```tsx
// @allow-inline-style - dnd-kit sortable transform
style={style}
```

```tsx
// @allow-inline-style - expansion toggle
style={{ display: isExpanded ? 'flex' : 'none', flexDirection: 'column', ... }}
```

```tsx
// @allow-inline-style - row vs grid layout toggle
style={{ display: 'flex', flexDirection: isRows ? 'column' : 'row', ... }}
```

Import CSS:
```tsx
import './SeatingFormationsEditor.css';
```

- [ ] **Step 3: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/components/admin/SeatingFormationsEditor.tsx src/components/admin/SeatingFormationsEditor.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract SeatingFormationsEditor static styles, annotate dynamic"
```

---

### Task 14: EventRosterTable.tsx — Extract Static + Annotate Dynamic

**Files:**
- Modify: `src/components/admin/EventRosterTable.tsx` (~10 static → CSS, 9 dynamic → annotate)
- Create: `src/components/admin/EventRosterTable.css`
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Create EventRosterTable.css**

```css
.roster-table-header-cell-center {
  text-align: center;
}

.roster-table-header-cell-right {
  text-align: right;
}

.roster-table-header-row {
  font-weight: 500;
}

.roster-table-header-name {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.roster-table-singer-link {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  color: var(--primary-deep);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: color 0.15s ease;
}

.roster-table-section-header {
  font-weight: 700;
  color: var(--primary);
}

.roster-table-voice-part-badge {
  font-size: 0.85rem;
}

.roster-table-note-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.roster-table-flex-col {
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 2: Update EventRosterTable.tsx**

Replace static styles with CSS classes. For dynamic styles (miss count badges, RSVP button colors), annotate:

```tsx
// @allow-inline-style - miss count color coding
style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', backgroundColor: missCounts[p.id] > (maxRehearsalMisses ?? 3) ? '#fee2e2' : '#fef3c7', ... }}
```

```tsx
// @allow-inline-style - RSVP status button coloring
style={{ height: '32px', padding: '0 12px', backgroundColor: s.rsvp === 'Yes' ? 'var(--primary-deep)' : 'transparent', ... }}
```

Import CSS:
```tsx
import './EventRosterTable.css';
```

- [ ] **Step 3: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/components/admin/EventRosterTable.tsx src/components/admin/EventRosterTable.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract EventRosterTable static styles, annotate dynamic"
```

---

## Batch 5: Admin List Components

### Task 15: BulkEventModal.tsx — Extract All Static Styles

**Files:**
- Modify: `src/components/admin/BulkEventModal.tsx` (20 static → CSS)
- Create: `src/components/admin/BulkEventModal.css`
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

**Current state:** All 20 styles are static (form fields, labels, layout).

- [ ] **Step 1: Create BulkEventModal.css**

```css
.bulk-event-form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.bulk-event-form-row {
  display: flex;
  flex-direction: row;
  gap: var(--space-md);
}

.bulk-event-form-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.bulk-event-form-input {
  width: 100%;
  padding: 0 12px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
}

.bulk-event-form-select {
  width: 100%;
  padding: 0 12px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
}

.bulk-event-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-deep);
  font-weight: 600;
  font-size: 0.875rem;
}

.bulk-event-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-deep);
  font-weight: 600;
  font-size: 0.875rem;
}

.bulk-event-helper-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
}
```

- [ ] **Step 2: Update BulkEventModal.tsx**

Replace all 20 `style={{...}}` attributes with `className="bulk-event-*"`. Import CSS at top:

```tsx
import './BulkEventModal.css';
```

- [ ] **Step 3: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/components/admin/BulkEventModal.tsx src/components/admin/BulkEventModal.css eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: extract BulkEventModal inline styles to CSS"
```

---

### Task 16: EventList.tsx — Extract Static Styles

**Files:**
- Modify: `src/components/admin/EventList.tsx` (19 static → CSS)
- Create: `src/components/admin/EventList.css`
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Create EventList.css**

```css
.event-list-card {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.event-list-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.event-list-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.event-list-date {
  font-weight: bold;
}

.event-list-venue {
  color: var(--primary);
}

.event-list-call-time-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.event-list-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.event-list-dropdown-container {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.event-list-dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
}

.event-list-dropdown-item {
  display: flex;
  align-items: center;
}
```

- [ ] **Step 2: Update EventList.tsx**

Replace all 19 static style attributes. Import CSS.

- [ ] **Step 3: Remove from both whitelists + Verify + Commit**

---

### Task 17: CheckInList.tsx — Annotate Dynamic

**Files:**
- Modify: `src/components/admin/CheckInList.tsx` (6 dynamic → annotate)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

**Current state:** All 6 styles are dynamic (present/absent check-in states). CSS companion exists.

- [ ] **Step 1: Add annotations to all 6 inline styles**

```tsx
// @allow-inline-style - present/absent state colors
style={{ opacity: isPresent ? 0.85 : 1, border: isPresent ? '1px solid var(--primary)' : isAbsent ? '1px solid #fca5a5' : '1px solid var(--border)', ... }}

// @allow-inline-style - present/absent text color
style={{ color: isPresent ? 'var(--primary-deep)' : isAbsent ? '#991b1b' : 'var(--text-main)' }}

// @allow-inline-style - miss count badge color
style={{ backgroundColor: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '#fee2e2' : '#fef3c7', ... }}

// @allow-inline-style - absent button state
style={{ backgroundColor: isAbsent ? '#ef4444' : 'var(--surface)', ... }}

// @allow-inline-style - present button state
style={{ backgroundColor: isPresent ? 'var(--primary)' : 'var(--surface)', ... }}
```

- [ ] **Step 2: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/components/admin/CheckInList.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: annotate CheckInList dynamic inline styles"
```

---

### Task 18: SeatingBottomDock.tsx — Extract Static + Annotate Dynamic

**Files:**
- Modify: `src/components/admin/SeatingBottomDock.tsx` (6 static → CSS, 1 dynamic → annotate)
- Create: `src/components/admin/SeatingBottomDock.css`
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: Create SeatingBottomDock.css**

```css
.seating-dock-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.seating-dock-button-group {
  gap: 2px;
}

.seating-dock-section-label {
  gap: var(--space-xs);
}

.seating-dock-action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  padding: 0 12px;
  height: 32px;
  min-height: 32px;
}

.seating-dock-close-button {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s;
}
```

- [ ] **Step 2: Update SeatingBottomDock.tsx**

Replace 6 static styles with CSS classes. For the dynamic grid template (line 177):

```tsx
// @allow-inline-style - dynamic grid columns based on section count
style={{ gridTemplateColumns: `repeat(${displaySections.length}, 1fr)` }}
```

Import CSS.

- [ ] **Step 3: Remove from both whitelists + Verify + Commit**

---

### Task 19: RosterImportModal.tsx — Annotate Dynamic

**Files:**
- Modify: `src/components/admin/RosterImportModal.tsx` (6 dynamic → annotate)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

All styles are conditional (error states, import progress, validation). Annotate all 6.

- [ ] **Step 1: Add annotations**

```tsx
// @allow-inline-style - conditional field validation border
style={{ borderColor: field.required && selectedIndex === -1 ? 'var(--red-light)' : undefined }}

// @allow-inline-style - conditional match border
style={{ borderColor: selectedIndex !== -1 ? 'var(--primary)' : undefined }}

// @allow-inline-style - error/warning status background
style={{ backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined }}

// @allow-inline-style - error text color
style={{ color: hasErrors ? '#c62828' : 'inherit' }}

// @allow-inline-style - dynamic progress bar width
style={{ width: `${importProgress}%` }}

// @allow-inline-style - error count text color
style={{ color: errorsList.length > 0 ? '#991b1b' : 'inherit' }}
```

- [ ] **Step 2: Remove from both whitelists + Verify + Commit**

---

### Task 20: SetListInlineCreator.tsx & SortableSetListItem.tsx — Annotate Dynamic

**Files:**
- Modify: `src/components/admin/SetListInlineCreator.tsx` (1 dynamic → annotate)
- Modify: `src/components/admin/SortableSetListItem.tsx` (1 dynamic → annotate)
- Modify: `eslint-rules/no-hardcoded-inline-styles.js`
- Modify: `test/codebaseIntegrity.test.ts`

- [ ] **Step 1: SetListInlineCreator.tsx**

```tsx
// @allow-inline-style - conditional border when library has results
style={{ borderTop: filteredLibrary.length > 0 ? '1px solid var(--border)' : 'none' }}
```

- [ ] **Step 2: SortableSetListItem.tsx**

```tsx
// @allow-inline-style - dnd-kit sortable transform and transition
style={{ ...style }}
```

- [ ] **Step 3: Remove both from whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/components/admin/SetListInlineCreator.tsx src/components/admin/SortableSetListItem.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: annotate SetListInlineCreator and SortableSetListItem dynamic styles"
```

---

## Batch 6: Simple Admin Views

### Task 21: EventsView.tsx — Extract Static Styles (8 styles, 0 dynamic)

**Files:**
- Modify: `src/views/admin/EventsView.tsx`
- Create: `src/views/admin/EventsView.css`
- Modify: both whitelists

```css
.events-loading {
  padding: var(--space-xl);
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: var(--space-md);
}

.events-spinner {
  width: 40px;
  height: 40px;
  border-width: 3px;
}

.events-spinner-text {
  opacity: 0.8;
}

.events-error {
  padding: var(--space-xl);
  border-color: var(--color-danger-text);
  background-color: var(--color-danger-bg);
  align-items: center;
  text-align: center;
  max-width: 500px;
  margin: var(--space-xl) auto;
}

.events-error-icon {
  font-size: 2rem;
}

.events-error-message {
  color: var(--color-danger-text);
}

.events-error-detail {
  color: var(--color-danger-text);
  opacity: 0.8;
}

.events-list-gap {
  gap: var(--space-lg);
}
```

Replace all 8 inline styles, import CSS, remove from whitelists, verify, commit.

---

### Task 22: EventsTabs.tsx — Extract Static Styles (5 styles, 0 dynamic)

**Files:**
- Modify: `src/views/admin/events/EventsTabs.tsx`
- Create: `src/views/admin/events/EventsTabs.css`
- Modify: both whitelists

```css
.events-tabs-container {
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
  gap: var(--space-md);
  flex-wrap: wrap;
  margin-bottom: var(--space-md);
  border-bottom: 1px solid var(--border);
  padding-bottom: var(--space-xs);
}

.events-tabs-nav {
  gap: var(--space-sm);
}

.events-tab-button {
  padding: 8px 16px;
  font-weight: 600;
  text-transform: capitalize;
}

.events-tab-checkbox-row {
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
```

Replace all 5 inline styles, import CSS, remove from whitelists, verify, commit.

---

### Task 23: useEventPlayerLink.tsx — Extract Static Styles

**Files:**
- Modify: `src/views/admin/events/useEventPlayerLink.tsx` (3 static → CSS)
- Create: `src/views/admin/events/useEventPlayerLink.css`
- Modify: both whitelists

```css
.event-player-link-row {
  gap: var(--space-md);
}

.event-player-link-url {
  padding: var(--space-sm);
  background-color: var(--bg);
  border: 1px solid var(--border);
  word-break: break-all;
  font-size: 0.85rem;
}

.event-player-link-actions {
  gap: var(--space-sm);
}
```

Replace all 3 inline styles, import CSS, remove from whitelists, verify, commit.

---

### Task 24: useEventRosterExport.tsx — Extract Static Styles

**Files:**
- Modify: `src/views/admin/event-roster/useEventRosterExport.tsx` (7 static → CSS)
- Create: `src/views/admin/event-roster/useEventRosterExport.css`
- Modify: both whitelists

```css
.roster-export-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.roster-export-info-box {
  padding: 12px;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.roster-export-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
}

.roster-export-count {
  font-size: 0.9rem;
  color: var(--text);
}

.roster-export-actions {
  display: flex;
  gap: var(--space-sm);
}

.roster-export-btn {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.roster-export-select {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
```

Replace all 7 inline styles, import CSS, remove from whitelists, verify, commit.

---

## Batch 7: Large Admin Views With Existing CSS

### Task 25: AttendanceView.tsx — Extract Static Styles (26 static, 0 dynamic)

**Files:**
- Modify: `src/views/admin/AttendanceView.tsx`
- Modify: `src/views/admin/AttendanceView.css` (append)
- Modify: both whitelists

**CSS companion exists.** Add these classes to the end of `src/views/admin/AttendanceView.css`:

```css
.attendance-event-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.attendance-badge-row {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.attendance-date-link {
  display: flex;
  align-items: center;
  gap: 4px;
}

.attendance-empty-card {
  padding: var(--space-xl);
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.attendance-error-card {
  padding: var(--space-xl);
  border-color: var(--color-danger-text);
  background-color: var(--color-danger-bg);
}

.attendance-error-text {
  color: var(--color-danger-text);
}

.attendance-empty-text {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.attendance-empty-heading {
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
}

.attendance-no-match-card {
  padding: var(--space-md);
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.attendance-rescue-card {
  padding: var(--space-md);
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  background-color: #fef2f2;
}

.attendance-rescue-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #991b1b;
}

.attendance-rescue-note {
  font-size: 0.75rem;
  color: #92400e;
}

.attendance-select {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text);
}

.attendance-folder-return {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.attendance-folder-return-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary-deep);
}
```

Replace all 26 inline styles in AttendanceView.tsx, remove from both whitelists, verify, commit.

---

### Task 26: EventRosterView.tsx — Extract Static + Annotate Dynamic (18 static, 9 dynamic)

**Files:**
- Modify: `src/views/admin/EventRosterView.tsx`
- Create: `src/views/admin/EventRosterView.css`
- Modify: both whitelists

```css
.event-roster-loading {
  padding: var(--space-xl);
  text-align: center;
}

.event-roster-sort-row {
  gap: var(--space-sm);
  align-items: center;
}

.event-roster-section-title {
  font-weight: 600;
}

.event-roster-controls {
  gap: var(--space-md);
}

.event-roster-rsvp-filters {
  display: flex;
  flex-direction: row;
  gap: var(--space-sm);
  align-items: center;
}

.event-roster-count {
  font-weight: 700;
}

.event-roster-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.event-roster-voice-part-section {
  gap: var(--space-md);
}

.event-roster-voice-part-card {
  padding: var(--space-md);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
}

.event-roster-voice-part-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.event-roster-voice-part-name {
  font-weight: 700;
  color: var(--primary-deep);
}
```

For dynamic RSVP filter buttons: annotate with `// @allow-inline-style - active RSVP filter state`.

For bulk progress bar: annotate with `// @allow-inline-style - dynamic progress width`.

Remove from both whitelists, verify, commit.

---

### Task 27: SeatingView.tsx — Extract Static + Annotate Dynamic (28 static, 15 dynamic)

**Files:**
- Modify: `src/views/admin/SeatingView.tsx`
- Modify: `src/views/admin/SeatingView.css` (append)
- Modify: both whitelists

**CSS companion exists.** Add classes for the 28 static styles:

```css
.seating-tab-button {
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: none;
  color: var(--text-muted);
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
}

.seating-tab-button.active {
  color: var(--primary);
  border-bottom: 2px solid var(--primary);
}

.seating-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.seating-toolbar-spacer {
  flex: 1;
}

.seating-empty-state {
  padding: var(--space-xl);
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: var(--space-md);
}

.seating-add-chart-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  background: none;
  cursor: pointer;
  color: var(--text-muted);
}

.seating-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-md);
}
```

For the 15 dynamic styles (activeTab conditionals, drag states, fullscreen, save feedback): annotate with `// @allow-inline-style - explanation`.

Remove from both whitelists, verify, commit.

---

## Batch 8: Music Library + Singer Views

### Task 28: FloatingAudioPlayer.tsx — Extract Static Styles (6 static, 0 dynamic)

**Files:**
- Modify: `src/views/admin/music-library/FloatingAudioPlayer.tsx`
- Create: `src/views/admin/music-library/FloatingAudioPlayer.css`
- Modify: both whitelists

```css
.floating-audio-player {
  position: fixed;
  bottom: var(--space-md);
  left: 50%;
  transform: translateX(-50%);
  width: 95%;
  max-width: 650px;
  background-color: rgba(27, 77, 62, 0.95);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.floating-audio-track-info {
  min-width: 0;
  flex: 1 1 180px;
  gap: 2px;
}

.floating-audio-part-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.7);
}

.floating-audio-track-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #ffffff;
  display: block;
}

.floating-audio-seek-bar {
  height: 32px;
  flex: 2 1 240px;
  max-width: 480px;
  min-width: 160px;
  width: 100%;
}

.floating-audio-play-btn {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  line-height: 1;
  margin: 0;
}
```

Replace all 6 inline styles, import CSS, remove from whitelists, verify, commit.

---

### Task 29: MusicLibraryTable.tsx — Annotate Dynamic (2 dynamic, 0 static)

- [ ] **Step 1: Add annotations**

```tsx
// @allow-inline-style - active track color indicator
style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}

// @allow-inline-style - active track opacity
style={{ opacity: isActive ? 1 : 0.35 }}
```

- [ ] **Step 2: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/views/admin/music-library/MusicLibraryTable.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: annotate MusicLibraryTable dynamic styles"
```

---

### Task 30: LearningTracksEditor.tsx & MultiSelectDropdown.tsx — Annotate Dynamic

**Files:**
- Modify: `src/views/admin/music-library/LearningTracksEditor.tsx` (1 dynamic → annotate)
- Modify: `src/views/admin/music-library/MultiSelectDropdown.tsx` (1 dynamic → annotate)
- Modify: both whitelists

- [ ] **Step 1: LearningTracksEditor.tsx**

```tsx
// @allow-inline-style - drag-over drop zone indicator
style={{ padding: isDraggedOver ? (isMovement ? '5px 9px' : '7px 11px') : undefined, backgroundColor: isDraggedOver ? 'rgba(74, 124, 89, 0.08)' : undefined, border: isDraggedOver ? '2px dashed var(--primary)' : undefined, transform: isDraggedOver ? 'scale(1.01)' : 'scale(1)', boxShadow: isDraggedOver ? (isMovement ? '0 2px 8px rgba(74, 124, 89, 0.12)' : '0 4px 12px rgba(74, 124, 89, 0.15)') : undefined }}
```

- [ ] **Step 2: MultiSelectDropdown.tsx**

```tsx
// @allow-inline-style - dynamic color based on voice part
style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
```

- [ ] **Step 3: Remove from both whitelists + Verify + Commit**

---

### Task 31: SeatingFinderView.tsx — Extract Static + Annotate Dynamic (22 static, 3 dynamic)

**Files:**
- Modify: `src/views/singer/SeatingFinderView.tsx`
- Modify: `src/views/singer/SeatingFinderView.css` (append)
- Modify: both whitelists

**CSS companion exists.** Add classes:

```css
.seating-finder-loading {
  padding: var(--space-md);
  text-align: center;
  color: var(--text-muted);
}

.seating-finder-not-found {
  padding: var(--space-md);
  text-align: center;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.seating-finder-chart-selector {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  flex-wrap: wrap;
}

.seating-finder-chart-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.seating-finder-chart-label {
  font-weight: 600;
  color: var(--text-muted);
}

.seating-finder-card {
  padding: var(--space-md);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
}

.seating-finder-card-heading {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary-deep);
  margin-bottom: var(--space-xs);
}

.seating-finder-card-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.seating-finder-section-gap {
  gap: var(--space-md);
}

.seating-finder-section-heading {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
}

.seating-finder-seat-label {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-muted);
}

.seating-finder-flex-row {
  display: flex;
  align-items: center;
}

.seating-finder-flex-col {
  display: flex;
  flex-direction: column;
}
```

For the 3 dynamic styles (perspective direction, singer seat colors): annotate.

Remove from both whitelists, verify, commit.

---

### Task 32: DashboardView.tsx — Annotate Dynamic (2 dynamic, 0 static)

- [ ] **Step 1: Add annotations**

```tsx
// @allow-inline-style - poll Yes/No status button colors
style={{ backgroundColor: poll.status === 'Yes' ? 'var(--primary)' : 'white', color: poll.status === 'Yes' ? 'white' : 'var(--neutral-text)' }}

// @allow-inline-style - poll Yes/No status button colors
style={{ backgroundColor: poll.status === 'No' ? '#ef4444' : 'white', color: poll.status === 'No' ? 'white' : 'var(--neutral-text)' }}
```

- [ ] **Step 2: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/views/singer/DashboardView.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: annotate DashboardView dynamic styles"
```

---

### Task 33: PublicAuditionView.tsx — Annotate Dynamic (2 dynamic, 0 static)

- [ ] **Step 1: Add annotations**

```tsx
// @allow-inline-style - schedule expansion chevron rotation
style={{ fontSize: '1.2rem', transform: isScheduleExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}

// @allow-inline-style - slot checkbox checked state
style={{ fontSize: '0.875rem', fontWeight: isChecked ? 600 : 400 }}
```

- [ ] **Step 2: Remove from both whitelists + Verify + Commit**

```bash
rtk npm run lint && rtk npm test
rtk git add src/views/PublicAuditionView.tsx eslint-rules/no-hardcoded-inline-styles.js test/codebaseIntegrity.test.ts
rtk git commit -m "refactor: annotate PublicAuditionView dynamic styles"
```

---

## Final Verification

After ALL tasks complete:

```bash
rtk npm run lint
rtk npm test
```

Expected: 0 lint errors, 590 tests pass, 0 files remain in both whitelists.

The final whitelists should be:

```javascript
const legacyWhitelist = new Set([]);

const legacyInlineStyleWhitelist = new Set([]);
```

---

## Summary of Changes

| Category | Count |
|----------|-------|
| Files graduated (zero changes) | 12 |
| Files with static styles extracted to CSS | 24 |
| Files with dynamic styles annotated | 10 |
| New CSS files created | 15 |
| Existing CSS files modified | 8 |
| Whitelist entries removed | 46 |
| Files remaining in whitelist | 0 |
