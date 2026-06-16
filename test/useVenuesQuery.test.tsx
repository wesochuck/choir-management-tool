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

  it('invalidates and refreshes after editing a venue', async () => {
    const updated = { ...sampleVenue, name: 'Updated Hall' };
    const getVenues = mock.method(venueService, 'getVenues', async () => [sampleVenue]);
    const updateVenue = mock.method(venueService, 'updateVenue', async () => updated);

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });

    await waitFor(() => assert.equal(result.current.isLoading, false));

    await act(async () => {
      await result.current.editVenue('venue_1', { name: 'Updated Hall' });
    });

    assert.equal(updateVenue.mock.callCount(), 1);
    assert.deepStrictEqual(updateVenue.mock.calls[0].arguments, [
      'venue_1',
      { name: 'Updated Hall' },
    ]);

    await waitFor(() => assert.equal(getVenues.mock.callCount() >= 2, true));
  });

  it('invalidates and refreshes after removing a venue', async () => {
    const getVenues = mock.method(venueService, 'getVenues', async () => [sampleVenue]);
    const deleteVenue = mock.method(venueService, 'deleteVenue', async () => undefined);

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });

    await waitFor(() => assert.equal(result.current.isLoading, false));

    await act(async () => {
      await result.current.removeVenue('venue_1');
    });

    assert.equal(deleteVenue.mock.callCount(), 1);
    assert.deepStrictEqual(deleteVenue.mock.calls[0].arguments, ['venue_1']);

    await waitFor(() => assert.equal(getVenues.mock.callCount() >= 2, true));
  });

  it('surfaces edit errors', async () => {
    mock.method(venueService, 'getVenues', async () => [sampleVenue]);
    mock.method(venueService, 'updateVenue', async () => {
      throw new Error('Venue not found');
    });

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });

    await waitFor(() => assert.equal(result.current.isLoading, false));

    let thrown: Error | null = null;
    try {
      await result.current.editVenue('venue_1', { name: 'Bad' });
    } catch (err: unknown) {
      thrown = err instanceof Error ? err : new Error(String(err));
    }
    assert.ok(thrown, 'expected editVenue to throw');
    assert.ok(thrown.message.includes('Venue not found'));
  });

  it('surfaces remove errors', async () => {
    mock.method(venueService, 'getVenues', async () => [sampleVenue]);
    mock.method(venueService, 'deleteVenue', async () => {
      throw new Error('Cannot delete active venue');
    });

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });

    await waitFor(() => assert.equal(result.current.isLoading, false));

    let thrown: Error | null = null;
    try {
      await result.current.removeVenue('venue_1');
    } catch (err: unknown) {
      thrown = err instanceof Error ? err : new Error(String(err));
    }
    assert.ok(thrown, 'expected removeVenue to throw');
    assert.ok(thrown.message.includes('Cannot delete active venue'));
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
