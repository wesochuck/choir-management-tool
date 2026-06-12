# Seating Chart Copy Hierarchy Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat native-`<select>` copy picker with a Tailwind-styled custom dropdown that groups charts hierarchically by performance and includes same-performance charts.

**Architecture:** A lightweight `ChartCopyDropdown` component that renders a trigger button + absolutely positioned panel, grouped by performance using chart expand data. No backend changes.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Vitest (jsdom)

---

### Task 1: Create ChartCopyDropdown component

**Files:**
- Create: `src/components/admin/ChartCopyDropdown.tsx`
- Test: `src/components/admin/ChartCopyDropdown.test.tsx`

**Props interface:**
```typescript
interface ChartCopyDropdownProps {
  allCharts: SeatingChart[];
  currentChartId: string;
  onCopy: (sourceChartId: string) => void;
}
```

**Behavior:**
- Trigger button shows `"Copy: Choose..."` with chevron icon
- Click opens a dropdown panel with charts grouped by performance
- Performance group headers are bold/muted/not clickable
- Chart rows are indented, show chart `name`, clickable with hover highlight
- Current active chart is disabled (cannot copy into itself)
- Click-outside and Escape close the panel
- Selecting a chart calls `onCopy(chartId)` and closes the panel

- [x] **Step 1: Write the test file**

```typescript
// @vitest-environment jsdom
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ChartCopyDropdown } from './ChartCopyDropdown';
import type { SeatingChart } from '../../services/seatingService';

function makeChart(overrides: Partial<SeatingChart> & { id: string }): SeatingChart {
  return {
    performance: 'perf-1',
    venue: 'venue-1',
    name: 'Test Chart',
    assignments: {},
    formationId: 'fmt-1',
    sortOrder: 0,
    layoutOverride: null,
    expand: {
      performance: { id: 'perf-1', title: 'Performance 1', date: '2026-01-01' },
    },
    ...overrides,
  } as unknown as SeatingChart;
}

function getTriggerButton(): HTMLElement {
  return screen.getByRole('button', { name: /copy/i });
}

const charts: SeatingChart[] = [
  makeChart({ id: '1', name: 'Main', performance: 'perf-1', sortOrder: 0, expand: { performance: { id: 'perf-1', title: 'Spring Concert', date: '2026-06-01' } } }),
  makeChart({ id: '2', name: 'Alt Layout', performance: 'perf-1', sortOrder: 1, expand: { performance: { id: 'perf-1', title: 'Spring Concert', date: '2026-06-01' } } }),
  makeChart({ id: '3', name: 'Main', performance: 'perf-2', sortOrder: 0, expand: { performance: { id: 'perf-2', title: 'Fall Fundraiser', date: '2026-10-01' } } }),
];

describe('ChartCopyDropdown', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders trigger with "Copy: Choose..."', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    assert.ok(screen.getByText('Copy: Choose...'));
  });

  it('opens dropdown panel on trigger click', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    assert.ok(screen.getByText('Spring Concert'));
    assert.ok(screen.getByText('Fall Fundraiser'));
  });

  it('shows chart names indented under performance groups', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    const mainCharts = screen.getAllByText('Main');
    assert.strictEqual(mainCharts.length, 2);
    assert.ok(screen.getByText('Alt Layout'));
  });

  it('disables current active chart option', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    const disabledCharts = screen.getAllByText('Main').filter(el => el.closest('[data-disabled]'));
    assert.strictEqual(disabledCharts.length, 1);
  });

  it('does not fire onCopy when clicking the disabled current chart', () => {
    const onCopy = mock.fn();
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={onCopy}
      />
    );
    fireEvent.click(getTriggerButton());
    const disabledChart = screen.getAllByText('Main').find(el => el.closest('[data-disabled]'));
    assert.ok(disabledChart);
    fireEvent.click(disabledChart!);
    assert.strictEqual(onCopy.mock.callCount(), 0);
  });

  it('calls onCopy with chart id when clicking a different chart', () => {
    const onCopy = mock.fn();
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={onCopy}
      />
    );
    fireEvent.click(getTriggerButton());
    fireEvent.click(screen.getByText('Alt Layout'));
    assert.strictEqual(onCopy.mock.callCount(), 1);
    assert.deepStrictEqual(onCopy.mock.calls[0].arguments, ['2']);
  });

  it('closes dropdown on Escape key', () => {
    render(
      <ChartCopyDropdown
        allCharts={charts}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    assert.ok(screen.getByText('Spring Concert'));
    fireEvent.keyDown(document, { key: 'Escape' });
    assert.ok(!screen.queryByText('Spring Concert'));
  });

  it('closes dropdown on click outside', () => {
    render(
      <div>
        <span data-testid="outside">Outside</span>
        <ChartCopyDropdown
          allCharts={charts}
          currentChartId="1"
          onCopy={() => {}}
        />
      </div>
    );
    fireEvent.click(getTriggerButton());
    assert.ok(screen.getByText('Spring Concert'));
    fireEvent.mouseDown(screen.getByTestId('outside'));
    assert.ok(!screen.queryByText('Spring Concert'));
  });

  it('shows empty state when no charts are available to copy', () => {
    render(
      <ChartCopyDropdown
        allCharts={[]}
        currentChartId="1"
        onCopy={() => {}}
      />
    );
    fireEvent.click(getTriggerButton());
    assert.ok(screen.getByText(/no.*chart/i));
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `rtk npx vitest run src/components/admin/ChartCopyDropdown.test.tsx`
Expected: FAIL — component not found

- [x] **Step 3: Write the component implementation**

```typescript
import { useState, useRef, useEffect, useMemo } from 'react';
import type { SeatingChart } from '../../services/seatingService';

