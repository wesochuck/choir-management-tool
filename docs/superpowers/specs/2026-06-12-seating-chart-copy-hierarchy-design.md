# Seating Chart Copy Hierarchy

## Problem

1. The "Copy" dropdown for seating charts shows a flat list of charts from other performances only. The option text shows the performance title, not the individual chart name — if a performance has multiple charts you can't distinguish them.
2. There is no way to copy a chart from within the same performance, making it cumbersome to create a variation (e.g., "add another chart but only tweak a few seats").

## Design

Replace the native `<Select>` copy picker with a custom Tailwind-styled dropdown that groups charts by performance in a hierarchical layout. Include all performances (current and others) so charts can be copied from any source.

### UX Flow

1. Admin sees a "Copy: Choose..." trigger button in the toolbar, matching the existing compact select size.
2. Clicking opens a positioned dropdown panel.
3. Charts are grouped under performance headers (bold, muted text). Each chart is an indented clickable row showing its name.
4. The current performance is shown alongside others, and the currently-active chart is disabled/dimmed (you can't copy a chart into itself).
5. Clicking a chart row triggers the confirmation dialog and copy (same existing `handleCopy` → `copyFromPerformance` flow).

### Trigger Button

- Styled to visually match the existing compact `Select` size (`h-8`, `text-xs`, same border/background/hover states).
- Shows `"Copy: Choose..."` by default. After a selection it could show `"Copy: <chart name>"` (optional — see open questions).
- Chevron icon (same SVG chevron from the Select component) indicates it's a dropdown.

### Dropdown Panel

- Absolutely positioned below the trigger, z-50.
- Rounded border, white background, subtle shadow.
- Max-height with scroll for overflow.
- Close behavior: click outside, Escape key, or selecting an option.

### Option Rows

- Performance group headers: bold, uppercase, muted text color, not clickable.
- Chart rows: indented with left padding, chart name text, hover highlight.
- Current active chart: disabled/dimmed, not clickable.
- Clicking a chart row closes the dropdown and triggers the copy.

### Grouping Logic

- Group all charts by `performance` (using `c.expand?.performance?.title` or `c.performance` ID as fallback).
- Current performance group is shown alongside others (not separated or filtered out).
- Sort groups and options by `sortOrder` where available, then by name.

## Implementation

### New Component

Create `src/components/admin/ChartCopyDropdown.tsx`:

```typescript
interface ChartCopyDropdownProps {
  allCharts: SeatingChart[];
  currentChartId: string;
  onCopy: (sourceChartId: string) => void;
}
```

Performance titles are resolved from each chart's `expand?.performance?.title` expand data, so no separate `performances` lookup is needed.

Internal state: `isOpen`, a ref-synced `isOpenRef` for the keydown listener, and `containerRef` for click-outside detection.

### Integration

In `SeatingView.tsx`:
- Replace the `<Select>` block (lines 544–557) with `<ChartCopyDropdown>`
- The new call site filters `allCharts` by venue at the integration point (`allCharts.filter(c => c.venue === venueId)`); the existing `allCharts` load effect (line 135–144) is unchanged
- The `currentChartId` prop is fed from `activeChartId || ''`
- The copy button's disabled state check (if `allCharts` has no eligible charts to copy from) remains unchanged

### Edge Cases

- **Charts without expand data**: If `c.expand?.performance?.title` is missing, fall back to `"Performance"` or the raw ID.
- **No charts to copy from**: Disable the dropdown trigger or show empty state in panel.
- **Only one chart (itself)**: If the only chart in the entire system is the current active one, the dropdown panel shows an empty state message.
- **Performance with no charts**: No group is shown for performances that have no charts.
- **Chart loaded after data**: If `allCharts` hasn't loaded yet, the trigger shows "Loading..." or is disabled.

## Open Questions

- Should the trigger button update to show the last-copied chart name after a selection, or always show "Choose..."? (Low priority, can be added later.)
- Should the dropdown include a header like "Copy from:" at the top? (Match the current "Copy:" label in the toolbar.)

## Scope

This is a contained UI change. No backend changes, no data model changes, no changes to the copy logic itself. Only the picker UI is replaced.

## Testing

- Unit test for `ChartCopyDropdown`: open/close behavior, click-outside, Escape, grouping, option rendering, current-chart disabled state.
- Manual verification: copy from another performance, copy from same performance (different chart), active chart is disabled.
