import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import {
  donationService,
  type DonationSettings,
  DEFAULT_DONATION_SETTINGS,
} from '../services/donationService';
import { eventService } from '../services/eventService';
import { ticketService } from '../services/ticketService';
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
    queryFn: () => ticketService.getPublicBundles(),
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
            {choirName && (
              <span className="text-text-muted text-xs font-bold tracking-wider uppercase">
                {choirName}
              </span>
            )}
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
            <p className="text-text-muted text-sm">
              Please check back later or contact the administrator.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {bundles.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="border-border text-primary-deep m-0 border-b-2 pb-1">
                  Season Passes
                </h2>
                {bundles.map((bundle) => (
                  <Link
                    key={bundle.id}
                    to={`/tickets/bundle/${bundle.id}`}
                    className="border-primary bg-primary-light hover:border-primary-deep flex flex-col items-center justify-between gap-4 rounded-xl border-2 p-4 text-inherit no-underline shadow-sm transition-all duration-200 hover:shadow-md md:flex-row"
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="bg-success-bg text-success-text inline-flex items-center self-start rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase">
                        Best Value
                      </span>
                      <h3 className="text-primary-deep m-0">{bundle.title}</h3>
                      <p className="text-body m-0 text-sm">
                        Discounted package for all included concerts.
                      </p>
                      {bundle.expand?.events && (
                        <div className="text-text-muted mt-1 text-xs">
                          <strong>Includes:</strong>{' '}
                          {bundle.expand.events.map((e) => e.title).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-primary-deep text-xl font-bold">
                        ${(bundle.priceCents / 100).toFixed(2)}
                      </span>
                      <Button as="div" variant="primary" className="text-center whitespace-nowrap">
                        Buy Season Pass
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {events.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="border-border m-0 border-b-2 pb-1">Concert Tickets</h2>
                {events.map((event) => (
                  <Link
                    key={event.id}
                    to={`/tickets/${event.id}`}
                    className="border-border bg-surface hover:border-primary-deep flex flex-col items-center justify-between gap-4 rounded-xl border p-4 text-inherit no-underline shadow-sm transition-all duration-200 hover:shadow-md md:flex-row"
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      {event.eventGraphic && (
                        <img
                          src={pb.files.getURL(event, event.eventGraphic)}
                          alt={event.title}
                          className="mb-1 max-h-44 w-full rounded-sm object-cover"
                        />
                      )}
                      <h3 className="m-0">{event.title}</h3>
                      <span className="text-text-muted text-sm">
                        {formatInTimezone(event.date, timezone, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <Button as="div" variant="primary" className="text-center whitespace-nowrap">
                      Buy Tickets
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-border mt-8 w-full rounded-lg border-t-2 border-dashed bg-neutral-100 p-4 pt-6">
          <div className="flex flex-col gap-0.5 text-center">
            <h2 className="text-primary-deep m-0">
              {donationSettings?.buttonText ?? DEFAULT_DONATION_SETTINGS.buttonText}
            </h2>
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
