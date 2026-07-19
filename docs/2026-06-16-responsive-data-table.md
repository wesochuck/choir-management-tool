# Responsive `DataTable` Component (Hybrid TanStack Table)

> **Goal:** Replace copy-pasted desktop-table + mobile-card pairs with a single shared `DataTable` component under `src/components/ui/`, powered by `@tanstack/react-table` for logic and our wrapper for UI.

**Architecture:** Hybrid — `@tanstack/react-table` manages sort, selection, pagination, and column visibility state internally. A `DataTable` wrapper renders the desktop `<table>` and mobile card list from the same column definitions. This eliminates ~80–100 lines of boilerplate per table that we currently duplicate across 13 table instances.

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/components/ui/DataTable/DataTable.tsx` | Main component — TanStack-powered table + card list |
| `src/components/ui/DataTable/types.ts` | `DataTableProps<T>`, `ColumnDef<T>` type exports |
| `src/components/ui/DataTable/pagination.tsx` | Inline pagination controls, uses TanStack table instance directly |
| `test/DataTable.test.tsx` | Vitest component tests (jsdom) |

### Modified files

| File | Change |
|------|--------|
| `package.json` | Add `@tanstack/react-table` dependency |
| `src/components/ui/index.ts` | Add `DataTable` to barrel export |
| `src/views/admin/PatronsView.tsx` | Migrate to use `<DataTable>` (pilot) |
| `AGENTS.md` | Add "Data Display" section under §3 |

---

## Component API

### ColumnDef<T>

Maps to TanStack's `ColumnDef<T>` with our custom mobile card metadata in `meta`.

```ts
interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T & string;     // direct property access
  accessorFn?: (row: T) => unknown;   // computed value
  cell?: (value: unknown, row: T) => React.ReactNode;  // cell renderer
  align?: 'left' | 'center' | 'right';
  enableSorting?: boolean;            // defaults to true
  hideBelow?: 'sm' | 'md';            // responsive column hiding

  // Mobile card layout — carried in TanStack's `columnDef.meta`
  cardSection: 0 | 1;
  cardSide: 'left' | 'right';
  cardLabel?: string;
}
```

- `cardSection: 0` → top row, `justify-between` across the card (name + badge pattern)
- `cardSection: 1` → lower section, left stack / right stack with visual separator
- `cardSide` → which stack the value goes in
- `cardLabel` → muted label prepended to value on mobile (e.g. "Last:", "Orders:")

Internal mapping function `toTanStackColumn<T>` converts our `ColumnDef<T>` to TanStack's `ColumnDef<T>`, placing our custom fields into `meta`.

### DataTableProps<T>

```ts
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading: boolean;
  emptyState: {
    title: string;
    description: string;
    icon: string;
    action?: React.ReactNode;
  };

  // Selection (opt-in)
  enableSelection?: boolean;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  renderSelectionActions?: (info: { selectedCount: number }) => React.ReactNode;

  // Row click (opt-in)
  onRowClick?: (row: T) => void;

  // Sort (opt-in) — TanStack manages state internally
  // Consumer controls external sort via manualSorting + onSortingChange
  manualSorting?: boolean;
  onSortingChange?: (sorting: { id: string; desc: boolean }[]) => void;

  // Pagination (opt-in) — TanStack manages state internally
  // Consumer controls external fetch via manualPagination + onPaginationChange
  manualPagination?: boolean;
  onPaginationChange?: (state: { pageIndex: number; pageSize: number }) => void;
  pageCount?: number;  // total pages (for manual pagination)
  pageSize?: number;   // rows per page

  // Escape hatch — override card rendering for complex rows
  renderMobileCard?: (row: T) => React.ReactNode;
}
```

`T` does not require `{ id: string }` — TanStack uses `getRowId` which defaults to index. Consumers can pass `getRowId` if needed.

TanStack manages the following **internally** (no consumer boilerplate):
- Sort state (`state.sorting`) + header click handlers + direction arrows
- Row selection state (`state.rowSelection`) + select-all + toggle handlers
- Pagination state (`state.pagination`) + next/prev/page-jump
- Column visibility + toggle handlers

Consumer opts out of internal management with `manualSorting`, `manualPagination`, etc., for server-driven data.

### Mobile card visual layout

```
┌──────────────────────────────────────────┐
│ <section 0 left>            <section 0 right>│  section 0, justify-between
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ [☑]  <section 1 left labels>              │  section 1 left-stack (flex-col)
│ <more left items>                          │
│                              <right val>   │  section 1 right-stack (flex-col)
│                              <more right>   │
└──────────────────────────────────────────┘
```

---

## Desktop rendering

- Wrapper: `hidden overflow-x-auto rounded-xl border border-slate-100 shadow-sm md:block`
- `<table className="min-w-full divide-y divide-slate-100 text-left">`
- `<thead className="bg-slate-50/75">`
- TanStack's `headerGroup.headers` drive column headers. When sortable, render `column.getToggleSortingHandler()` as onClick and `column.getIsSorted()` for ↑/↓ indicators.
- Checkbox column prepended when `enableSelection`: select-all via `table.getToggleAllRowsSelectedHandler()`, indeterminate via `table.getIsSomeRowsSelected()`.
- `onRowClick` adds `cursor-pointer`; checkboxes use `stopPropagation`.
- `hideBelow` mapped to TanStack's `columnVisibility` state. A `useEffect` + media query listener syncs `hideBelow: 'sm'` to `column.getToggleVisibilityHandler()`.

---

## Mobile rendering

- Wrapper: `overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:hidden`
- Iterate `table.getRowModel().rows`. For each row:
  - Group visible cells by `cell.column.columnDef.meta.cardSection`.
  - Section 0: `<div className="flex items-center justify-between">`
  - Section 1: `<div className="flex items-start justify-between gap-4">` with `border-t`
  - Left side: `<div className="flex flex-col gap-0.5">` — cells with `cardSide: 'left'`
  - Right side: `<div className="flex shrink-0 flex-col items-end gap-0.5">` — cells with `cardSide: 'right'`
  - `cardLabel` rendered as `<span className="text-[10px] font-medium text-slate-400">` before each right-side value.
  - Checkbox (if `enableSelection`) in section 1 left stack.

---

## Pagination

**Not using the existing `Pagination.tsx` component.** Instead, inline pagination controls at the bottom of DataTable using TanStack's API directly:

- `<nav>` with prev / page-number buttons / next
- `table.nextPage()`, `table.previousPage()`, `table.getPageCount()`, `table.getState().pagination.pageIndex`
- Page-number buttons: loop from 0 to `table.getPageCount() - 1`, call `table.setPageIndex(n)`
- Hidden when `table.getPageCount() <= 1`
- Rendered inside both the desktop (`hidden md:block`) and mobile (`md:hidden`) containers

The existing `Pagination` component stays for the 5 current consumers (RosterView, MusicLibraryTable, etc.) but is not used by DataTable.

---

## Task 1: Add dependency + create types

**Steps:**
```bash
rtk npm install @tanstack/react-table
```

Create `src/components/ui/DataTable/types.ts`:

```ts
import type { ReactNode } from 'react';

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T & string;
  accessorFn?: (row: T) => unknown;
  cell?: (value: unknown, row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  enableSorting?: boolean;
  hideBelow?: 'sm' | 'md';
  cardSection: 0 | 1;
  cardSide: 'left' | 'right';
  cardLabel?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading: boolean;
  emptyState: { title: string; description: string; icon: string; action?: ReactNode };
  enableSelection?: boolean;
  onSelectionChange?: (ids: Set<string>) => void;
  renderSelectionActions?: (info: { selectedCount: number }) => ReactNode;
  onRowClick?: (row: T) => void;
  manualSorting?: boolean;
  onSortingChange?: (sorting: { id: string; desc: boolean }[]) => void;
  manualPagination?: boolean;
  onPaginationChange?: (state: { pageIndex: number; pageSize: number }) => void;
  pageCount?: number;
  pageSize?: number;
  renderMobileCard?: (row: T) => ReactNode;
}
```

**Verification:** `rtk npm ls @tanstack/react-table`

## Task 2: Build DataTable component

**File:** Create `src/components/ui/DataTable/DataTable.tsx`

Implement:

1. Convert `columns` via `toTanStackColumn` — maps our ColumnDef to TanStack's ColumnDef, placing `align`, `hideBelow`, `cardSection`, `cardSide`, `cardLabel` into `meta`.

2. Call `useReactTable()` with:
   - `data`, `columns: tanStackColumns`
   - `getCoreRowModel()`
   - `getSortedRowModel()` (if not `manualSorting`)
   - `getPaginationRowModel()` (if not `manualPagination`)
   - `state` for controlled-override of sorting/pagination/rowSelection
   - `onSortingChange`, `onPaginationChange`
   - `onRowSelectionChange` → calls `onSelectionChange` with `Object.keys(next)`
   - `enableRowSelection: !!enableSelection`
   - `meta: { onRowClick, renderMobileCard, enableSelection }` accessible in cell renderers

3. Desktop table render:
   - Map `headerGroup.headers`. For each header:
     - If `enableSorting !== false`, apply `onClick={header.column.getToggleSortingHandler()}`
     - Show sort arrow via `column.getIsSorted()`
     - Apply `align` from meta as `text-left|center|right`
   - When `enableSelection`, render select-all checkbox header with `table.getToggleAllRowsSelectedHandler()`
   - Map `row.getVisibleCells()`. Apply `hideBelow` classes based on meta.
   - When `enableSelection`, render per-row checkbox with `row.getToggleSelectedHandler()`
   - `onRowClick` on `<tr>` + `stopPropagation` on checkbox

4. Mobile card render:
   - Map `rowModel.rows`. For each row with `renderMobileCard`, call it.
   - Otherwise, group visible cells by `cell.column.columnDef.meta.cardSection`
   - Render sections in order with the layout described above.

5. Loading state: `<Spinner />` + "Loading..." replacing both desktop and mobile views
6. Empty state: `EmptyState` from config, replacing both
7. Pagination: inline prev / page buttons / next at bottom of both containers

**After:** Add to `src/components/ui/index.ts`:
```ts
export { DataTable } from './DataTable/DataTable';
```

**Verification:**
```bash
rtk npx tsc --noEmit
rtk npm run lint
```

## Task 3: Write DataTable tests

**File:** Create `test/DataTable.test.tsx`

Tests (`// @vitest-environment jsdom`):

