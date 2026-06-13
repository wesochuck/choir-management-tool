import { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { pb } from '../lib/pocketbase';
import { settingsService, type LandingPageSettings } from '../services/settingsService';
import { eventService, type Event } from '../services/eventService';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { AppCard } from '../components/common/AppCard';
import { formatInTimezone } from '../lib/timezone';
import { PublicLayout } from '../components/common/PublicLayout';

function PublicLandingView() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<LandingPageSettings | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [performances, setPerformances] = useState<Event[]>([]);
  const [timezone, setTimezone] = useState<string>('America/New_York');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, imgUrl, perfs, tz] = await Promise.all([
          settingsService.getLandingSettings(),
          settingsService.getHeroImageUrl(),
          eventService.getPastPerformances(),
          settingsService.getTimezone(),
        ]);
        setSettings(s);
        setHeroImageUrl(imgUrl);
        setPerformances(perfs);
        setTimezone(tz);
      } catch (err: unknown) {
        console.error('Failed to load landing page data', err);
        setError('Unable to load page content. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted">{error || 'Unable to load page.'}</p>
      </div>
    );
  }

  return (
    <PublicLayout>
      {/* @allow-inline-style - hero background image is dynamic */}
      <section className="relative flex items-center justify-center text-center py-24 px-6" style={{
        backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '400px',
      }}
      >
        <div className={`max-w-3xl ${heroImageUrl ? 'bg-black/50 rounded-lg p-8' : ''}`}>
          <h1 className={`text-4xl font-bold mb-4 ${heroImageUrl ? 'text-white' : 'text-text'}`}>
            {settings.heroHeadline}
          </h1>
          <p className={`text-xl ${heroImageUrl ? 'text-gray-200' : 'text-text-muted'}`}>
            {settings.heroSubtitle}
          </p>
        </div>
      </section>

      {settings.aboutUsText && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <AppCard title="About Us">
            <div
              className="prose prose-sm max-w-none text-text"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked.parse(settings.aboutUsText, { async: false }) as string),
              }}
            />
          </AppCard>
        </section>
      )}

      {performances.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-text mb-6">Past Performances</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {performances.map((perf) => {
              const venueName = perf.expand?.venue && typeof perf.expand.venue === 'object' && 'name' in perf.expand.venue
                ? (perf.expand.venue as { name: string }).name
                : '';
              const graphicUrl = perf.eventGraphic ? pb.files.getURL(perf, perf.eventGraphic) : null;

              return (
                <AppCard key={perf.id} title={perf.title}>
                  <p className="text-sm text-text-muted mb-2">{formatInTimezone(perf.date, timezone, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  {graphicUrl && (
                    <img src={graphicUrl} alt={perf.title} className="w-full h-40 object-cover rounded mb-3" />
                  )}
                  {venueName && <p className="text-sm text-text-muted mb-2">{venueName}</p>}
                  {perf.publicDetails && (
                    <div
                      className="text-sm text-text"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(marked.parse(perf.publicDetails, { async: false }) as string),
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
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-text mb-4">Contact Us</h2>
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
