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
