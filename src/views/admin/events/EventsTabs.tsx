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
}: EventsTabsProps) {
  return (
    <div
      className="mb-4 flex flex-col flex-wrap items-center justify-between gap-4 border-b border-border px-1 pb-1 md:flex-row"
    >
      {/* Tab buttons */}
      <div className="flex-row gap-2">
        {(['all', 'performances', 'rehearsals'] as const).map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'} px-4 py-2 font-semibold capitalize`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'All Events' : tab}
          </button>
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
