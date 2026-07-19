# TanStack Query Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TanStack Query to this React/PocketBase app and migrate one low-risk data hook as the repeatable pattern for later screens.

**Architecture:** Keep `react-router-dom` in place. Introduce TanStack Query only for server-state caching, mutation invalidation, and fetch status handling. Use `src/hooks/useVenues.ts` as the pilot because it is small, service-backed, and already has a narrow public API.

**Tech Stack:** React 19, Vite, TypeScript, PocketBase SDK, `@tanstack/react-query`, existing `node:test`/Vitest compatibility layer, Testing Library.

---

## Scope

This plan intentionally does **not** migrate to TanStack Router. Routing is currently simple and functional in `src/App.tsx`. The highest-value change is replacing repeated `useEffect` + `useState` fetch orchestration with TanStack Query.

This plan produces one complete implementation slice:

- Install and configure `@tanstack/react-query`.
- Add shared query-key helpers.
- Wrap the app with a QueryClient provider.
- Migrate `useVenues` to Query + Mutations.
- Add tests for query-key stability and the migrated hook.
- Document the follow-up migration order.

After this lands, future migrations should repeat the same shape for `useVoiceParts`, `useDues`, `useProfiles`, `useEventRosterData`, admin views, and dashboard data.

## File Structure

- Create `src/lib/queryClient.ts`
  - Owns the shared `QueryClient` configuration.
  - Keeps retry behavior conservative to avoid hammering PocketBase.
- Create `src/lib/queryKeys.ts`
  - Centralizes stable query keys.
  - Prevents ad hoc string keys across views.
- Modify `src/main.tsx`
  - Wraps existing providers in `QueryClientProvider`.
- Modify `src/hooks/useVenues.ts`
  - Replaces manual loading/error/fetch state with `useQuery` and `useMutation`.
  - Keeps the existing hook return shape to avoid touching `VenuesView` in the first slice.
- Create `test/queryKeys.test.ts`
  - Verifies query-key shape.
- Create `test/useVenuesQuery.test.tsx`
  - Verifies the migrated hook loads, mutates, invalidates, and surfaces errors.
- Modify `package.json` and lockfile
  - Adds `@tanstack/react-query`.

---

## Task 1: Install TanStack Query

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` or equivalent lockfile if present after install

- [ ] **Step 1: Install dependency**

Run:

```bash
rtk npm install @tanstack/react-query
```

Expected: command exits 0 and `package.json` contains `@tanstack/react-query`.

- [ ] **Step 2: Check dependency diff**

Run:

```bash
rtk git diff -- package.json package-lock.json
```

Expected: only TanStack Query dependency and lockfile updates are present.

- [ ] **Step 3: Commit**

```bash
rtk git add package.json package-lock.json
rtk git commit -m "chore: add tanstack query"
```

---

## Task 2: Add Query Client Infrastructure

**Files:**
- Create: `src/lib/queryClient.ts`
- Create: `src/lib/queryKeys.ts`
- Test: `test/queryKeys.test.ts`

- [ ] **Step 1: Write query-key test**

Create `test/queryKeys.test.ts`:

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { queryKeys } from '../src/lib/queryKeys';

describe('queryKeys', () => {
  it('uses stable tuple keys for venues', () => {
    assert.deepEqual(queryKeys.venues.all, ['venues']);
    assert.deepEqual(queryKeys.venues.list(), ['venues', 'list']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk npx vitest run test/queryKeys.test.ts
```

Expected: FAIL because `src/lib/queryKeys.ts` does not exist.

- [ ] **Step 3: Add query keys**

Create `src/lib/queryKeys.ts`:

```ts
export const queryKeys = {
  venues: {
    all: ['venues'] as const,
    list: () => [...queryKeys.venues.all, 'list'] as const,
  },
} as const;
```

- [ ] **Step 4: Add query client**

Create `src/lib/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: unknown) => {
        const status = typeof error === 'object' && error !== null && 'status' in error
          ? Number((error as { status?: unknown }).status)
          : 0;

        if (status === 401 || status === 403 || status === 404) {
          return false;
        }

        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
rtk npx vitest run test/queryKeys.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/lib/queryClient.ts src/lib/queryKeys.ts test/queryKeys.test.ts
rtk git commit -m "feat: add query client infrastructure"
```

---

## Task 3: Wrap the App with QueryClientProvider

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Modify provider tree**

Update `src/main.tsx` to import the provider and client:

```ts
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient.ts'
```

