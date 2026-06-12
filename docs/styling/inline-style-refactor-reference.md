# Inline Style → Tailwind Refactor Reference

> All remaining `style={{` usages are annotated with `// @allow-inline-style`. This doc tracks which ones could be converted to Tailwind classes.

**26 files** · **86 inline styles** remaining

---

## Administration Views

| File | Count | Status |
|------|-------|--------|
| `src/views/admin/AdminDashboardView.tsx` | 1 | Pending |
| `src/views/admin/EventRosterView.tsx` | 2 | Pending |
| `src/views/admin/SeatingView.tsx` | 9 | Pending |
| `src/views/admin/SetListView.tsx` | 1 | Pending |
| `src/views/admin/TicketingView.tsx` | 1 | Pending |
| `src/views/admin/music-library/MultiSelectDropdown.tsx` | 2 | Pending |
| `src/views/admin/music-library/LearningTracksEditor.tsx` | 1 | Pending |
| `src/views/admin/music-library/table/MusicLibraryTitleCell.tsx` | 1 | Pending |

## Singer Views

| File | Count | Status |
|------|-------|--------|
| `src/views/singer/SeatingFinderView.tsx` | 2 | Pending |

## Admin Components

| File | Count | Status |
|------|-------|--------|
| `src/components/admin/SeatingGrid.tsx` | 14 | Pending |
| `src/components/admin/SeatingFormationsEditor.tsx` | 3 | Pending |
| `src/components/admin/SeatingBottomDock.tsx` | 3 | Pending |
| `src/components/admin/RosterImportModal.tsx` | 5 | Pending |
| `src/components/admin/AuditionModal.tsx` | 3 | Pending |
| `src/components/admin/RosterSummary.tsx` | 3 | Pending |
| `src/components/admin/SingerModal.tsx` | 1 | Pending |
| `src/components/admin/SortableSetListItem.tsx` | 1 | Pending |
| `src/components/admin/MusicImportModal.tsx` | 2 | Pending |
| `src/components/admin/SetListInlineCreator.tsx` | 1 | Pending |
| `src/components/admin/MessageHistory.tsx` | 1 | Pending |
| `src/components/admin/SectionBucketEditor.tsx` | 3 | Pending |

## Shared / Common Components

| File | Count | Status |
|------|-------|--------|
| `src/components/common/PhotoUploader.tsx` | 8 | Pending |
| `src/components/common/PageLayout.tsx` | 2 | Pending |
| `src/components/common/AppCard.tsx` | 1 | Pending |
| `src/components/player/Player.tsx` | 4 | Pending |
| `src/components/singer/EventCard.tsx` | 2 | Pending |

## UI Library

| File | Count | Status |
|------|-------|--------|
| `src/components/ui/PhotoUploader/PhotoUploader.tsx` | 8 | Pending |
| `src/components/ui/Modal/Modal.tsx` | 1 | Pending |
| `src/components/ui/ProgressBar/ProgressBar.tsx` | 1 | Pending |
| `src/components/ui/Select/Select.tsx` | 1 | Pending |
| `src/components/ui/Table/Table.tsx` | 1 | Pending |

---

## Categorization by Refactor Difficulty

### 🟢 Easy — trivially replaceable with Tailwind classes

| File | Lines | Inline | Tailwind Equivalent |
|------|-------|--------|-------------------|
| `PhotoUploader.tsx` | 577, 548 | `display: 'none'` | `hidden` |
| `PhotoUploader.tsx` (ui) | 544, 675 | `display: 'none'` | `hidden` |
| `SeatingGrid.tsx` | 217 | `fontWeight: 600, fontSize: '0.8125rem'` | `font-semibold text-sm` |
| `SeatingGrid.tsx` | 260 | `fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap'` | `font-bold text-right whitespace-nowrap` |
| `SeatingGrid.tsx` | 631 | `fontWeight: 600, fontSize: '0.8125rem'` | `font-semibold text-sm` |
| `SeatingGrid.tsx` | 556 | `gap: isCompact ? '1px' : '3px'` | `gap-0.5` or `gap-[3px]` |
| `AuditionModal.tsx` | 307 | `fontWeight: isChecked ? 600 : 400` | `font-semibold` (conditional) |
| `RosterSummary.tsx` | 98 | `padding` (conditional) | `p-3` / `p-4` |

### 🟡 Moderate — conditional styles using Tailwind class templates

