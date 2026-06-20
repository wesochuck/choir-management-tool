// @vitest-environment jsdom
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { useEventRosterRealtime } from '../src/hooks/useEventRosterRealtime';
import { queryKeys } from '../src/lib/queryKeys';
import { pb } from '../src/lib/pocketbase';
import { mock } from 'node:test';
import type { EventRoster } from '../src/services/rosterService';

function makeRoster(overrides: Partial<EventRoster> = {}): EventRoster {
  return {
    id: 'roster_1',
    event: 'event_1',
    profile: 'profile_1',
    rsvp: 'Pending',
    attendance: 'Pending',
    seatId: '',
    folderNumber: '',
    folderReturned: false,
    rsvpNote: '',
    collectionId: '',
    collectionName: 'eventRosters',
    created: '',
    updated: '',
    ...overrides,
  };
}

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

test('useEventRosterRealtime - patches cache on create/update', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const initialRosters: EventRoster[] = [
    makeRoster({ profile: 'profile_2', attendance: 'Absent' }),
  ];
  client.setQueryData(queryKeys.eventRoster.recordsByEventId('event_1'), initialRosters);

  let subscribeCallback: ((event: { action: string; record: EventRoster }) => void) | undefined;

  const subscribeMock = mock.fn(
    (
      _pattern: string,
      callback: (event: { action: string; record: EventRoster }) => void,
      _options: { filter: string }
    ) => {
      subscribeCallback = callback;
      return Promise.resolve(() => {});
    }
  );

  const originalCollection = pb.collection.bind(pb);
  pb.collection = mock.fn(() => ({
    subscribe: subscribeMock,
  })) as unknown as typeof pb.collection;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  try {
    const { unmount } = renderHook(() => useEventRosterRealtime('event_1'), {
      wrapper: Wrapper,
    });

    assert.ok(subscribeCallback, 'subscribe callback should be captured');
    assert.equal(subscribeMock.mock.callCount(), 1);
    assert.equal(subscribeMock.mock.calls[0].arguments[0], '*');
    assert.equal(subscribeMock.mock.calls[0].arguments[1], subscribeCallback);

    // Simulate an update event
    const updatedRoster = makeRoster({ profile: 'profile_2', attendance: 'Present' });
    subscribeCallback({ action: 'update', record: updatedRoster });

    const cache = client.getQueryData<EventRoster[]>(
      queryKeys.eventRoster.recordsByEventId('event_1')
    );
    assert.equal(cache?.length, 1);
    assert.equal(cache?.[0].attendance, 'Present');

    // Simulate a create event
    const newRoster = makeRoster({ id: 'roster_2', profile: 'profile_3', attendance: 'Present' });
    subscribeCallback({ action: 'create', record: newRoster });

    const cacheAfterCreate = client.getQueryData<EventRoster[]>(
      queryKeys.eventRoster.recordsByEventId('event_1')
    );
    assert.equal(cacheAfterCreate?.length, 2);

    unmount();
  } finally {
    pb.collection = originalCollection;
  }
});

test('useEventRosterRealtime - deletes row from cache', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const initialRosters: EventRoster[] = [makeRoster({ id: 'roster_1', profile: 'profile_1' })];
  client.setQueryData(queryKeys.eventRoster.recordsByEventId('event_1'), initialRosters);

  let subscribeCallback: ((event: { action: string; record: EventRoster }) => void) | undefined;

  const subscribeMock = mock.fn(
    (
      _pattern: string,
      callback: (event: { action: string; record: EventRoster }) => void,
      _options: { filter: string }
    ) => {
      subscribeCallback = callback;
      return Promise.resolve(() => {});
    }
  );

  const originalCollection = pb.collection.bind(pb);
  pb.collection = mock.fn(() => ({
    subscribe: subscribeMock,
  })) as unknown as typeof pb.collection;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  try {
    renderHook(() => useEventRosterRealtime('event_1'), { wrapper: Wrapper });

    assert.ok(subscribeCallback);

    subscribeCallback({
      action: 'delete',
      record: makeRoster({ id: 'roster_1', profile: 'profile_1' }),
    });

    const cache = client.getQueryData<EventRoster[]>(
      queryKeys.eventRoster.recordsByEventId('event_1')
    );
    assert.equal(cache?.length, 0);
  } finally {
    pb.collection = originalCollection;
  }
});