Then wrap the existing app tree like this:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChoirNameProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </ChoirNameProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 2: Run build**

Run:

```bash
rtk npm run build
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/main.tsx
rtk git commit -m "feat: provide tanstack query client"
```

---

## Task 4: Migrate useVenues to TanStack Query

**Files:**
- Modify: `src/hooks/useVenues.ts`
- Test: `test/useVenuesQuery.test.tsx`

- [ ] **Step 1: Write hook tests**

Create `test/useVenuesQuery.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useVenues } from '../src/hooks/useVenues';
import { venueService, type Venue } from '../src/services/venueService';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const sampleVenue = {
  id: 'venue_1',
  collectionId: 'pbc_venues_001',
  collectionName: 'pbc_venues_001',
  created: '2026-01-01 00:00:00.000Z',
  updated: '2026-01-01 00:00:00.000Z',
  name: 'Main Hall',
  rowCounts: [10, 10],
  status: 'Active',
} satisfies Venue;

describe('useVenues with TanStack Query', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('loads venues through venueService', async () => {
    const getVenues = mock.method(venueService, 'getVenues', async () => [sampleVenue]);

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });

    assert.equal(result.current.isLoading, true);

    await waitFor(() => {
      assert.equal(result.current.isLoading, false);
      assert.deepEqual(result.current.venues, [sampleVenue]);
    });

    assert.equal(getVenues.mock.callCount(), 1);
    assert.equal(result.current.error, null);
  });

  it('invalidates and refreshes after adding a venue', async () => {
    const createdVenue = { ...sampleVenue, id: 'venue_2', name: 'Side Chapel' };
    const getVenues = mock.method(venueService, 'getVenues', async () => [sampleVenue]);
    const createVenue = mock.method(venueService, 'createVenue', async () => createdVenue);

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });

    await waitFor(() => {
      assert.equal(result.current.isLoading, false);
    });

    await act(async () => {
      const record = await result.current.addVenue({ name: 'Side Chapel' });
      assert.equal(record.id, 'venue_2');
    });

    await waitFor(() => {
      assert.equal(getVenues.mock.callCount() >= 2, true);
    });

    assert.equal(createVenue.mock.callCount(), 1);
    assert.deepEqual(createVenue.mock.calls[0].arguments, [{ name: 'Side Chapel' }]);
  });

  it('surfaces load errors as strings', async () => {
    mock.method(venueService, 'getVenues', async () => {
      throw new Error('PocketBase unavailable');
    });

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });

    await waitFor(() => {
      assert.equal(result.current.isLoading, false);
      assert.equal(result.current.error, 'PocketBase unavailable');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk npx vitest run test/useVenuesQuery.test.tsx
```

Expected: FAIL until `useVenues` uses QueryClient context and invalidation.

- [ ] **Step 3: Replace hook implementation**

Replace `src/hooks/useVenues.ts` with:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { venueService, type Venue } from '../services/venueService';

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const useVenues = () => {
  const queryClient = useQueryClient();
  const venuesQuery = useQuery({
    queryKey: queryKeys.venues.list(),
    queryFn: () => venueService.getVenues(),
  });

  const invalidateVenues = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.venues.all });
  };

  const addVenueMutation = useMutation({
    mutationFn: (data: Partial<Venue>) => venueService.createVenue(data),
    onSuccess: invalidateVenues,
  });

  const editVenueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Venue> }) => venueService.updateVenue(id, data),
    onSuccess: invalidateVenues,
  });

  const removeVenueMutation = useMutation({
    mutationFn: (id: string) => venueService.deleteVenue(id),
    onSuccess: invalidateVenues,
  });

  const addVenue = async (data: Partial<Venue>) => {
    try {
      return await addVenueMutation.mutateAsync(data);
    } catch (err: unknown) {
      throw new Error(toErrorMessage(err, 'Failed to add venue'));
    }
  };

  const editVenue = async (id: string, data: Partial<Venue>) => {
    try {
      await editVenueMutation.mutateAsync({ id, data });
    } catch (err: unknown) {
      throw new Error(toErrorMessage(err, 'Failed to update venue'));
    }
  };

  const removeVenue = async (id: string) => {
    try {
      await removeVenueMutation.mutateAsync(id);
    } catch (err: unknown) {
      throw new Error(toErrorMessage(err, 'Failed to delete venue'));
    }
  };

  return {
    venues: venuesQuery.data ?? [],
    isLoading: venuesQuery.isLoading,
    error: venuesQuery.error ? toErrorMessage(venuesQuery.error, 'Failed to fetch venues') : null,
    addVenue,
    editVenue,
    removeVenue,
    refresh: venuesQuery.refetch,
  };
};
```

- [ ] **Step 4: Run hook test**

Run:

```bash
rtk npx vitest run test/useVenuesQuery.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run venue-related tests**

