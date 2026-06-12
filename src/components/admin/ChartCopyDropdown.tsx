import { useState, useRef, useMemo } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
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

  useClickOutside(containerRef, () => setIsOpen(false), {
    enabled: isOpen,
    escape: true,
  });

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
          aria-label="Copy seating chart from"
        >
          {!hasCharts ? (
            <div className="px-3 py-4 text-center text-xs text-muted">
              No charts available to copy
            </div>
          ) : (
            groups.map(group => {
              const groupId = group.performanceTitle.replace(/\s+/g, '-').toLowerCase();
              return (
                <div key={groupId}>
                  <div
                    id={`hdr-${groupId}`}
                    className="border-b border-border bg-surface-muted px-3 py-1.5 text-[11px] font-bold tracking-wider text-muted uppercase"
                  >
                    {group.performanceTitle}
                  </div>
                  <div role="group" aria-labelledby={`hdr-${groupId}`}>
                    {group.charts.map(chart => {
                      const isSelf = chart.id === currentChartId;
                      return (
                        <button
                          key={chart.id}
                          type="button"
                          data-disabled={isSelf || undefined}
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
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