test('useEventRosterRealtime - ignores different event', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const initialRosters: EventRoster[] = [
    makeRoster({ profile: 'profile_1', attendance: 'Pending' }),
  ];
  client.setQueryData(queryKeys.eventRoster.recordsByEventId('event_1'), initialRosters);

  let subscribeCallback: ((event: { action: string; record: EventRoster }) => void) | undefined;

  const subscribeMock = mock.fn(
    (
      _pattern: string,
      callback: (event: { action: string; record: EventRoster }) => void,
      _options: { filter: string }
    ) => {
      subscribeCallback = callback;
      return Promise.resolve(() => {});
    }
  );

  const originalCollection = pb.collection.bind(pb);
  pb.collection = mock.fn(() => ({
    subscribe: subscribeMock,
  })) as unknown as typeof pb.collection;

  try {
    renderHook(() => useEventRosterRealtime('event_1'), { wrapper: createWrapper() });

    assert.ok(subscribeCallback);

    // Simulate an event for a different event
    subscribeCallback({
      action: 'update',
      record: makeRoster({ event: 'event_2', profile: 'profile_1', attendance: 'Present' }),
    });

    const cache = client.getQueryData<EventRoster[]>(
      queryKeys.eventRoster.recordsByEventId('event_1')
    );
    assert.equal(cache?.length, 1);
    assert.equal(cache?.[0].attendance, 'Pending');
  } finally {
    pb.collection = originalCollection;
  }
});

test('useEventRosterRealtime - cleans up subscription on unmount', async () => {
  let unsubscribeCalled = false;
  let resolveSubscribe!: (unsubscribeFn: () => void) => void;
  const subscribePromise = new Promise<() => void>((resolve) => {
    resolveSubscribe = resolve;
  });

  const subscribeMock = mock.fn(() => subscribePromise);

  const originalCollection = pb.collection.bind(pb);
  pb.collection = mock.fn(() => ({
    subscribe: subscribeMock,
  })) as unknown as typeof pb.collection;

  try {
    const { unmount } = renderHook(() => useEventRosterRealtime('event_1'), {
      wrapper: createWrapper(),
    });

    // Unmount before the subscription promise resolves
    unmount();

    // Now resolve the promise
    resolveSubscribe(() => {
      unsubscribeCalled = true;
    });

    // Wait for the promise to settle
    await subscribePromise;

    // The cleanup callback should call the unsubscribe function immediately
    assert.ok(
      unsubscribeCalled,
      'unsubscribe should be called when promise resolves after unmount'
    );
  } finally {
    pb.collection = originalCollection;
  }
});

test('useEventRosterRealtime - calls unsubscribe on unmount', async () => {
  let unsubscribeCalled = false;

  const subscribeMock = mock.fn(
    (
      _pattern: string,
      _callback: (event: { action: string; record: EventRoster }) => void,
      _options: { filter: string }
    ) => {
      return Promise.resolve(() => {
        unsubscribeCalled = true;
      });
    }
  );

  const originalCollection = pb.collection.bind(pb);
  pb.collection = mock.fn(() => ({
    subscribe: subscribeMock,
  })) as unknown as typeof pb.collection;

  try {
    const { unmount } = renderHook(() => useEventRosterRealtime('event_1'), {
      wrapper: createWrapper(),
    });

    // Let the subscription promise resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    unmount();

    assert.ok(unsubscribeCalled, 'unsubscribe should be called on unmount');
  } finally {
    pb.collection = originalCollection;
  }
});

test('useEventRosterRealtime - does not subscribe when eventId is undefined', () => {
  const subscribeMock = mock.fn(() => Promise.resolve(() => {}));

  const originalCollection = pb.collection.bind(pb);
  pb.collection = mock.fn(() => ({
    subscribe: subscribeMock,
  })) as unknown as typeof pb.collection;

  try {
    renderHook(() => useEventRosterRealtime(undefined), { wrapper: createWrapper() });

    assert.equal(subscribeMock.mock.callCount(), 0);
  } finally {
    pb.collection = originalCollection;
  }
});
