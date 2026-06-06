import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { AppCard } from '../../components/common/AppCard';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import EventRosterView from './EventRosterView';
import './Dashboards.css';

export default function RsvpDashboardView() {
  const [searchParams] = useSearchParams();
  const { timezone } = useChoirSettings();
  const { events, isLoading, error } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState('');
  const hasDefaultedRef = useRef(false);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId && !hasDefaultedRef.current) {
      const urlEventId = searchParams.get('eventId');
      const resolved = resolveInitialEventId(events, urlEventId);
      if (resolved) {
        setSelectedEventId(resolved);
        hasDefaultedRef.current = true;
      }
    }
  }, [events, selectedEventId, searchParams]);

  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const selectedEvent = useMemo(() => 
    events.find(e => e.id === selectedEventId), 
    [events, selectedEventId]
  );

  return (
    <div className="flex-col db-container-vertical db-padding-v">
      <div className="admin-view-header">
        <div className="admin-view-titles">
          {/* Page title is already handled by PageLayout in App.tsx */}
        </div>
        <div className="admin-view-actions db-filter-actions">
          <div className="form-field-group db-flex-1">
            <label className="text-label db-filter-label db-font-sm">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="form-select"
            >
              <option value="">-- Choose an Event --</option>
              {sortedEvents.map(e => (
                <option key={e.id} value={e.id}>{formatInTimezone(e.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {e.title || e.expand?.venue?.name || ''} ({e.type})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className="card-accent db-accent-card">
          <div className="db-event-title-stack">
            <span className="text-muted text-xs db-filter-label db-letter-spacing">Active Event</span>
            {selectedEvent.title && <h2 className="db-event-headline">{selectedEvent.title}</h2>}
          </div>
          
          <div className="db-event-meta-row">
            <span className={`badge ${selectedEvent.type === 'Performance' ? 'badge-performance' : 'badge-rehearsal'} db-event-type-badge`}>
              {selectedEvent.type}
            </span>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.expand?.venue?.address || selectedEvent.expand?.venue?.name || '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-label db-venue-link"
            >
              📍 {selectedEvent.expand?.venue?.name || ''}
            </a>
            <span className="text-muted text-sm db-event-date">
              📅 {formatInTimezone(selectedEvent.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <AppCard className="db-loading-card">
          <p className="text-muted">Loading events...</p>
        </AppCard>
      ) : error ? (
        <AppCard className="db-error-card">
          <p className="db-error-text">{error}</p>
        </AppCard>
      ) : selectedEventId ? (
        <EventRosterView eventIdProp={selectedEventId} />
      ) : (
        <AppCard className="admin-empty-state">
          <p className="text-muted db-empty-state-text">Please select an event above to view and manage RSVPs.</p>
        </AppCard>
       )}
     </div>
   );
}
