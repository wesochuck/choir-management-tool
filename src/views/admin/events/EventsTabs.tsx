import React from 'react';
import type { EventsTab } from './useEventFilters';

interface EventsTabsProps {
  activeTab: EventsTab;
  setActiveTab: (tab: EventsTab) => void;
  showPastEvents: boolean;
  setShowPastEvents: (show: boolean) => void;
}

export function EventsTabs({
  activeTab,
  setActiveTab,
  showPastEvents,
  setShowPastEvents,
}: EventsTabsProps): React.JSX.Element {
  return (
    <div className="no-print mb-4 border-b border-border">
      <div className="-mb-px flex flex-row flex-wrap items-center justify-between gap-4">
        {/* Tab buttons */}
        <nav className="flex gap-2">
          {(['all', 'performances', 'rehearsals'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                className={`cursor-pointer rounded-t-lg px-5 py-2.5 text-sm font-medium capitalize transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary text-surface'
                    : 'border border-border bg-surface text-text-muted hover:bg-slate-50'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'all' ? 'All Events' : tab}
              </button>
            );
          })}
        </nav>

        {/* Show past checkbox */}
        <label className="flex cursor-pointer flex-row items-center gap-2 pb-2 text-sm font-semibold text-text-muted select-none md:pb-0">
          <input
            type="checkbox"
            checked={showPastEvents}
            onChange={(e) => setShowPastEvents(e.target.checked)}
            className="size-4 cursor-pointer accent-primary"
          />
          <span>Show past events</span>
        </label>
      </div>
    </div>
  );
}
