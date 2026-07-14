// @vitest-environment jsdom
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { usePublicBundle } from '../src/hooks/usePublicBundle.ts';
import { pb } from '../src/lib/pocketbase.ts';

type MockCollection = ReturnType<typeof pb.collection>;

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

afterEach(() => {
  cleanup();
});

const mockBundle = {
  id: 'b1',
  title: 'Weekend Pass',
  priceCents: 5000,
  capacity: 100,
  events: ['e1', 'e2'],
  saleEndDate: '2026-06-15T19:00:00.000Z',
  isActive: true,
  collectionId: 'col1',
  collectionName: 'ticketBundles',
  created: '',
  updated: '',
  expand: {
    events: [
      { id: 'e1', title: 'Friday Show' } as unknown as Event,
      { id: 'e2', title: 'Saturday Show' } as unknown as Event,
    ],
  },
};

test('usePublicBundle - fetches and returns bundle data on success', async (t) => {
  const originalCollection = pb.collection;

  let fetchCalled = false;
  let fetchedId = '';

  const mockGetOne = t.mock.fn(async (id: string) => {
    fetchCalled = true;
    fetchedId = id;
    return mockBundle;
  });

  pb.collection = function (name: string) {
    if (name === 'ticketBundles') {
      return { getOne: mockGetOne } as unknown as MockCollection;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { result } = renderHook(() => usePublicBundle('b1'), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isSuccess) {
        return;
      }
      if (result.current.isError) {
        throw new Error('Query failed');
      }
      throw new Error('Still loading');
    });

    assert.equal(fetchCalled, true);
    assert.equal(fetchedId, 'b1');
    assert.deepEqual(result.current.data, mockBundle);
    assert.equal(result.current.error, null);
  } finally {
    pb.collection = originalCollection;
  }
});

test('usePublicBundle - returns error on failure', async (t) => {
  const originalCollection = pb.collection;

  const mockGetOne = t.mock.fn(async () => {
    throw new Error('Not found');
  });

  pb.collection = function (name: string) {
    if (name === 'ticketBundles') {
      return { getOne: mockGetOne } as unknown as MockCollection;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { result } = renderHook(() => usePublicBundle('invalid-id'), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isError) {
        return;
      }
      throw new Error('Still loading');
    });

    assert.equal(result.current.isError, true);
    assert.equal(result.current.error?.message, 'Not found');
    assert.equal(result.current.data, undefined);
  } finally {
    pb.collection = originalCollection;
  }
});

test('usePublicBundle - does not fetch if bundleId is undefined', async (t) => {
  const originalCollection = pb.collection;

  let fetchCalled = false;
  const mockGetOne = t.mock.fn(async () => {
    fetchCalled = true;
    return mockBundle;
  });

  pb.collection = function (name: string) {
    if (name === 'ticketBundles') {
      return { getOne: mockGetOne } as unknown as MockCollection;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { result } = renderHook(() => usePublicBundle(undefined), { wrapper: createWrapper() });

    // We will just verify it does not fetch after a small delay.
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.equal(fetchCalled, false);
    assert.equal(result.current.fetchStatus, 'idle');
    assert.equal(result.current.data, undefined);
  } finally {
    pb.collection = originalCollection;
  }
});
