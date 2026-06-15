# Shoelace / Web Awesome — Full Coverage Plan

> **Goal:** Replace every remaining hand-rolled UI element in the codebase with its Shoelace equivalent. No pattern too trivial.

---

## Task 1: Native `<button>` → `<Button>` Wrapper

**Shoelace component:** `<sl-button>` via our `Button` wrapper

**Scope:** ~35 native `<button>` elements across 11 files.

### Candidates by file

| File | Count | Verdict | Notes |
|------|-------|---------|-------|
| `SeatingView.tsx` | 9 | **Convert most** | Clear, print, reset, zoom, delete, etc. — most map cleanly to `variant` + `size` |
| `Player.tsx` | 6 | **Skip** | Play/pause/skip/repeat — heavily custom dynamic classes, inline SVGs, responsive breakpoints. Our Button wrapper can't express the conditional `circle` vs `pill` shapes |
| `EventModal.tsx` | 5 | **Convert** | Standard action buttons (save, cancel, etc.) |
| `EventCard.tsx` | 4 | **Skip** | Interactive deck note links with dynamic inline color styles — no Button variant matches |
| `Modal.tsx` | 2 | **Skip** | Test fallback close buttons — not production code |
| `MusicLibraryFilters.tsx` | 2 | **Convert** | Filter toggle buttons — map to `variant="secondary" size="small"` |
| `PageLayout.tsx` | 1 | **Convert** | Logout button — `variant="outline"` |
| `PublicRsvpView.tsx` | 1 | **Convert** | Action button |
| `PublicAuditionView.tsx` | 1 | **Convert** | Submit button — `variant="primary"` |
| `FloatingAudioPlayer.tsx` | 1 | **Skip** | Mini audio player button with custom styling |
| `AuditionsView.tsx` | 1 | **Skip** | Already a well-styled native button for audition card actions |

**Net:** ~18 native `<button>` → `<Button>`, ~17 intentionally kept native (test fallback, media player, dynamic colors).

**Implementation:**
- `SeatingView.tsx` — replace 9 buttons, mapping semantics to `variant`/`size`
- `EventModal.tsx` — replace 5 buttons  
- `MusicLibraryFilters.tsx` — replace 2 toggle buttons
- `PageLayout.tsx` — replace logout button
- `PublicRsvpView.tsx` — replace 1 button
- `PublicAuditionView.tsx` — replace 1 button

---

## Task 2: `<hr>` → `<sl-divider>`

**Shoelace component:** `<sl-divider>` (horizontal ruled separators with optional label text)

**Scope:** 4 instances across 4 files.

| File | Line | Context |
|------|------|---------|
| `RosterView.tsx` | — | Section divider in roster controls |
| `SetListView.tsx` | — | Section divider in set list controls |
| `StatusAutomationSettings.tsx` | — | Divider between automation rules |
| `EventList.tsx` | — | Divider between event groups |

**Implementation:** Replace `<hr className="..." />` with `<SlDivider />`. Shoelace's divider supports `vertical` mode and optional label text in a slot. All 4 are horizontal separators — direct 1:1 replacement.

---

## Task 3: `animate-pulse bg-*` → `<sl-skeleton>`

**Shoelace component:** `<sl-skeleton>` (placeholder loading indicator)

**Scope:** ~10 instances across 8 files.

| File | Count | Context |
|------|-------|---------|
| `AttendanceView.tsx` | 4 | Loading rows before data arrives |
| `TicketingView.tsx` | 1 | Loading state for ticket table |
| `LearningTracksEditor.tsx` | 1 | Loading state for track list |
| `PollsDashboardView.tsx` | 1 | Loading state for poll list |
| `DonationsView.tsx` | 1 | Loading state for donation table |
| `EventsView.tsx` | 1 | Loading state for event list |
| `Player.tsx` | 1 | Audio loading placeholder |

