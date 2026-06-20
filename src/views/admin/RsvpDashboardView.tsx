import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { AppCard } from '../../components/common/AppCard';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import EventRosterView from './EventRosterView';
import { Badge, Select } from '../../components/ui';

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

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  return (
    <div className="flex flex-col gap-6 py-4">
      <AdminPageHeader
        title="RSVP Management"
        description="Select an event, review RSVP balance, and update singer responses."
      />

      <AppCard className="mb-0">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-label text-text-muted text-xs font-semibold uppercase">
              Select Event
            </label>
            <Select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              size="small"
              className="w-full"
            >
              <option value="">-- Choose an Event --</option>
              {sortedEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {formatInTimezone(e.date, timezone, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  · {e.title || e.expand?.venue?.name || ''} · {e.type}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </AppCard>

      {selectedEvent && (
        <AppCard className="mb-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Active Event
              </span>
              {selectedEvent.title && (
                <h2 className="text-primary-deep m-0 truncate text-2xl font-extrabold">
                  {selectedEvent.title}
                </h2>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={selectedEvent.type === 'Performance' ? 'performance' : 'rehearsal'}>
                {selectedEvent.type}
              </Badge>
              {selectedEvent.expand?.venue?.name && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.expand?.venue?.address || selectedEvent.expand?.venue?.name || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-deep flex items-center gap-1 text-sm font-semibold no-underline hover:underline"
                >
                  📍 {selectedEvent.expand.venue.name}
                </a>
              )}
              <span className="text-text-muted flex items-center gap-1 text-sm font-medium">
                📅{' '}
                {formatInTimezone(selectedEvent.date, timezone, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </AppCard>
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
        <AppCard className="text-text-muted flex flex-col items-center justify-center py-12">
          <p className="text-muted">Please select an event above to view and manage RSVPs.</p>
        </AppCard>
      )}
    </div>
  );
}
