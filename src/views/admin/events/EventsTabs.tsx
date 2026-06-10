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
      className="flex-responsive justify-between items-center px-1 gap-4 flex-wrap mb-4 border-b border-border pb-1"
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
      <label className="flex-row items-center gap-2 cursor-pointer select-none text-sm font-semibold text-text-muted">
        <input
          type="checkbox"
          checked={showPastEvents}
          onChange={(e) => setShowPastEvents(e.target.checked)}
          className="w-4 h-4 accent-primary cursor-pointer"
        />
        <span>Show past events</span>
      </label>
    </div>
  );
}
