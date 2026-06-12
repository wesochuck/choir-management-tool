# Donations View Design Reference Spec

This document details the responsive design standards, grid structures, and Tailwind CSS patterns implemented in [DonationsView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/DonationsView.tsx). This serves as a reference point and pattern library for future dashboard refactors in the Choir Management Tool.

---

## 1. Grid & Filter Deck Layout

The filter deck is optimized to display complex inputs compactly without layout breakages on mobile screens.

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
  <div className="md:col-span-1">
    <FormField label="Search">...</FormField>
  </div>
  <div className="md:col-span-2 flex flex-row gap-4">
    <div className="flex-1 min-w-0">
      <FormField label="From Date">...</FormField>
    </div>
    <div className="flex-1 min-w-0">
      <FormField label="To Date">...</FormField>
    </div>
  </div>
  <div className="flex items-end gap-2">
    <FormField label="Sort By">...</FormField>
    {/* Reset button only shows if active filters exist */}
  </div>
</div>
```

### Key Tailwind Patterns
* **Grid Spanning:** 
  * The main wrapper is `grid grid-cols-1 md:grid-cols-4 gap-4`. On mobile, items naturally stack vertically. On desktop, they layout inline in 4 grid columns.
* **Flex Date Row:** 
  * The date inputs are wrapped inside a single grid item spanning two columns on desktop (`md:col-span-2`).
  * The wrapper uses `flex flex-row gap-4` to force the inputs to stay side-by-side even on small screens, ensuring a consistent horizontal date-range layout.
  * **Shrink Safety (`min-w-0 flex-1`):** Native date pickers have a default minimum width in mobile browsers. Adding `min-w-0 flex-1` to the containers ensures they shrink cleanly and prevent horizontal viewport overflow.

---

## 2. Responsive Navigation & Collapsible Action Buttons

Tab navigation and active primary buttons are designed to prevent text wrapping on mobile headers.

```tsx
<div className="w-full flex flex-row items-center justify-between border-b border-slate-200 pb-px">
  <div className="flex gap-3 md:gap-6">
    {/* Navigation Tabs */}
  </div>
  <div className="flex items-center gap-2 pb-1.5">
    {/* Export CSV / Add Level Button */}
    <Button
      variant="secondary"
      className="px-3 md:px-6 font-semibold shadow-sm"
      title="Export CSV"
      icon={<DownloadIcon />}
    >
      <span className="hidden md:inline">Export CSV</span>
    </Button>
  </div>
</div>
```

### Key Tailwind Patterns
* **Responsive Tab Gap:** 
  * Spacing between tabs scales from `gap-3` on mobile to `gap-6` on desktop, keeping tabs inline.
* **Text Hiding (`hidden md:inline`):** 
  * Text content inside buttons is wrapped in `<span className="hidden md:inline">`. On mobile devices, the text collapses, rendering the button as a compact, touch-friendly icon button.
* **Padding Scaling (`px-3 md:px-6`):** 
  * Button padding scales down to `px-3` on mobile (creating a balanced square profile for icon-only display) and expands to `px-6` on desktop.
* **Title Attribute:** 
  * When labels are hidden on mobile, `title` props are utilized to maintain accessibility and show default tooltips on hover.

---

## 3. Polymorphic History Layout (Mobile Cards vs. Desktop Table)

To eliminate horizontal scrolling, tabular information is split into distinct desktop and mobile presentations.

### Desktop Table (`hidden md:block`)
Dense tables are hidden on mobile viewports and displayed only on larger screens:
* Wrapper: `<div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 shadow-sm">`
* Component: Standard HTML `<table>` displaying dense tabular columns.

### Mobile Card List (`md:hidden`)
Tabular records are mapped into stacked, full-width blocks optimized for vertical reading:
* Wrapper: `<div className="md:hidden bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">`
* Nesting Divider Wrapper: `<div className="divide-y divide-slate-100">`
* Component: Stacked rows with vertical flex layouts.

```tsx
/* Mobile Card Element Structure */
<div className="p-4 flex flex-col gap-3 transition-colors hover:bg-slate-50/40">
  {/* Row 1: Date (text-xs text-slate-400) & Status Badge */}
  {/* Row 2: Donor Info (text-sm font-bold) & Amount (text-base font-extrabold) */}
  {/* Row 3: Tribute Notice (text-xs bg-slate-50 border p-2 rounded-lg) */}
  {/* Row 4: Primary Actions (w-full btn-danger) */}
</div>
```

### Key Tailwind Patterns
* **Class Conflict Avoidance:** 
  * Tailwind CSS linters flag conflicts when `border-slate-100` and `divide-slate-100` are declared on the same element, since both set border styles.
  * **Solution:** Separate them into nested containers: an outer container gets the border (`border border-slate-100`) and the inner container applies the dividing lines (`divide-y divide-slate-100`).
* **Visual Hierarchy:**
  * Dates use secondary styling (`text-xs text-slate-400 font-medium`).
  * Amounts are emphasised with bold typography (`text-base font-extrabold text-slate-900`).
  * Status utilizes semantic badges (`Badge` variants).

---

## 4. Theme & Token Configurations

The layout utilizes the following semantic theme overrides configured in Tailwind CSS v4:
* **Backgrounds & Card Fills:** `bg-surface` (white cards), `bg-bg` (main background), and `bg-slate-50/60` (filter background block).
* **Borders:** `border-slate-100` (subtle separators) and `border-slate-200` (form fields).
* **Text:** `text-slate-900` (headers, bold amounts), `text-slate-500` (labels/emails), and `text-slate-400` (fine dates/meta).
* **Interactive Focus Ring:** `focus:border-primary focus:ring-1 focus:ring-primary` for input selection outlines.
