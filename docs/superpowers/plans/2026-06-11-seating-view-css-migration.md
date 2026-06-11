# SeatingView CSS Migration Plan

**Goal:** Migrate `src/views/admin/SeatingView.css` (~940 lines) to Tailwind CSS v4 utilities, then delete the file and clean up related print `@media` rules in `src/index.css`.

---

## Scope

**4 components + 2 CSS files to touch:**

| File | Action |
|---|---|
| `src/views/admin/SeatingView.css` | Delete |
| `src/views/admin/SeatingView.tsx` | Migrate CSS classes → Tailwind utilities; replace legacy `btn-*` classes |
| `src/components/admin/SeatingGrid.tsx` | Migrate CSS classes → Tailwind utilities |
| `src/components/admin/SeatingBottomDock.tsx` | Migrate CSS classes → Tailwind utilities |
| `src/components/admin/SeatingTextList.tsx` | Migrate CSS classes → Tailwind utilities |
| `src/components/admin/UnassignedPrintSection.tsx` | Migrate CSS classes → Tailwind utilities |
| `src/index.css` | Remove/refactor print `@media` rules referencing seating classes (lines 210–238) |

---

## Work Groups

### Group 1: Layout containers (~15 classes, ~100 lines)
`.seating-view-container`, `.seating-header`, `.seating-main-layout`, `.seating-card-editor`, `.seating-print-shell`, `.seating-header-row`, `.seating-header-title-sm`, `.seating-empty-view`, `.seating-grid-container`, `.seating-modal-row`, `.seating-toolbar-spacer`, `.seating-empty-state`, `.seating-add-chart-btn`

→ Tailwind flex/grid + spacing utilities directly in TSX.

### Group 2: Toolbar & segmented controls (~20 classes, ~180 lines)
`.seating-toolbar`, `.seating-toolbar-btn`, `.seating-toolbar-btn-danger`, `.seating-toolbar-segmented-group`, `.seating-toolbar-segmented-btn`, `.seating-toolbar-btn-fullscreen`, `.seating-toolbar-btn-print`, `.seating-toolbar-btn-save`, `.seating-toolbar-row`, `.seating-toolbar-save-wrap`, `.seating-toolbar-fullscreen`, `.seating-toolbar-fullscreen-active`, `.seating-toolbar-save-default`, `.seating-toolbar-save-error`, `.seating-toolbar-save-success`, `.seating-segmented-control-wrap`, `.seating-segmented-label-group`, `.seating-segmented-control`, `.seating-segmented-control-btn`

→ Tailwind `bg-*`, `border-*`, `h-8`, `p-2`, `rounded-md`, `shadow-sm`, etc.

### Group 3: Tab & chart styles (~15 classes, ~150 lines)
`.seating-tab-button`, `.seating-tab-group`, `.seating-charts-tabs-row`, `.seating-chart-tab`, `.seating-chart-tab-btn`, `.seating-chart-tab-btn-active`, `.seating-chart-tab-btn-inactive`, `.seating-chart-action-row`, `.seating-chart-action-btn`, `.seating-chart-delete-btn`, `.seating-add-btn`, `.seating-row-action-btn`, `.seating-row-action-btn-add`, `.seating-row-action-btn-remove`

→ Tailwind `flex`, `gap-1`, `px-3 py-2`, `font-semibold`, `text-primary`, etc.

### Group 4: Sidebar styles (~12 classes, ~100 lines)
`.seating-sidebar`, `.seating-sidebar-content`, `.seating-sidebar-title`, `.seating-sidebar-header`, `.seating-sidebar-title-h3`, `.seating-sidebar-list`, `.seating-sidebar-item`, `.seating-sidebar-empty`, `.seating-sidebar-btn`, `.seating-sidebar-item-name`, `.seating-sidebar-header-row`, `.seating-sidebar-buttons-row`

→ Tailwind `sticky`, `top-6`, `h-[calc(100vh-140px)]`, `w-80`, `border-dashed`, `cursor-grab`, etc.

### Group 5: Copy/save/info styles (~15 classes, ~130 lines)
`.seating-copy-section`, `.seating-copy-select`, `.seating-copy-label`, `.seating-save-feedback-wrap`, `.seating-autosave-tag`, `.seating-select-perf`, `.seating-select-venue`, `.seating-select-pattern`, `.seating-pattern-input`, `.seating-pattern-btn`, `.seating-editor-info-highlight`, `.seating-grid-editor-info`, `.seating-grid-unassigned-warn`, `.seating-controls-group`, `.seating-control-item`, `.seating-control-item-row`, `.seating-controls-group-wrap`, `.seating-perf-select`, `.seating-venue-select`, `.seating-format-select`, `.seating-update-btn`, `.seating-checkbox-label`, `.seating-checkbox-input`

→ Tailwind select/input/label utilities.

### Group 6: Bottom dock styles (~15 classes, ~150 lines)
`.seating-bottom-dock`, `.bottom-dock-container`, `.bottom-dock-header`, `.bottom-dock-title`, `.bottom-dock-subtitle`, `.bottom-dock-grid`, `.bottom-dock-lane`, `.bottom-dock-lane-header`, `.lane-label`, `.lane-badge`, `.bottom-dock-lane-list`, `.bottom-dock-singer-card`, `.singer-card-name`, `.singer-card-badge`, `.bottom-dock-remove-btn`, `.bottom-dock-empty-lane`

→ Tailwind `grid-cols-5`, `h-6`, `text-[10px]`, `truncate`, etc.

### Group 7: Shared presentational styles (~4 classes, ~30 lines)
`.row-text-entry`, `.row-text-header`, `.row-text-content` (SeatingTextList)
`.unassigned-print-section`, `.unassigned-print-badge` (UnassignedPrintSection)

→ Inline Tailwind.

### Group 8: Drag & animation styles (~8 classes, ~90 lines)
`.seat-cell.drag-target`, `.drag-overlay`, `.drag-overlay-icon`, `.section-mismatch`, `.section-mismatch::after`, `@keyframes drop-zone-pulse`, `@keyframes bounce`

→ Add custom `@keyframes` to `index.css`. Reference via `animate-[name_duration_infinite]`. Replace `::after` gradient pseudo-element with `bg-[linear-gradient(...)]`.

### Group 9: Legacy `btn-*` classes (27 references in SeatingView.tsx)
Replace patterns:
- `btn btn-primary` → `inline-flex items-center justify-center h-11 px-6 rounded-md font-label gap-2 whitespace-nowrap bg-primary text-surface border border-primary`
- `btn btn-ghost` → `... bg-transparent text-text-muted border-border`
- `btn btn-danger` → `... bg-danger-bg text-danger-text`
- `btn btn-sm` → `h-8 px-4 text-xs`
- `btn btn-secondary` → `... bg-primary-light text-primary-deep`

Lines: 412, 535, 553, 572, 618, 629, 632, 640, 646, 656, 692, 702, 723, 827, 834, 898, 909, 955, 967.

### Group 10: Print @media rules in `index.css` (lines 210–238)
Rules referencing `[data-print-mode]`, `.seating-text-list`, `.grid-print`, `.unassigned-print-section` → replace with Tailwind `print:` variants or conditional rendering. The `no-print` class is already handled.

---

## Verification

1. `SeatingView.css` no longer exists
2. No `import './SeatingView.css'` remains
3. Type check passes
4. Visual check: grid rendering, drag/drop, fullscreen toggle, sidebar, bottom dock, print modes, tab reordering, format switching
5. No npm audit issues introduced