- Renders desktop `<table>` with correct column headers
- Renders mobile cards with correct section/side layout
- Shows loading spinner when `isLoading` is true
- Shows empty state when `data` is empty
- Selection: checkbox click, select-all toggle — verify `onSelectionChange` is called
- Sort: click header, verify sort direction toggles
- Row click: fires `onRowClick`, checkbox click does not
- Pagination: renders prev/next when `pageCount > 1`
- Pagination: hidden when `pageCount <= 1`
- `renderMobileCard` overrides default card
- Column hiding: `hideBelow: 'sm'` adds `hidden sm:table-cell`

**Verification:**
```bash
rtk npx vitest run test/DataTable.test.tsx
```

## Task 4: Migrate PatronsView

**File:** Modify `src/views/admin/PatronsView.tsx`

Replace the paired desktop `<table>` + mobile `<div>` cards (lines 409–608) with a single `<DataTable>` call.

Column definitions:

```ts
const columns: ColumnDef<PatronData>[] = [
  { id: 'name', header: 'Name',
    accessorFn: p => p.profile.name,
    cardSection: 0, cardSide: 'left', enableSorting: false },
  { id: 'type', header: 'Type',
    cell: (_, p) => <Badge ...>{p.isSinger ? 'Singer' : 'Patron'}</Badge>,
    cardSection: 0, cardSide: 'right', enableSorting: false },
  { id: 'email', header: 'Email',
    accessorFn: p => p.profile.expand?.user?.email || 'No email',
    cardSection: 1, cardSide: 'left', enableSorting: false },
  { id: 'ltv', header: 'LTV',
    cell: (_, p) => `$${(p.ltvCents / 100).toLocaleString(...)}`,
    align: 'right',
    cardSection: 1, cardSide: 'right', cardLabel: 'LTV', enableSorting: false },
  { id: 'lastDate', header: 'Last Transaction',
    cell: (_, p) => formatInTimezone(p.lastTransactionDate, ...),
    cardSection: 1, cardSide: 'left', cardLabel: 'Last:', enableSorting: false },
  { id: 'orders', header: 'Orders',
    accessorFn: p => p.transactionCount,
    align: 'right',
    cardSection: 1, cardSide: 'right', cardLabel: 'Orders', enableSorting: false },
];
```

