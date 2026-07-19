// @vitest-environment jsdom
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEvents } from '../src/hooks/useEvents.ts';
import { eventService, type Event, type BulkRehearsalConfig } from '../src/services/eventService.ts';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

test('useEvents - initial state and successful fetch', async (t) => {
  const originalGetEvents = eventService.getEvents;

  eventService.getEvents = t.mock.fn(async () => [
    { id: '1', type: 'Performance', title: 'Perf 1' },
    { id: '2', type: 'Rehearsal', title: 'Reh 1' },
  ] as unknown as Event[]);

  try {
    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

    assert.equal(result.current.isLoading, true);
    assert.deepEqual(result.current.events, []);
    assert.deepEqual(result.current.performances, []);

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(result.current.events.length, 2);
    assert.equal(result.current.performances.length, 1);
    assert.equal(result.current.performances[0].id, '1');
    assert.equal(result.current.error, null);
  } finally {
    eventService.getEvents = originalGetEvents;
  }
});

test('useEvents - fetch error', async (t) => {
  const originalGetEvents = eventService.getEvents;

  eventService.getEvents = t.mock.fn(async () => {
    throw new Error('Network Error');
  });

  try {
    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(result.current.error, 'Network Error');
    assert.deepEqual(result.current.events, []);
  } finally {
    eventService.getEvents = originalGetEvents;
  }
});

test('useEvents - addEvent mutation', async (t) => {
  const originalGetEvents = eventService.getEvents;
  const originalCreateEventWithRehearsals = eventService.createEventWithRehearsals;

  eventService.getEvents = t.mock.fn(async () => [] as unknown as Event[]);

  let createdData: { data: Partial<Event> | FormData, bulkConfig?: BulkRehearsalConfig } | null = null;
  eventService.createEventWithRehearsals = t.mock.fn(async (data: Partial<Event> | FormData, bulkConfig?: BulkRehearsalConfig) => {
    createdData = { data, bulkConfig };
    return { id: '3', ...(data as Partial<Event>) } as Event;
  });

  try {
    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    await act(async () => {
      await result.current.addEvent({ title: 'New Event' });
    });

    assert.equal((createdData?.data as Partial<Event>).title, 'New Event');
  } finally {
    eventService.getEvents = originalGetEvents;
    eventService.createEventWithRehearsals = originalCreateEventWithRehearsals;
  }
});

test('useEvents - editEvent mutation', async (t) => {
  const originalGetEvents = eventService.getEvents;
  const originalUpdateEvent = eventService.updateEvent;

  eventService.getEvents = t.mock.fn(async () => [] as unknown as Event[]);

  let updatedId: string | null = null;
  let updatedData: Partial<Event> | FormData | null = null;
  eventService.updateEvent = t.mock.fn(async (id: string, data: Partial<Event> | FormData) => {
    updatedId = id;
    updatedData = data;
    return { id, ...(data as Partial<Event>) } as Event;
  });

  try {
    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    await act(async () => {
      await result.current.editEvent('event-123', { title: 'Updated Event' });
    });

    assert.equal(updatedId, 'event-123');
    assert.equal((updatedData as Partial<Event>).title, 'Updated Event');
  } finally {
    eventService.getEvents = originalGetEvents;
    eventService.updateEvent = originalUpdateEvent;
  }
});

test('useEvents - removeEvent mutation', async (t) => {
  const originalGetEvents = eventService.getEvents;
  const originalDeleteEvent = eventService.deleteEvent;

  eventService.getEvents = t.mock.fn(async () => [] as unknown as Event[]);

  let deletedId: string | null = null;
  eventService.deleteEvent = t.mock.fn(async (id: string) => {
    deletedId = id;
    return true;
  });

  try {
    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    await act(async () => {
      await result.current.removeEvent('event-123');
    });

    assert.equal(deletedId, 'event-123');
  } finally {
    eventService.getEvents = originalGetEvents;
    eventService.deleteEvent = originalDeleteEvent;
  }
});

test('useEvents - bulkAddRehearsals mutation', async (t) => {
  const originalGetEvents = eventService.getEvents;
  const originalBulkCreateRehearsals = eventService.bulkCreateRehearsals;

  eventService.getEvents = t.mock.fn(async () => [] as unknown as Event[]);

  let bulkPerformance: Event | null = null;
  let bulkConfig: BulkRehearsalConfig | null = null;
  eventService.bulkCreateRehearsals = t.mock.fn(async (performance: Event, config: BulkRehearsalConfig) => {
    bulkPerformance = performance;
    bulkConfig = config;
    return [];
  });

  try {
    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    const mockPerformance = { id: 'perf-1', title: 'Big Show' };
    const mockConfig = { count: 3, dayOfWeek: 1, time: '19:00' };

    await act(async () => {
      await result.current.bulkAddRehearsals(mockPerformance as unknown as Event, mockConfig as unknown as BulkRehearsalConfig);
    });

    assert.equal(bulkPerformance?.id, 'perf-1');
    assert.equal(bulkConfig?.count, 3);
  } finally {
    eventService.getEvents = originalGetEvents;
    eventService.bulkCreateRehearsals = originalBulkCreateRehearsals;
  }
});

test('useEvents - refresh function', async (t) => {
  const originalGetEvents = eventService.getEvents;

  let fetchCount = 0;
  eventService.getEvents = t.mock.fn(async () => {
    fetchCount++;
    return [{ id: fetchCount.toString(), type: 'Performance', title: `Perf ${fetchCount}` }] as unknown as Event[];
  });

  try {
    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(fetchCount, 1);
    assert.equal(result.current.events[0].id, '1');

    await act(async () => {
      await result.current.refresh();
    });

    // Wait for the refresh to complete
    await waitFor(() => {
      if (result.current.events[0].id !== '2') throw new Error('Still refreshing');
    });

    assert.equal(fetchCount, 2);
    assert.equal(result.current.events[0].id, '2');
  } finally {
    eventService.getEvents = originalGetEvents;
  }
});
