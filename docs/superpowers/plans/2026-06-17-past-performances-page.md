# Past Performances Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated paginated past performances page at `/performances` and refine the homepage section to show 3 bigger cards with a "See All" link.

**Architecture:** Add two new service methods (`getRecentPerformances`, `getPastPerformancesPaginated`), update PublicLandingView to use 3-item limit with larger cards + link, create PublicPastPerformancesView with inline pagination, wire up route and nav link.

**Tech Stack:** PocketBase JS SDK, TanStack Query, @tanstack/react-table (DataTable pagination pattern already exists), existing Pagination component.

---

### Task 1: Event Service — Add paginated and limited query methods

**Files:**
- Modify: `src/services/eventService.ts:105-114`

Replace `getPastPerformances()` with two methods:

- [ ] **Step 1: Add `getRecentPerformances(limit)` method**

```ts
async getRecentPerformances(limit: number): Promise<Event[]> {
  const result = await pb.collection('events').getList<Event>(1, limit, {
    filter: 'type = "Performance" && date < @now && isArchived != true',
    sort: '-date',
    fields:
      'id,collectionId,collectionName,title,date,venue,publicDetails,eventGraphic,expand.venue',
    expand: 'venue',
  });
  return result.items;
},
```

- [ ] **Step 2: Add `getPastPerformancesPaginated(page, perPage)`**

```ts
async getPastPerformancesPaginated(
  page: number,
  perPage: number
): Promise<{ items: Event[]; totalPages: number; totalItems: number }> {
  const result = await pb.collection('events').getList<Event>(page, perPage, {
    filter: 'type = "Performance" && date < @now && isArchived != true',
    sort: '-date',
    fields:
      'id,collectionId,collectionName,title,date,venue,publicDetails,eventGraphic,expand.venue',
    expand: 'venue',
  });
  return {
    items: result.items,
    totalPages: result.totalPages,
    totalItems: result.totalItems,
  };
},
```

- [ ] **Step 3: Remove `getPastPerformances()`**

Delete lines 105-114 (the old method).

- [ ] **Step 4: Run existing tests to verify service changes don't break anything**

Run: `rtk npx vitest run test/views/PublicLandingView.test.tsx`
Expected: The existing test mocks `getPastPerformances` so it will need updating — this is expected and handled in Task 5.

- [ ] **Step 5: Commit**

```bash
git add src/services/eventService.ts
git commit -m "feat: add getRecentPerformances and getPastPerformancesPaginated to eventService"
```

---

### Task 2: Query Keys — Add paginated past performances key

**Files:**
- Modify: `src/lib/queryKeys.ts:28`

- [ ] **Step 1: Add `pastPerformancesList` key after `publicList`**

```ts
publicList: ['events', 'publicList'] as const,
pastPerformancesList: (page: number) =>
  [...queryKeys.events.all, 'pastPerformances', page] as const,
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queryKeys.ts
git commit -m "feat: add pastPerformancesList query key"
```

---

### Task 3: Homepage — Update to 3 recent performances, larger cards, "See All" link

**Files:**
- Modify: `src/views/PublicLandingView.tsx`

- [ ] **Step 1: Update import — replace `getPastPerformances` with `getRecentPerformances`**

Import stays the same (from `eventService`) — just update the call site.

- [ ] **Step 2: Update query to use `getRecentPerformances(3)`**

```tsx
const performancesQuery = useQuery({
  queryKey: queryKeys.events.publicList,
  queryFn: () => eventService.getRecentPerformances(3),
});
```

- [ ] **Step 3: Increase image height from `h-40` to `h-48`**

```tsx
className="mb-3 h-48 w-full rounded object-cover"
```

- [ ] **Step 4: Add "See All Past Performances" link below the performances grid**

Insert after the closing `</div>` of the grid and before the `</section>`:

```tsx
<div className="mt-8 text-center">
  <Link
    to="/performances"
    className="text-primary hover:text-primary-deep inline-flex items-center gap-1 text-sm font-medium transition-colors"
  >
    See All Past Performances
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  </Link>
</div>
```

Add `import { Link } from 'react-router-dom';` to the imports if not already present (check existing imports).

- [ ] **Step 5: Commit**

```bash
git add src/views/PublicLandingView.tsx
git commit -m "feat: show 3 recent performances on homepage with larger cards and See All link"
```

---

### Task 4: Create PublicPastPerformancesView

**Files:**
- Create: `src/views/PublicPastPerformancesView.tsx`

- [ ] **Step 1: Write the view**

```tsx
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
          <p className="text-text-muted">{'Unable to load past performances. Please try again later.'}</p>
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
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </section>
    </PublicLayout>
  );
}

export default PublicPastPerformancesView;
```

- [ ] **Step 2: Commit**

```bash
git add src/views/PublicPastPerformancesView.tsx
git commit -m "feat: create PublicPastPerformancesView with pagination"
```

---

### Task 5: Routing — Add `/performances` route

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add lazy import after `PublicHistoryView`**

```tsx
const PublicPastPerformancesView = lazyWithReload(
  () => import('./views/PublicPastPerformancesView')
);
```

