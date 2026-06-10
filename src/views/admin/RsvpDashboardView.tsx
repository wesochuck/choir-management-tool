import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { AppCard } from '../../components/common/AppCard';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import EventRosterView from './EventRosterView';

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
    <div className="flex-col py-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="admin-view-titles">
          {/* Page title is already handled by PageLayout in App.tsx */}
        </div>
        <div className="flex min-w-[320px] items-center gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-label text-xs font-semibold text-text-muted uppercase">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="block w-full rounded-md border-border bg-surface px-3 py-2 text-sm"
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
        <div className="card-accent flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted text-xs font-semibold tracking-wider uppercase">Active Event</span>
            {selectedEvent.title && <h2 className="m-0 text-2xl font-extrabold text-primary-deep">{selectedEvent.title}</h2>}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${selectedEvent.type === 'Performance' ? 'bg-performance-bg text-performance-text' : 'bg-primary-light text-primary-deep'}`}>
              {selectedEvent.type}
            </span>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.expand?.venue?.address || selectedEvent.expand?.venue?.name || '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-label flex items-center gap-1 text-sm font-semibold text-primary-deep"
            >
              📍 {selectedEvent.expand?.venue?.name || ''}
            </a>
            <span className="text-muted text-sm font-medium">
              📅 {formatInTimezone(selectedEvent.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <AppCard>
          <p className="text-muted">Loading events...</p>
        </AppCard>
      ) : error ? (
        <AppCard>
          <p>{error}</p>
        </AppCard>
      ) : selectedEventId ? (
        <EventRosterView eventIdProp={selectedEventId} />
      ) : (
        <AppCard className="flex flex-col items-center justify-center py-12 text-text-muted">
          <p className="text-muted">Please select an event above to view and manage RSVPs.</p>
        </AppCard>
       )}
     </div>
   );
}
