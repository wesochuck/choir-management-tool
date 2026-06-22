import { useQuery } from '@tanstack/react-query';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { settingsService } from '../services/settingsService';
import { eventService } from '../services/eventService';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { formatInTimezone } from '../lib/timezone';
import { PublicLayout } from '../components/common/PublicLayout';
import { queryKeys } from '../lib/queryKeys';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePublicEvents } from '../hooks/usePublicEvents';

function PublicLandingView() {
  useDocumentTitle('');
  const landingSettingsQuery = useQuery({
    queryKey: queryKeys.publicLanding.settings,
    queryFn: () => settingsService.getLandingSettings(),
  });

  const heroImageQuery = useQuery({
    queryKey: queryKeys.appSettings.heroImage,
    queryFn: () => settingsService.getHeroImageUrl(),
  });

  const timezoneQuery = useQuery({
    queryKey: queryKeys.publicLanding.timezone,
    queryFn: () => settingsService.getTimezone(),
  });

  const performancesQuery = useQuery({
    queryKey: queryKeys.events.recentPublicPerformances(3),
    queryFn: () => eventService.getRecentPerformances(3),
  });

  const { events: ticketedEvents, isLoading: ticketedLoading } = usePublicEvents();

  const isLoading =
    landingSettingsQuery.isLoading ||
    heroImageQuery.isLoading ||
    timezoneQuery.isLoading ||
    performancesQuery.isLoading ||
    ticketedLoading;
  const performanceList = performancesQuery.data ?? [];
  const highlightedTicketedEvent = ticketedEvents[0] ?? null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (
    landingSettingsQuery.isError ||
    heroImageQuery.isError ||
    timezoneQuery.isError ||
    !landingSettingsQuery.data
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-muted">{'Unable to load page content. Please try again later.'}</p>
      </div>
    );
  }

  const settings = landingSettingsQuery.data;
  const heroImageUrl = heroImageQuery.data ?? null;
  const timezone = timezoneQuery.data ?? 'America/New_York';

  return (
    <PublicLayout>
      <section
        className="relative flex items-center justify-center px-6 py-24 text-center"
        // @allow-inline-style - hero background image is dynamic
        style={{
          backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '400px',
        }}
      >
        <div className={`max-w-3xl ${heroImageUrl ? 'rounded-lg bg-black/50 p-8' : ''}`}>
          <h1 className={`mb-4 text-4xl font-bold ${heroImageUrl ? 'text-white' : 'text-text'}`}>
            {settings.heroHeadline}
          </h1>
          <p className={`text-xl ${heroImageUrl ? 'text-gray-200' : 'text-text-muted'}`}>
            {settings.heroSubtitle}
          </p>
        </div>
      </section>

      {highlightedTicketedEvent && (
        <section className="mx-auto max-w-4xl px-6 py-16">
          <div className="border-border bg-surface flex flex-col items-center gap-6 rounded-2xl border p-8 text-center shadow-lg">
            {(() => {
              const venueName =
                highlightedTicketedEvent.expand?.venue &&
                typeof highlightedTicketedEvent.expand.venue === 'object' &&
                'name' in highlightedTicketedEvent.expand.venue
                  ? (highlightedTicketedEvent.expand.venue as { name: string }).name
                  : '';
              const graphicUrl = highlightedTicketedEvent.eventGraphic
                ? pb.files.getURL(highlightedTicketedEvent, highlightedTicketedEvent.eventGraphic)
                : null;

              return (
                <>
                  {graphicUrl && (
                    <img
                      src={graphicUrl}
                      alt={highlightedTicketedEvent.title}
                      className="h-64 w-full rounded-xl object-cover"
                    />
                  )}
                  <h2 className="text-text m-0 text-3xl font-bold">
                    {highlightedTicketedEvent.title}
                  </h2>
                  <p className="text-text-muted m-0 text-lg">
                    {formatInTimezone(highlightedTicketedEvent.date, timezone, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  {venueName && <p className="text-text-muted m-0">{venueName}</p>}
                  <Button
                    as={Link}
                    to={`/tickets/${highlightedTicketedEvent.id}`}
                    variant="primary"
                    className="min-w-[200px] px-8 py-3 text-center text-lg no-underline"
                  >
                    Buy Tickets
                  </Button>
                </>
              );
            })()}
          </div>
        </section>
      )}

      {settings.aboutUsText && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <AppCard title="About Us">
            <div
              className="prose prose-sm text-text max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  marked.parse(settings.aboutUsText, { async: false }) as string
                ),
              }}
            />
          </AppCard>
        </section>
      )}

      {performanceList.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-text mb-6 text-2xl font-bold">Past Performances</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {performanceList.map((perf) => {
              const venueName =
                perf.expand?.venue &&
                typeof perf.expand.venue === 'object' &&
                'name' in perf.expand.venue
                  ? (perf.expand.venue as { name: string }).name
                  : '';
              const graphicUrl = perf.eventGraphic
                ? pb.files.getURL(perf, perf.eventGraphic)
                : null;

              return (
                <AppCard key={perf.id} title={perf.title}>
                  <p className="text-text-muted mb-2 text-sm">
                    {formatInTimezone(perf.date, timezone, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {graphicUrl && (
                    <img
                      src={graphicUrl}
                      alt={perf.title}
                      className="mb-3 h-48 w-full rounded object-cover"
                    />
                  )}
                  {venueName && <p className="text-text-muted mb-2 text-sm">{venueName}</p>}
                  {perf.publicDetails && (
                    <div
                      className="text-text text-sm"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          marked.parse(perf.publicDetails, { async: false }) as string
                        ),
                      }}
                    />
                  )}
                </AppCard>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/performances"
              className="text-primary hover:text-primary-deep inline-flex items-center gap-1 text-sm font-medium transition-colors"
            >
              See All Past Performances
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {settings.contactEmail && (
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-text mb-4 text-2xl font-bold">Contact Us</h2>
          <p className="text-text-muted">
            <a href={`mailto:${settings.contactEmail}`} className="text-primary hover:underline">
              {settings.contactEmail}
            </a>
          </p>
        </section>
      )}
    </PublicLayout>
  );
}

export default PublicLandingView;
