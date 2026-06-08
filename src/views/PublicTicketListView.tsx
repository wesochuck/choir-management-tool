import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { donationService, type DonationSettings, DEFAULT_DONATION_SETTINGS } from '../services/donationService';
import { eventService, type Event } from '../services/eventService';
import type { TicketBundle } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';
import { useDocumentTitle, useChoirName } from '../hooks/useDocumentTitle';
import './PublicForms.css';

export default function PublicTicketListView() {
  useDocumentTitle('Ticket Sales');
  const { choirName } = useChoirName();
  const [events, setEvents] = useState<Event[]>([]);
  const [bundles, setBundles] = useState<TicketBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState('America/New_York');
  const [donationSettings, setDonationSettings] = useState<DonationSettings | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsRes, bundlesRes, tz] = await Promise.all([
          eventService.getPublicEvents(),
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
        const ds = await donationService.getDonationSettings().catch(() => null);
        setDonationSettings(ds);
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
      <div className="flex-col pub-style-1">
        <p className="text-muted">Loading events...</p>
      </div>
    );
  }

  const hasContent = events.length > 0 || bundles.length > 0;

  return (
    <div className="flex-col pub-style-30">
      <AppCard className="pub-style-3">
        <div className="flex-col pub-style-4">
          <div className="flex-col pub-style-31">
            {choirName && <span className="text-xs text-muted pub-style-32">{choirName}</span>}
            <h1 className="text-display pub-style-6">Ticket Purchases</h1>
          </div>
          <p className="text-muted pub-style-6">
            Select an upcoming performance or a season pass to purchase tickets online.
          </p>
        </div>

        {!hasContent ? (
          <div className="flex-col pub-style-7">
            <div className="pub-style-8">🎟️</div>
            <p className="text-body pub-style-9">
              No tickets are currently open for online purchase.
            </p>
            <p className="text-muted text-sm">Please check back later or contact the administrator.</p>
          </div>
        ) : (
          <div className="flex-col pub-style-22">
            {/* Season Passes / Bundles Section */}
            {bundles.length > 0 && (
              <div className="flex-col pub-style-23">
                <h2 className="pub-style-45">
                  Season Passes
                </h2>
                {bundles.map(bundle => (
                  <div key={bundle.id} className="card flex-responsive pub-style-46">
                    <div className="flex-col pub-style-24">
                      <span className="badge badge-success pub-style-47">Best Value</span>
                      <h3 className="pub-style-18">{bundle.title}</h3>
                      <p className="text-sm text-body pub-style-6">
                        Discounted package for all included concerts.
                      </p>
                      {bundle.expand?.events && (
                        <div className="text-muted text-xs pub-style-48">
                          <strong>Includes:</strong> {bundle.expand.events.map(e => e.title).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex-col pub-style-49">
                      <span className="pub-style-50">
                        ${(bundle.priceCents / 100).toFixed(2)}
                      </span>
                      <Link
                        to={`/tickets/bundle/${bundle.id}`}
                        className="btn btn-primary pub-style-51"
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
              <div className="flex-col pub-style-23">
                <h2 className="pub-style-52">
                  Concert Tickets
                </h2>
                {events.map(event => (
                  <div key={event.id} className="card flex-responsive pub-style-53">
                    <div className="flex-col pub-style-24">
                      {event.eventGraphic && (
                        <img
                          src={pb.files.getURL(event, event.eventGraphic)}
                          alt={event.title} className="pub-style-54"
                        />
                      )}
                      <h3 className="pub-style-6">{event.title}</h3>
                      <span className="text-muted text-sm">
                        {formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <Link
                      to={`/tickets/${event.id}`}
                      className="btn btn-primary pub-style-51"
                    >
                      Buy Tickets
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-col pub-style-63 pub-mt-xl pub-border-dashed pub-pt-lg">
          <div className="flex-col pub-style-31 pub-text-center">
            <h2 className="pub-style-18">{donationSettings?.buttonText ?? DEFAULT_DONATION_SETTINGS.buttonText}</h2>
            <p className="text-body pub-max-w-480">
              {donationSettings?.description ?? DEFAULT_DONATION_SETTINGS.description}
            </p>
          </div>
          <div className="flex-row pub-justify-center pub-mt-md">
            <Link to="/donate" className="btn btn-primary btn-lg pub-min-w-200">
              Make a Donation
            </Link>
          </div>
        </div>
      </AppCard>
    </div>
  );
}
