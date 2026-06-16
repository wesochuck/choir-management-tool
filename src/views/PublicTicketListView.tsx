import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import { donationService, type DonationSettings, DEFAULT_DONATION_SETTINGS } from '../services/donationService';
import { eventService } from '../services/eventService';
import type { TicketBundle } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { PublicBrandingWrapper } from '../components/common/PublicBrandingWrapper';
import { formatInTimezone } from '../lib/timezone';
import { useDocumentTitle, useChoirSettings } from '../hooks/useDocumentTitle';
import { queryKeys } from '../lib/queryKeys';

export default function PublicTicketListView() {
  useDocumentTitle('Ticket Sales');
  const { choirName, timezone } = useChoirSettings();

  const eventsQuery = useQuery({
    queryKey: queryKeys.events.publicList,
    queryFn: () => eventService.getPublicEvents(),
  });

  const bundlesQuery = useQuery({
    queryKey: queryKeys.tickets.publicBundles,
    queryFn: () => pb.collection('ticketBundles').getFullList<TicketBundle>({
      filter: 'isActive = true && saleEndDate >= @now',
      sort: 'saleEndDate',
      expand: 'events',
    }),
  });

  const donationSettingsQuery = useQuery({
    queryKey: queryKeys.donations.settings,
    queryFn: () => donationService.getDonationSettings(),
  });

  const events = eventsQuery.data ?? [];
  const bundles = bundlesQuery.data ?? [];
  const donationSettings: DonationSettings | null = donationSettingsQuery.data ?? null;
  const isLoading =
    eventsQuery.isLoading || bundlesQuery.isLoading || donationSettingsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <Spinner size="medium" />
        <p className="text-text-muted">Loading events...</p>
      </div>
    );
  }

  const hasContent = events.length > 0 || bundles.length > 0;

  return (
    <PublicBrandingWrapper>
      <AppCard className="w-full max-w-[720px]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            {choirName && <span className="text-xs font-bold tracking-wider text-text-muted uppercase">{choirName}</span>}
            <h1 className="text-display m-0">Ticket Purchases</h1>
          </div>
          <p className="m-0 text-text-muted">
            Select an upcoming performance or a season pass to purchase tickets online.
          </p>
        </div>

        {!hasContent ? (
          <div className="flex flex-col gap-4 py-8 text-center">
            <div className="text-5xl">🎟️</div>
            <p className="text-body m-0 font-medium">
              No tickets are currently open for online purchase.
            </p>
            <p className="text-sm text-text-muted">Please check back later or contact the administrator.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {bundles.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="m-0 border-b-2 border-border pb-1 text-primary-deep">
                  Season Passes
                </h2>
                {bundles.map(bundle => (
                  <div key={bundle.id} className="flex flex-col items-center justify-between gap-4 rounded-xl border-2 border-primary bg-primary-light p-4 shadow-sm transition-all duration-200 hover:shadow-md md:flex-row">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="inline-flex items-center self-start rounded bg-success-bg px-2 py-0.5 text-xs font-semibold tracking-wider text-success-text uppercase">Best Value</span>
                      <h3 className="m-0 text-primary-deep">{bundle.title}</h3>
                      <p className="text-body m-0 text-sm">
                        Discounted package for all included concerts.
                      </p>
                      {bundle.expand?.events && (
                        <div className="mt-1 text-xs text-text-muted">
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
                        className="text-center whitespace-nowrap no-underline"
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
                  <div key={event.id} className="flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-200 hover:shadow-md md:flex-row">
                    <div className="flex flex-1 flex-col gap-1">
                      {event.eventGraphic && (
                        <img
                          src={pb.files.getURL(event, event.eventGraphic)}
                          alt={event.title} className="mb-1 max-h-44 w-full rounded-sm object-cover"
                        />
                      )}
                      <h3 className="m-0">{event.title}</h3>
                      <span className="text-sm text-text-muted">
                        {formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <Button
                      as={Link}
                      to={`/tickets/${event.id}`}
                      variant="primary"
                      className="text-center whitespace-nowrap no-underline"
                    >
                      Buy Tickets
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 w-full rounded-lg border-t-2 border-dashed border-border bg-neutral-100 p-4 pt-6">
          <div className="flex flex-col gap-0.5 text-center">
            <h2 className="m-0 text-primary-deep">{donationSettings?.buttonText ?? DEFAULT_DONATION_SETTINGS.buttonText}</h2>
            <p className="text-body mx-auto max-w-[480px]">
              {donationSettings?.description ?? DEFAULT_DONATION_SETTINGS.description}
            </p>
          </div>
          <div className="mt-4 flex flex-row justify-center">
            <Button as={Link} to="/donate" variant="primary" className="min-w-[200px]">
              Make a Donation
            </Button>
          </div>
        </div>
      </AppCard>
    </PublicBrandingWrapper>
  );
}
