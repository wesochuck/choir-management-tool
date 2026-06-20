import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { pb } from '../lib/pocketbase';
import { eventService } from '../services/eventService';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { AppCard } from '../components/common/AppCard';
import { Pagination } from '../components/common/Pagination';
import { formatInTimezone } from '../lib/timezone';
import { settingsService } from '../services/settingsService';
import { PublicLayout } from '../components/common/PublicLayout';
import { queryKeys } from '../lib/queryKeys';

const PER_PAGE = 12;

function PublicPastPerformancesView() {
  const [page, setPage] = useState(1);

  const timezoneQuery = useQuery({
    queryKey: queryKeys.publicRsvp.timezone(),
    queryFn: () => settingsService.getTimezone(),
  });

  const performancesQuery = useQuery({
    queryKey: queryKeys.events.pastPerformancesList(page),
    queryFn: () => eventService.getPastPerformancesPaginated(page, PER_PAGE),
  });

  if (performancesQuery.isLoading || timezoneQuery.isLoading) {
    return (
      <PublicLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner />
        </div>
      </PublicLayout>
    );
  }

  if (performancesQuery.isError) {
    return (
      <PublicLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-text-muted">
            {'Unable to load past performances. Please try again later.'}
          </p>
        </div>
      </PublicLayout>
    );
  }

  const timezone = timezoneQuery.data ?? 'UTC';
  const { items: performanceList, totalPages } = performancesQuery.data ?? {
    items: [],
    totalPages: 0,
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-text mb-8 text-3xl font-bold">Past Performances</h1>

        {performanceList.length === 0 ? (
          <p className="text-text-muted">No past performances to show yet.</p>
        ) : (
          <>
            <div className="grid gap-8 md:grid-cols-2">
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
                    {graphicUrl && (
                      <img
                        src={graphicUrl}
                        alt={perf.title}
                        className="mb-4 h-64 w-full rounded object-cover"
                      />
                    )}
                    <p className="text-text-muted mb-2 text-sm">
                      {formatInTimezone(perf.date, timezone, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
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

            <div className="mt-10 flex justify-center">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </section>
    </PublicLayout>
  );
}

export default PublicPastPerformancesView;
