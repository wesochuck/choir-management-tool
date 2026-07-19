// @vitest-environment jsdom
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEvents } from '../src/hooks/useEvents';
import { eventService, type Event } from '../src/services/eventService';

test('useEvents refetches the event list after a successful mutation', async (t) => {
  const originalGetEvents = eventService.getEvents;
  const originalCreateEventWithRehearsals = eventService.createEventWithRehearsals;
  let fetchCount = 0;

  eventService.getEvents = t.mock.fn(async () => {
    fetchCount += 1;
    return [{ id: String(fetchCount), type: 'Performance', title: `Fetch ${fetchCount}` }] as Event[];
  });
  eventService.createEventWithRehearsals = t.mock.fn(async () => ({
    id: 'created',
    type: 'Performance',
    title: 'Created event',
  }) as Event);

  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  try {
    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => {
      assert.equal(result.current.events[0]?.id, '1');
    });

    await act(async () => {
      await result.current.addEvent({ title: 'Created event', type: 'Performance' });
    });

    await waitFor(() => {
      assert.equal(fetchCount, 2);
      assert.equal(result.current.events[0]?.id, '2');
    });
  } finally {
    eventService.getEvents = originalGetEvents;
    eventService.createEventWithRehearsals = originalCreateEventWithRehearsals;
    client.clear();
  }
});