Run:

```bash
rtk npx vitest run test/venueService.test.ts test/useVenuesQuery.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/hooks/useVenues.ts test/useVenuesQuery.test.tsx
rtk git commit -m "feat: migrate venues hook to tanstack query"
```

---

## Task 5: Verify the Pilot in the App

**Files:**
- Read only: `src/views/admin/VenuesView.tsx`

- [ ] **Step 1: Confirm hook API compatibility**

Run:

```bash
rtk rg "useVenues\\(" src/views src/components src/hooks
```

Expected: consumers still read `venues`, `isLoading`, `error`, `addVenue`, `editVenue`, `removeVenue`, or `refresh`; no consumer requires removed state setters.

- [ ] **Step 2: Run build**

Run:

```bash
rtk npm run build
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```bash
rtk npm test
```

Expected: PASS.

- [ ] **Step 4: Run dependency audit because a package changed**

Run:

```bash
rtk npm audit --audit-level=high
```

Expected: exits 0 or reports only known non-high findings. If high vulnerabilities appear, do not ignore them; stop and report the package path.

- [ ] **Step 5: Commit**

```bash
rtk git add src/main.tsx src/lib/queryClient.ts src/lib/queryKeys.ts src/hooks/useVenues.ts test/queryKeys.test.ts test/useVenuesQuery.test.tsx package.json package-lock.json
rtk git commit -m "feat: establish tanstack query venue pattern"
```

If previous task-level commits were already made, skip this final commit and keep the working tree clean.

---

## Task 6: Document Follow-Up Migration Order

**Files:**
- Create: `docs/tanstack-query-migration.md`

- [ ] **Step 1: Add migration guide**

Create `docs/tanstack-query-migration.md`:

```md
# TanStack Query Migration Guide

This app uses TanStack Query for server state and keeps React Router for routing.

## Rules

- Put shared keys in `src/lib/queryKeys.ts`.
- Use service functions as query and mutation functions.
- Preserve existing hook APIs during incremental migrations unless the calling view is updated in the same commit.
- Invalidate collection-level keys after create, update, and delete mutations.
- Keep form state in React component state; only server state belongs in Query.
- Do not use `Promise.all(items.map(...))` for unbounded PocketBase/network calls.
- Use `pb.filter(...)` for dynamic PocketBase filters.
- Do not introduce explicit `any` or `as any`.

## Migration Order

1. `src/hooks/useVenues.ts`
2. `src/hooks/useVoiceParts.ts`
3. `src/hooks/useDues.ts`
4. `src/hooks/useProfiles.ts`
5. `src/hooks/useSingerRsvpHistory.ts`
6. `src/views/admin/ResourcesView.tsx`
7. `src/views/admin/TicketingView.tsx`
8. `src/hooks/useEventRosterData.ts`
9. `src/hooks/useSeatingChart.ts`
10. Dashboard views after their shared hooks are migrated

## Query Key Pattern

```ts
export const queryKeys = {
  venues: {
    all: ['venues'] as const,
    list: () => [...queryKeys.venues.all, 'list'] as const,
  },
} as const;
```

## Hook Pattern

```ts
const query = useQuery({
  queryKey: queryKeys.venues.list(),
  queryFn: () => venueService.getVenues(),
});

const mutation = useMutation({
  mutationFn: (data: Partial<Venue>) => venueService.createVenue(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.venues.all }),
});
```
```

- [ ] **Step 2: Commit**

```bash
rtk git add docs/tanstack-query-migration.md
rtk git commit -m "docs: add tanstack query migration guide"
```

---

## Self-Review Checklist

- [ ] Plan keeps React Router and does not ask for a risky whole-app router rewrite.
- [ ] Plan adds TanStack Query in one testable slice.
- [ ] Every shell command is prefixed with `rtk`.
- [ ] New TypeScript snippets avoid explicit `any`, `as any`, `@ts-ignore`, and eslint disables.
- [ ] No generated PocketBase files are edited.
- [ ] No schema changes or migrations are required.
- [ ] Package change includes `rtk npm audit --audit-level=high`.
- [ ] Full verification includes `rtk npm run build` and `rtk npm test`.