interface ChartCopyDropdownProps {
  allCharts: SeatingChart[];
  currentChartId: string;
  onCopy: (sourceChartId: string) => void;
}

interface ChartGroup {
  performanceTitle: string;
  charts: SeatingChart[];
}

function formatPerformanceGroupKey(chart: SeatingChart): string {
  return chart.expand?.performance?.id || chart.performance;
}

function getPerformanceTitle(chart: SeatingChart): string {
  return chart.expand?.performance?.title || 'Unknown Performance';
}

export function ChartCopyDropdown({ allCharts, currentChartId, onCopy }: ChartCopyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);
  isOpenRef.current = isOpen;

  const groups = useMemo(() => {
    const map = new Map<string, SeatingChart[]>();
    for (const chart of allCharts) {
      const key = formatPerformanceGroupKey(chart);
      const list = map.get(key);
      if (list) {
        list.push(chart);
      } else {
        map.set(key, [chart]);
      }
    }
    const result: ChartGroup[] = [];
    for (const charts of map.values()) {
      result.push({
        performanceTitle: getPerformanceTitle(charts[0]),
        charts: [...charts].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      });
    }
    result.sort((a, b) => a.performanceTitle.localeCompare(b.performanceTitle));
    return result;
  }, [allCharts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenRef.current) {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (chartId: string) => {
    setIsOpen(false);
    onCopy(chartId);
  };

  const hasCharts = groups.length > 0;

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex h-8 cursor-pointer items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs text-text transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-primary hover:bg-primary-light focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="mr-1 font-semibold whitespace-nowrap">Copy:</span>
        <span className="text-muted">Choose...</span>
        <svg
          className={`size-3.5 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="animate-fade-in absolute top-full left-0 z-50 mt-1 max-h-[350px] min-w-[220px] overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
          role="listbox"
        >
          {!hasCharts ? (
            <div className="px-3 py-4 text-center text-xs text-muted">
              No charts available to copy
            </div>
          ) : (
            groups.map(group => (
              <div key={group.performanceTitle}>
                <div className="border-b border-border bg-surface-muted px-3 py-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">
                  {group.performanceTitle}
                </div>
                {group.charts.map(chart => {
                  const isSelf = chart.id === currentChartId;
                  return (
                    <button
                      key={chart.id}
                      type="button"
                      data-disabled={isSelf ? '' : undefined}
                      onClick={() => !isSelf && handleSelect(chart.id)}
                      className={`flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-xs transition-colors duration-150 ${
                        isSelf
                          ? 'cursor-not-allowed text-muted/50'
                          : 'text-text hover:bg-primary-light'
                      }`}
                      role="option"
                      aria-disabled={isSelf}
                    >
                      <span className="ml-3">{chart.name}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `rtk npx vitest run src/components/admin/ChartCopyDropdown.test.tsx`
Expected: PASS (all tests)

---

### Task 2: Integrate into SeatingView

**Files:**
- Modify: `src/views/admin/SeatingView.tsx`

**Changes:**
- Replace the native `<Select>` copy dropdown (lines 544–557) with `<ChartCopyDropdown>`
- Remove the `performanceId !== performanceId` filter — include all charts
- Import the new component

- [x] **Step 1: Replace the native Select with ChartCopyDropdown**

Old code (lines 544–557):
```tsx
<div className="flex min-w-[200px] flex-1 flex-row items-center justify-center gap-1">
   <span className="text-muted text-xs font-semibold whitespace-nowrap">Copy:</span>
   <Select 
     onChange={(e) => handleCopy(e.target.value)}
     value=""
     size="compact" className="max-w-[200px] flex-1"
   >
     <option value="">-- Choose --</option>
     {allCharts
       .filter(c => c.venue === venueId && c.performance !== performanceId)
       .map(c => (
         <option key={c.id} value={c.id}>{c.expand?.performance?.title || 'Untitled'}</option>
       ))}
   </Select>
</div>
```

Replace with:
```tsx
<ChartCopyDropdown
  allCharts={allCharts.filter(c => c.venue === venueId)}
  currentChartId={activeChartId || ''}
  onCopy={handleCopy}
/>
```

Also add the import (with the existing imports):
```tsx
import { ChartCopyDropdown } from '../../components/admin/ChartCopyDropdown';
```

- [x] **Step 2: Run type check**

Run: `rtk npx tsc --noEmit`
Expected: No type errors

---

### Task 3: Run project checks

- [x] **Step 1: Run tests**

Run: `rtk npm test`
Expected: All tests pass

- [x] **Step 2: Run lint**

Run: `rtk npx tsc --noEmit`
Expected: No errors
