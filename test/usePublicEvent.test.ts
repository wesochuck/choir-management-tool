// @vitest-environment jsdom
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { usePublicEvent } from '../src/hooks/usePublicEvent';
import { eventService } from '../src/services/eventService';

const mockEvent = {
  id: 'evt1',
  title: 'Spring Concert',
  date: '2026-06-15T19:00:00.000Z',
  type: 'Performance',
  venue: 'venue1',
  publicDetails: 'A wonderful spring concert',
  advancePriceCents: 1500,
  dayOfPriceCents: 2000,
  ticketCapacity: 200,
  doorsOpenTime: '18:30',
  eventGraphic: 'img.jpg',
  isTicketingEnabled: true,
  collectionId: 'col1',
  collectionName: 'events',
  expand: {
    venue: {
      id: 'venue1',
      name: 'Concert Hall',
    },
  },
};

function createHarness() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { wrapper, client };
}

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

test('usePublicEvent returns an event on success when eventId is provided', async () => {
  const { wrapper } = createHarness();
  mock.method(eventService, 'getPublicEventById', async () => mockEvent);

  const { result } = renderHook(() => usePublicEvent('evt1'), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.deepStrictEqual(result.current.data, mockEvent);
  assert.equal(result.current.error, null);
});

test('usePublicEvent returns an error on failure', async () => {
  const { wrapper } = createHarness();
  const error = new Error('Network error');
  mock.method(eventService, 'getPublicEventById', async () => {
    throw error;
  });

  const { result } = renderHook(() => usePublicEvent('evt1'), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.equal(result.current.data, undefined);
  assert.equal(result.current.error, error);
});

test('usePublicEvent is disabled when eventId is undefined', async () => {
  const { wrapper } = createHarness();
  const getPublicEventByIdMock = mock.method(eventService, 'getPublicEventById', async () => mockEvent);

  const { result } = renderHook(() => usePublicEvent(undefined), { wrapper });

  // fetchStatus should be 'idle' as query is not enabled
  assert.equal(result.current.fetchStatus, 'idle');
  assert.equal(result.current.isLoading, false);
  assert.equal(result.current.isPending, true);
  assert.equal(getPublicEventByIdMock.mock.callCount(), 0);
});
