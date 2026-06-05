import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import type { Event } from '../services/eventService';
import type { TicketBundle } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function PublicTicketListView() {
  useDocumentTitle('Ticket Sales');
  const [events, setEvents] = useState<Event[]>([]);
  const [bundles, setBundles] = useState<TicketBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState('America/New_York');

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsRes, bundlesRes, tz] = await Promise.all([
          pb.collection('events').getFullList<Event>({
            filter: 'isTicketingEnabled = true && date >= @now',
            sort: 'date',
          }),
          pb.collection('ticketBundles').getFullList<TicketBundle>({
            filter: 'isActive = true && saleEndDate >= @now',
            sort: 'saleEndDate',
            expand: 'events',
          }),
          fetchChoirTimezone().catch(() => 'America/New_York')
        ]);
        setEvents(eventsRes);
        setBundles(bundlesRes);
        setTimezone(tz);
      } catch (err) {
        console.error("Failed to load ticket data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw' }}>
        <p className="text-muted">Loading events...</p>
      </div>
    );
  }

  const hasContent = events.length > 0 || bundles.length > 0;

  return (
    <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'flex-start', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
      <AppCard style={{ width: '100%', maxWidth: 'min(720px, calc(100vw - 32px))' }}>
        <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
          <Link to="/login" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>Admin Login</Link>
          <h1 className="text-display" style={{ margin: 0 }}>Ticket Purchases</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            Select an upcoming performance or a season pass to purchase tickets online.
          </p>
        </div>

        {!hasContent ? (
          <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-xl) 0', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>🎟️</div>
            <p className="text-body" style={{ margin: 0, fontWeight: 500 }}>
              No tickets are currently open for online purchase.
            </p>
            <p className="text-muted text-sm">Please check back later or contact the administrator.</p>
          </div>
        ) : (
          <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            {/* Season Passes / Bundles Section */}
            {bundles.length > 0 && (
              <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                <h2 style={{ margin: 0, borderBottom: '2px solid var(--border)', paddingBottom: 'var(--space-xs)', color: 'var(--primary-deep)' }}>
                  Season Passes
                </h2>
                {bundles.map(bundle => (
                  <div key={bundle.id} className="card flex-responsive" style={{ padding: 'var(--space-md)', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', border: '2px solid var(--primary)', backgroundColor: 'var(--primary-light)' }}>
                    <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                      <span className="badge badge-success" style={{ alignSelf: 'flex-start', textTransform: 'uppercase', fontSize: '0.7rem' }}>Best Value</span>
                      <h3 style={{ margin: 0, color: 'var(--primary-deep)' }}>{bundle.title}</h3>
                      <p className="text-sm text-body" style={{ margin: 0 }}>
                        Discounted package for all included concerts.
                      </p>
                      {bundle.expand?.events && (
                        <div className="text-muted text-xs" style={{ marginTop: 'var(--space-xs)' }}>
                          <strong>Includes:</strong> {bundle.expand.events.map(e => e.title).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex-col" style={{ alignItems: 'flex-end', gap: 'var(--space-xs)' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-deep)' }}>
                        ${(bundle.priceCents / 100).toFixed(2)}
                      </span>
                      <Link
                        to={`/tickets/bundle/${bundle.id}`}
                        className="btn btn-primary"
                        style={{ textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}
                      >
                        Buy Season Pass
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Individual Concerts Section */}
            {events.length > 0 && (
              <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                <h2 style={{ margin: 0, borderBottom: '2px solid var(--border)', paddingBottom: 'var(--space-xs)' }}>
                  Concert Tickets
                </h2>
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
          </div>
        )}
      </AppCard>
    </div>
  );
}