For this pilot, enable all sorting, selection, row click. The data is already sorted by the consumer's `sortBy` memo, so sorting stays consumer-managed.

Usage:

```tsx
<DataTable
  columns={columns}
  data={filteredPatrons}
  isLoading={loading}
  emptyState={{ title: 'No Patrons Found', ... }}
  enableSelection
  onSelectionChange={(ids) => setSelectedIds(ids)}
  renderSelectionActions={({ selectedCount }) => (
    <Button ...>Send Message ({selectedCount})</Button>
  )}
  onRowClick={(patron) => handleOpenProfile(patron.profile)}
/>
```

Preserve:
- Stat cards above DataTable (Patrons Count, Total LTV)
- Search/filter bar above DataTable
- SingerModal at component bottom

**Verification:**
```bash
rtk npx tsc --noEmit
rtk npm run lint
rtk npx vitest run test/DataTable.test.tsx
```

## Task 5: Add Data Display section to AGENTS.md

Add under §3 after the Shoelace section:

```md
### Data Display

- Use `DataTable` from `src/components/ui/DataTable` for all tabular data displays.
  The component uses `@tanstack/react-table` internally for sort, selection,
  pagination, and column visibility state. Our wrapper provides the UI and
  mobile card layout.
- `cardSection: 0 | 1` + `cardSide: 'left' | 'right'` control automatic mobile layout.
  - Section 0: `justify-between` row (name + badge pattern)
  - Section 1: left-stack / right-stack with separator
- Selection, sort, and pagination are opt-in features.
- `renderMobileCard` is the escape hatch for complex rows (e.g., RosterTable).
- Sorting uses `enableSorting` on the column definition. For client-side sort,
  TanStack handles it automatically. For server-side sort, pass `manualSorting`
  and `onSortingChange`.
- Pagination is inline (prev / page buttons / next) using TanStack's
  `table.setPageIndex()` and `table.getPageCount()`. The `Pagination` component
  in `src/components/common/Pagination.tsx` is still used by legacy views.
```

---

## Verification Summary

| Check | Required after |
|-------|---------------|
| `rtk npm ls @tanstack/react-table` | Task 1 |
| `rtk npx tsc --noEmit` | Tasks 2, 4 |
| `rtk npm run lint` | Tasks 2, 4 |
| `rtk npx vitest run test/DataTable.test.tsx` | Tasks 3, 4 |

## Follow-up (after pilot)

Once PatronsView is confirmed working, migrate remaining views in order:

1. DonationsView (5 columns, similar shape — validates TanStack handles currency formatting and badges)
2. TicketingView — Will Call tab (7 columns — validates selection + multi-tab)
3. TicketingView — Bundles, Orders tabs
4. PollsDashboardView (uses paired pattern, no table)
5. ResourcesView (4 columns, no mobile fallback — validates hideBelow)
6. ReportsView (2 tables)
7. AuditionsView (6 columns, no mobile fallback)
8. RosterTable (complex, uses `renderMobileCard` escape hatch)