| File | Lines | Notes |
|------|-------|-------|
| `SeatingView.tsx` | 319, 341 | Tab active state (`color`, `fontWeight`) — use conditional `text-* font-*` |
| `SeatingView.tsx` | 472, 594 | Dynamic borders (`borderColor`) — use `border-*` conditional |
| `SeatingView.tsx` | 519 | Drag handle opacity — use `opacity-*` conditional |
| `SeatingView.tsx` | 542, 607, 709 | Font weight/color conditional — already className candidates |
| `SeatingView.tsx` | 663 | Fullscreen bg toggle — use conditional `bg-primary`/`bg-surface` |
| `SeatingFormationsEditor.tsx` | 121 | `gap: isExpanded ? 'var(--space-sm)' : '0'` — conditional `gap-*` |
| `SeatingFormationsEditor.tsx` | 224 | Row vs grid layout — use conditional `flex-col`/`grid` |
| `SingerModal.tsx` | 298 | Feedback color from server — could use CSS variable in class |
| `EventCard.tsx` | 182, 194 | Dynamic miss stats colors — use conditional text color classes |
| `SectionBucketEditor.tsx` | 71, 136 | Dynamic background colors — use `style` is acceptable |
| `SortableSetListItem.tsx` | 67 | DnD-kit transform — truly dynamic, keep inline |
| `MessageHistory.tsx` | 75 | Dynamic padding based on clear button — keep inline |

### 🔴 Hard — truly dynamic values (computed from props/state)

| File | Lines | Reason |
|------|-------|--------|
| `SeatingGrid.tsx` | 183, 222, 250, 261, 422, 450, 528, 556, 568, 573, 591 | Grid dimensions, seat positions, seat colors all computed from section/voice part data |
| `SeatingBottomDock.tsx` | 176, 194, 197 | Dynamic grid columns + badge/label colors from section config |
| `SeatingFinderView.tsx` | 317, 342 | Dynamic flex direction + seat color per voice part |
| `PhotoUploader.tsx` | 415, 427, 446, 464, 489 | Dynamic px values from `size` prop |
| `PhotoUploader.tsx` (ui) | 399, 411, 430, 445, 463 | Same as above (duplicated component) |
| `ProgressBar.tsx` | 25 | Width percentage — dynamic |
| `TicketingView.tsx` | 979 | Progress bar width — dynamic |
| `EventRosterView.tsx` | 248, 419 | Dynamic grid columns + progress width |
| `RosterImportModal.tsx` | 366, 389, 445, 510, 566 | Conditional validation borders + progress width |
| `MusicImportModal.tsx` | 387, 453 | Error bg + progress width |
| `RosterSummary.tsx` | 82 | Dynamic grid columns from section list |
| `AdminDashboardView.tsx` | 175 | Dot color from section config |
| `MultiSelectDropdown.tsx` | 220, 333 | Chip colors from option mapping |
| `MusicLibraryTitleCell.tsx` | 73 | Genre tag colors |
| `LearningTracksEditor.tsx` | 84 | Drag-over drop zone |
| `SeatingGrid.tsx` | 261 | Dynamic width from compact mode |
| `SetListInlineCreator.tsx` | 156 | Conditional border when results exist |
| `SetListView.tsx` | 710 | CSS `page` property — cannot be Tailwind |
| `Modal.tsx` | 95 | Dynamic maxWidth — could use Tailwind `max-w-*` with conditional |
| `PageLayout.tsx` | 31, 50 | Dynamic maxWidth — could use Tailwind `max-w-*` |
| `Select.tsx` | 16 | SVG data URI — cannot be Tailwind |
| `Table.tsx` | 30 | Dynamic column min-width — stays inline |
| `Player.tsx` | 140, 143, 162, 231 | Seek/volume sliders + badge states — audio player dynamic |
| `AppCard.tsx` | 29 | Style prop passthrough — composition pattern |
| `AutocompleteInput.tsx` | 114 | Style prop passthrough — composition pattern |

---

## Priority Draft (for future refactoring sprints)

1. **Easy wins** — replace `display: none` with `hidden`, static font weights, simple gaps
2. **Conditional classes** — `SeatingView.tsx`, `SeatingFormationsEditor.tsx`, `SingerModal.tsx`
3. **Dynamic grid widths** — `EventRosterView.tsx`, `RosterSummary.tsx`, modal `maxWidth`
4. **Complex seat/section rendering** — `SeatingGrid.tsx`, `SeatingBottomDock.tsx`, `SeatingFinderView.tsx`
5. **Won't convert** — `SortableSetListItem.tsx`, `Select.tsx`, `SetListView.tsx` (page prop), style-prop passthrough components
