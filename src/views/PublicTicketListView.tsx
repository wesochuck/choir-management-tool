import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { donationService, type DonationSettings, DEFAULT_DONATION_SETTINGS } from '../services/donationService';
import { eventService, type Event } from '../services/eventService';
import type { TicketBundle } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Spinner } from '../components/ui/Spinner/Spinner';
import PublicLogo from '../components/common/PublicLogo';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';
import { useDocumentTitle, useChoirName } from '../hooks/useDocumentTitle';

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
      <div className="flex flex-col min-h-screen justify-center items-center w-screen">
        <Spinner size="medium" />
        <p className="text-text-muted">Loading events...</p>
      </div>
    );
  }

  const hasContent = events.length > 0 || bundles.length > 0;

  return (
    <div className="flex flex-col min-h-screen justify-start items-center w-screen p-4">
      <PublicLogo />
      <AppCard className="w-full max-w-[720px]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            {choirName && <span className="text-xs text-text-muted font-bold uppercase tracking-wider">{choirName}</span>}
            <h1 className="text-display m-0">Ticket Purchases</h1>
          </div>
          <p className="text-text-muted m-0">
            Select an upcoming performance or a season pass to purchase tickets online.
          </p>
        </div>

        {!hasContent ? (
          <div className="flex flex-col gap-4 py-8 text-center">
            <div className="text-5xl">🎟️</div>
            <p className="text-body m-0 font-medium">
              No tickets are currently open for online purchase.
            </p>
            <p className="text-text-muted text-sm">Please check back later or contact the administrator.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {bundles.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="m-0 border-b-2 border-border pb-1 text-primary-deep">
                  Season Passes
                </h2>
                {bundles.map(bundle => (
                  <div key={bundle.id} className="card flex flex-col md:flex-row p-4 justify-between items-center gap-4 border-2 border-primary bg-primary-light">
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-success-bg text-success-text self-start">Best Value</span>
                      <h3 className="m-0 text-primary-deep">{bundle.title}</h3>
                      <p className="text-sm text-body m-0">
                        Discounted package for all included concerts.
                      </p>
                      {bundle.expand?.events && (
                        <div className="text-text-muted text-xs mt-1">
                          <strong>Includes:</strong> {bundle.expand.events.map(e => e.title).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xl font-bold text-primary-deep">
                        ${(bundle.priceCents / 100).toFixed(2)}
                      </span>
                      <Button
                        as={Link}
                        to={`/tickets/bundle/${bundle.id}`}
                        variant="primary"
                        className="no-underline text-center whitespace-nowrap"
                      >
                        Buy Season Pass
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {events.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="m-0 border-b-2 border-border pb-1">
                  Concert Tickets
                </h2>
                {events.map(event => (
                  <div key={event.id} className="card flex flex-col md:flex-row p-4 justify-between items-center gap-4">
                    <div className="flex-1 flex flex-col gap-1">
                      {event.eventGraphic && (
                        <img
                          src={pb.files.getURL(event, event.eventGraphic)}
                          alt={event.title} className="w-full max-h-44 object-cover rounded-sm mb-1"
                        />
                      )}
                      <h3 className="m-0">{event.title}</h3>
                      <span className="text-text-muted text-sm">
                        {formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <Button
                      as={Link}
                      to={`/tickets/${event.id}`}
                      variant="primary"
                      className="no-underline text-center whitespace-nowrap"
                    >
                      Buy Tickets
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="w-full p-4 bg-neutral-bg rounded-lg mt-8 border-t-2 border-dashed border-border pt-6">
          <div className="flex flex-col gap-0.5 text-center">
            <h2 className="m-0 text-primary-deep">{donationSettings?.buttonText ?? DEFAULT_DONATION_SETTINGS.buttonText}</h2>
            <p className="text-body max-w-[480px] mx-auto">
              {donationSettings?.description ?? DEFAULT_DONATION_SETTINGS.description}
            </p>
          </div>
          <div className="flex flex-row justify-center mt-4">
            <Button as={Link} to="/donate" variant="primary" className="min-w-[200px]">
              Make a Donation
            </Button>
          </div>
        </div>
      </AppCard>
    </div>
  );
}
