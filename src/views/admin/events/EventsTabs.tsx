import type { EventsTab } from './useEventFilters';
import './EventsTabs.css';

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
      className="flex-responsive events-tabs-container"
    >
      {/* Tab buttons */}
      <div className="flex-row events-tabs-nav">
        {(['all', 'performances', 'rehearsals'] as const).map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'} events-tab-button`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'All Events' : tab}
          </button>
        ))}
      </div>

      {/* Show past checkbox */}
      <label className="flex-row events-tab-checkbox-row">
        <input
          type="checkbox"
          checked={showPastEvents}
          onChange={(e) => setShowPastEvents(e.target.checked)}
          className="events-tab-checkbox-input"
        />
        <span>Show past events</span>
      </label>
    </div>
  );
}
