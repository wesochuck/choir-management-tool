// @vitest-environment jsdom
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { useTicketPurchasesRealtime } from '../src/hooks/useTicketPurchasesRealtime';
import { queryKeys } from '../src/lib/queryKeys';
import { pb } from '../src/lib/pocketbase';
import { mock } from 'node:test';

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

test('useTicketPurchasesRealtime - subscribes and invalidates cache on event', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  let subscribeCallback: (() => void) | undefined;
  const subscribeMock = mock.fn((_pattern: string, callback: () => void) => {
    subscribeCallback = callback;
    return Promise.resolve(() => {});
  });

  const originalCollection = pb.collection.bind(pb);
  pb.collection = mock.fn(() => ({
    subscribe: subscribeMock,
  })) as unknown as typeof pb.collection;

  const originalInvalidate = client.invalidateQueries.bind(client);
  const invalidateMock = mock.method(client, 'invalidateQueries', async () => {
    return Promise.resolve();
  });

  try {
    renderHook(() => useTicketPurchasesRealtime(), {
      wrapper: createWrapper(client),
    });

    assert.ok(subscribeCallback, 'subscribe callback should be captured');
    assert.equal(subscribeMock.mock.callCount(), 1);
    assert.equal(subscribeMock.mock.calls[0].arguments[0], '*');

    // Simulate an event
    subscribeCallback();

    assert.equal(invalidateMock.mock.callCount(), 1);
    assert.deepStrictEqual(invalidateMock.mock.calls[0].arguments[0], {
      queryKey: queryKeys.ticketing.all,
    });
  } finally {
    pb.collection = originalCollection;
    mock.restoreAll();
  }
});

test('useTicketPurchasesRealtime - cleans up subscription on unmount', async () => {
  const client = new QueryClient();
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
    const { unmount } = renderHook(() => useTicketPurchasesRealtime(), {
      wrapper: createWrapper(client),
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

test('useTicketPurchasesRealtime - calls unsubscribe on unmount after resolve', async () => {
  const client = new QueryClient();
  let unsubscribeCalled = false;

  const subscribeMock = mock.fn(() => {
    return Promise.resolve(() => {
      unsubscribeCalled = true;
    });
  });

  const originalCollection = pb.collection.bind(pb);
  pb.collection = mock.fn(() => ({
    subscribe: subscribeMock,
  })) as unknown as typeof pb.collection;

  try {
    const { unmount } = renderHook(() => useTicketPurchasesRealtime(), {
      wrapper: createWrapper(client),
    });

    // Let the subscription promise resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    unmount();

    assert.ok(unsubscribeCalled, 'unsubscribe should be called on unmount');
  } finally {
    pb.collection = originalCollection;
  }
});
