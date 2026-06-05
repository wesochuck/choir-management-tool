import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import type { Event } from '../services/eventService';
import { AppCard } from '../components/common/AppCard';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function PublicTicketListView() {
  useDocumentTitle('Ticket Sales');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState('America/New_York');

  useEffect(() => {
    async function loadEvents() {
      try {
        const [res, tz] = await Promise.all([
          pb.collection('events').getFullList<Event>({
            filter: 'isTicketingEnabled = true && date >= @now',
            sort: 'date',
          }),
          fetchChoirTimezone().catch(() => 'America/New_York')
        ]);
        setEvents(res);
        setTimezone(tz);
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw' }}>
        <p className="text-muted">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'flex-start', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
      <AppCard style={{ width: '100%', maxWidth: 'min(720px, calc(100vw - 32px))' }}>
        <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
          <Link to="/login" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>Admin Login</Link>
          <h1 className="text-display" style={{ margin: 0 }}>Ticket Purchases</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            Select an upcoming performance to purchase tickets online.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-xl) 0', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>🎟️</div>
            <p className="text-body" style={{ margin: 0, fontWeight: 500 }}>
              No events are currently open for online ticket sales.
            </p>
            <p className="text-muted text-sm">Please check back later or contact the administrator.</p>
          </div>
        ) : (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            {events.map(event => (
              <div key={event.id} className="card flex-responsive" style={{ padding: 'var(--space-md)', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                  {event.eventGraphic && (
                    <img
                      src={pb.files.getURL(event, event.eventGraphic)}
                      alt={event.title}
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-xs)' }}
                    />
                  )}
                  <h3 style={{ margin: 0 }}>{event.title}</h3>
                  <span className="text-muted text-sm">
                    {formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <Link
                  to={`/tickets/${event.id}`}
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}
                >
                  Buy Tickets
                </Link>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
