import { useQuery } from '@tanstack/react-query';
import { settingsService } from '../services/settingsService';
import { renderMarkdown } from '../lib/communicationUtils';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { AppCard } from '../components/common/AppCard';
import { PublicLayout } from '../components/common/PublicLayout';
import { queryKeys } from '../lib/queryKeys';

function PublicHistoryView() {
  const settingsQuery = useQuery({
    queryKey: queryKeys.publicLanding.settings,
    queryFn: () => settingsService.getLandingSettings(),
  });

  if (settingsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-muted">{'Unable to load page content. Please try again later.'}</p>
      </div>
    );
  }

  const settings = settingsQuery.data;

  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-6 py-16">
        <AppCard title="Our History">
          {settings.historyText ? (
            <div
              className="prose prose-sm text-text max-w-none"
              // @allow-dangerouslySetInnerHTML - safely escapes raw HTML using renderMarkdown
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(settings.historyText),
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
