// @vitest-environment jsdom
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { usePublicEvents } from './usePublicEvents';
import { eventService } from '../services/eventService';

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

test('usePublicEvents returns events on success', async () => {
  const { wrapper } = createHarness();
  mock.method(eventService, 'getPublicEvents', async () => [mockEvent]);

  const { result } = renderHook(() => usePublicEvents(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.deepStrictEqual(result.current.events, [mockEvent]);
  assert.equal(result.current.error, null);
});

test('usePublicEvents returns empty array when no events', async () => {
  const { wrapper } = createHarness();
  mock.method(eventService, 'getPublicEvents', async () => []);

  const { result } = renderHook(() => usePublicEvents(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.deepStrictEqual(result.current.events, []);
  assert.equal(result.current.error, null);
});

test('usePublicEvents returns error message on failure', async () => {
  const { wrapper } = createHarness();
  mock.method(eventService, 'getPublicEvents', async () => {
    throw new Error('Network error');
  });

  const { result } = renderHook(() => usePublicEvents(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.deepStrictEqual(result.current.events, []);
  assert.equal(result.current.error, 'Network error');
});