- [ ] **Step 2: Add route before the root `/` route**

```tsx
<Route path="/performances" element={<PublicPastPerformancesView />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /performances route"
```

---

### Task 6: Navigation — Add "Performances" link

**Files:**
- Modify: `src/components/common/PublicLayout.tsx`

- [ ] **Step 1: Add desktop nav link between "Auditions" and "History"**

Insert after line 73 (`Auditions` link):

```tsx
<Link to="/performances" className={getLinkClass('/performances')}>
  Performances
</Link>
```

- [ ] **Step 2: Add mobile nav link**

Insert after the Auditions mobile link block (after line 115):

```tsx
<Link
  to="/performances"
  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/performances' ? 'bg-primary-light text-primary-deep' : 'text-text-muted hover:bg-primary-light/50 hover:text-text'}`}
  onClick={() => setMobileNavOpen(false)}
>
  Performances
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/common/PublicLayout.tsx
git commit -m "feat: add Performances nav link"
```

---

### Task 7: Update PublicLandingView test

**Files:**
- Modify: `test/views/PublicLandingView.test.tsx`

- [ ] **Step 1: Replace `getPastPerformances` mock with `getRecentPerformances`**

```tsx
mock.method(eventService, 'getRecentPerformances', async () => []);
```

Also remove the `getPastPerformances` mock if still present:

```tsx
mock.method(eventService, 'getPastPerformances', async () => []);
```

Replace with the `getRecentPerformances` version.

- [ ] **Step 2: Add assertion for "See All Past Performances" link**

After the navigation links test, add:

```tsx
it('renders See All Past Performances link', async () => {
  const { container } = render(
    <MemoryRouter>
      <PublicLandingView />
    </MemoryRouter>,
    { wrapper: createWrapper() }
  );

  await waitFor(() => {
    const links = container.querySelectorAll('a');
    const hrefs = Array.from(links).map(a => a.getAttribute('href'));
    assert.ok(hrefs.some(h => h === '/performances'));
  }, { timeout: 5000 });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `rtk npx vitest run test/views/PublicLandingView.test.tsx`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add test/views/PublicLandingView.test.tsx
git commit -m "test: update PublicLandingView test for getRecentPerformances and See All link"
```

---

### Task 8: Add PublicPastPerformancesView test

**Files:**
- Create: `test/views/PublicPastPerformancesView.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// @vitest-environment jsdom
import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { eventService } from '../../src/services/eventService';
import { settingsService } from '../../src/services/settingsService';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('PublicPastPerformancesView', () => {
  let PublicPastPerformancesView: React.ComponentType;

  before(async () => {
    mock.method(settingsService, 'getTimezone', async () => 'America/New_York');
    mock.method(eventService, 'getPastPerformancesPaginated', async () => ({
      items: [
        {
          id: '1',
          collectionId: 'test',
          collectionName: 'events',
          created: '',
          updated: '',
          title: 'Spring Concert',
          date: '2025-05-15',
          publicDetails: 'A wonderful evening of music.',
          eventGraphic: null as string | undefined,
          expand: {
            venue: { name: 'Concert Hall', id: 'v1', collectionId: '', collectionName: 'venues', created: '', updated: '' },
          },
        },
        {
          id: '2',
          collectionId: 'test',
          collectionName: 'events',
          created: '',
          updated: '',
          title: 'Holiday Show',
          date: '2024-12-20',
          publicDetails: '',
          eventGraphic: 'image.jpg',
          expand: { venue: undefined },
        },
      ],
      totalPages: 1,
      totalItems: 2,
    }));

    const mod = await import('../../src/views/PublicPastPerformancesView');
    PublicPastPerformancesView = mod.default;
  });

  after(() => {
    mock.restoreAll();
  });

  it('renders without crashing and shows performances', async () => {
    const { container } = render(
      <MemoryRouter>
        <PublicPastPerformancesView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.ok(container.querySelector('h1'));
      assert.strictEqual(container.textContent?.includes('Spring Concert'), true);
      assert.strictEqual(container.textContent?.includes('Holiday Show'), true);
    }, { timeout: 5000 });
  });

  it('renders empty state when no performances', async () => {
    mock.restoreAll();
    mock.method(settingsService, 'getTimezone', async () => 'America/New_York');
    mock.method(eventService, 'getPastPerformancesPaginated', async () => ({
      items: [],
      totalPages: 0,
      totalItems: 0,
    }));

    const mod = await import('../../src/views/PublicPastPerformancesView');
    const EmptyView = mod.default;

    const { container } = render(
      <MemoryRouter>
        <EmptyView />
      </MemoryRouter>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      assert.strictEqual(
        container.textContent?.includes('No past performances to show yet.'),
        true
      );
    }, { timeout: 5000 });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `rtk npx vitest run test/views/PublicPastPerformancesView.test.tsx`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add test/views/PublicPastPerformancesView.test.tsx
git commit -m "test: add PublicPastPerformancesView test"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite to check nothing is broken**

Run: `rtk npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run lint check**

Run: `rtk npm run lint`
Expected: No errors

- [ ] **Step 3: Run type check**

Run: `rtk npm run typecheck`
Expected: No errors
