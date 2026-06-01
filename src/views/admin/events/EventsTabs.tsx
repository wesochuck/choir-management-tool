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
        marginBottom: '4px',
      }}
    >
      {/* Tab buttons */}
      <div
        className="flex-row"
        style={{
          backgroundColor: 'var(--primary-light, #f1f5f9)',
          padding: '4px',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--border, #cbd5e1)',
          gap: '4px',
        }}
      >
        {(['all', 'performances', 'rehearsals'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              height: '32px',
              padding: '0 var(--space-md)',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: 'calc(var(--radius-md) - 2px)',
              backgroundColor:
                activeTab === tab ? 'var(--primary)' : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textTransform: 'capitalize',
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
