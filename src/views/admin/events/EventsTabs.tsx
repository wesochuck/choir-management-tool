import React from 'react';
import type { EventsTab } from './useEventFilters';
import { Button } from '../../../components/ui';

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
    <div
      className="mb-4 flex flex-col flex-wrap items-center justify-between gap-4 border-b border-border px-1 pb-1 md:flex-row"
    >
      {/* Tab buttons */}
      <div className="flex-row gap-2">
        {(['all', 'performances', 'rehearsals'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'ghost'}
            className="px-4 py-2 font-semibold capitalize"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'All Events' : tab}
          </Button>
        ))}
      </div>

      {/* Show past checkbox */}
      <label className="cursor-pointer flex-row items-center gap-2 text-sm font-semibold text-text-muted select-none">
        <input
          type="checkbox"
          checked={showPastEvents}
          onChange={(e) => setShowPastEvents(e.target.checked)}
          className="size-4 cursor-pointer accent-primary"
        />
        <span>Show past events</span>
      </label>
    </div>
  );
}

