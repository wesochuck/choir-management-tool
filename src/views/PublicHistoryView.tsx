import { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { settingsService, type LandingPageSettings } from '../services/settingsService';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { AppCard } from '../components/common/AppCard';
import { PublicLayout } from '../components/common/PublicLayout';

function PublicHistoryView() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<LandingPageSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await settingsService.getLandingSettings();
        setSettings(s);
      } catch (err: unknown) {
        console.error('Failed to load history page data', err);
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
      <section className="max-w-3xl mx-auto px-6 py-16">
        <AppCard title="Our History">
          {settings.historyText ? (
            <div
              className="prose prose-sm max-w-none text-text"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked.parse(settings.historyText, { async: false }) as string),
              }}
            />
          ) : (
            <p className="text-text-muted">No history has been published yet.</p>
          )}
        </AppCard>
      </section>
    </PublicLayout>
  );
}

export default PublicHistoryView;