**Implementation:** Replace `animate-pulse bg-slate-200 rounded` div placeholders with `<SlSkeleton />`. Shoelace skeleton supports `effect` (pulse/sheen/none) and shape control. Each loading block becomes:
```tsx
<SlSkeleton effect="pulse" className="h-4 w-full rounded" />
```

---

## Task 4: `title="..."` → `<sl-tooltip>`

**Shoelace component:** `<sl-tooltip>` (custom-positioned, rich-content tooltip)

**Scope:** ~141 instances of `title="..."` attribute across the codebase.

**Strategy:** Don't do a mass find-and-replace. Instead:

1. **Wrap only interactive elements** (buttons, links, form controls) where the tooltip adds value
2. **Leave static/decorative titles** (icons, labels) — native `title` is fine
3. **Convert in batches** when touching a file for other reasons

**Implementation:**
```tsx
// Before:
<Button title="Export roster as CSV">Export</Button>

// After:
<SlTooltip content="Export roster as CSV">
  <Button>Export</Button>
</SlTooltip>
```

Shoelace tooltip supports `placement` (top/bottom/left/right), `trigger` (hover/focus/click/manual), and rich HTML content via the `content` slot.

---

## Task 5: Custom Color Pickers → `<sl-color-picker>`

**Shoelace component:** `<sl-color-picker>` (inline or dropdown color selector)

**Scope:** 2 custom implementations.

| File | Pattern |
|------|---------|
| `SectionBucketEditor.tsx` | Custom palette grid overlay with backdrop click-to-close. ~35 lines of JSX + state management |
| `RosterSettingsTab.tsx` | Similar inline color grid with presets |

**Implementation:** Replace custom palette grids with `<SlColorPicker>`:
```tsx
<SlColorPicker
  value={currentColor}
  onSlChange={(e: unknown) => setColor((e as CustomEvent).detail.value)}
  no-swatches
  label="Section Color"
/>
```

Shoelace color picker supports HSV/RGB/HEX, preset swatches, `eye-dropper`, and `inline` vs `dropdown` mode. Removes custom backdrop click-to-close logic, color grid markup, and palette state.

---

## Task 6: Progress Indicators → `<sl-progress-bar>` / `<sl-progress-ring>`

**Shoelace component:** `<sl-progress-bar>` (linear), `<sl-progress-ring>` (circular)

**Scope:** ~15 instances of hand-rolled progress indicators.

| File | Pattern |
|------|---------|
| `RosterImportModal.tsx` | 8 custom progress divs with dynamic width style |
| `MusicImportModal.tsx` | 8 custom progress divs with dynamic width style |
| `TicketingView.tsx` | Progress bar in ticket stats |
| `PublicPlayerView.tsx` | Several progress/position indicators |

**Implementation:**
```tsx
// Before:
<div className="h-2 rounded-full bg-slate-200" // @allow-inline-style - dynamic progress width
  style={{ width: `${pct}%` }} />

// After:
<SlProgressBar value={pct} className="h-2" />
```

Removes `@allow-inline-style` annotations and dynamic `style={{ width: ... }}` patterns.

---

## Execution Order

| # | Task | Effort | Risk |
|---|------|--------|------|
| 1 | `<hr>` → `<sl-divider>` | 10 min | None — 1:1 replacement |
| 2 | `animate-pulse` → `<sl-skeleton>` | 15 min | None — loading states, visual only |
| 3 | Progress bars → `<sl-progress-bar>` | 20 min | Low — replaces inline style patterns |
| 4 | Native buttons → `<Button>` | 30 min | Low — ~18 conversions, variant/size mapping |
| 5 | Color pickers → `<sl-color-picker>` | 20 min | Medium — removes custom backdrop + state |
| 6 | `title="..."` → `<sl-tooltip>` | Ongoing | Low per-item — do when touching files |

**Total estimated time:** ~1.5 hours for Tasks 1-5. Task 6 is an ongoing convention.

---

## Verification

After each task:
```bash
rtk npx tsc --noEmit
rtk npm test
rtk npm run lint
```
