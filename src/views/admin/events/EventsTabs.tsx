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
      className="flex-responsive"
      style={{
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 4px',
        gap: 'var(--space-md)',
        flexWrap: 'wrap',
        marginBottom: 'var(--space-md)',
        borderBottom: '1px solid var(--border)',
        paddingBottom: 'var(--space-xs)',
      }}
    >
      {/* Tab buttons */}
      <div
        className="flex-row"
        style={{
          gap: 'var(--space-sm)',
        }}
      >
        {(['all', 'performances', 'rehearsals'] as const).map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '8px 16px', 
              fontWeight: 600,
              textTransform: 'capitalize'
            }}
          >
            {tab === 'all' ? 'All Events' : tab}
          </button>
        ))}
      </div>

      {/* Show past checkbox */}
      <label
        className="flex-row"
        style={{
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
        }}
      >
        <input
          type="checkbox"
          checked={showPastEvents}
          onChange={(e) => setShowPastEvents(e.target.checked)}
          style={{
            width: '16px',
            height: '16px',
            accentColor: 'var(--primary)',
            cursor: 'pointer',
          }}
        />
        <span>Show past events</span>
      </label>
    </div>
  );
}
