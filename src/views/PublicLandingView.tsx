import { useQuery } from '@tanstack/react-query';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { pb } from '../lib/pocketbase';
import { settingsService } from '../services/settingsService';
import { eventService } from '../services/eventService';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { AppCard } from '../components/common/AppCard';
import { formatInTimezone } from '../lib/timezone';
import { PublicLayout } from '../components/common/PublicLayout';
import { queryKeys } from '../lib/queryKeys';

function PublicLandingView() {
  const landingQuery = useQuery({
    queryKey: queryKeys.publicLanding.settings,
    queryFn: async () => {
      const [s, imgUrl, tz] = await Promise.all([
        settingsService.getLandingSettings(),
        settingsService.getHeroImageUrl(),
        settingsService.getTimezone(),
      ]);
      return { settings: s, heroImageUrl: imgUrl, timezone: tz };
    },
  });

  const performancesQuery = useQuery({
    queryKey: queryKeys.events.publicList,
    queryFn: () => eventService.getPastPerformances(),
  });

  const isLoading = landingQuery.isLoading || performancesQuery.isLoading;
  const landingData = landingQuery.data;
  const performanceList = performancesQuery.data ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (landingQuery.isError || !landingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-muted">{'Unable to load page content. Please try again later.'}</p>
      </div>
    );
  }

  const { settings, heroImageUrl, timezone } = landingData;

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
                      className="mb-3 h-40 w-full rounded object-cover"
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
