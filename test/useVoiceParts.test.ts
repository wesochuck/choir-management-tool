import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
});
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useVoiceParts } from '../src/hooks/useVoiceParts.ts';
import { pb } from '../src/lib/pocketbase.ts';

type MockCollection = ReturnType<typeof pb.collection>;

test('useVoiceParts - exposes correct initial state and updates after fetch', async (t) => {
  const originalCollection = pb.collection;

  let fetchCalled = false;
  const mockGetFirstListItem = t.mock.fn(async () => {
    fetchCalled = true;
    return {
      key: 'voiceParts',
      value: {
        voiceParts: [{ label: 'T1', fullName: 'Tenor 1', sectionCode: 'T' }],
        sections: [{ code: 'T', name: 'Tenors' }]
      }
    };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as MockCollection;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { result } = renderHook(() => useVoiceParts());

    // Initial state
    assert.equal(result.current.isLoading, true);
    assert.deepEqual(result.current.voiceParts, []);
    assert.deepEqual(result.current.sections, []);

    // Wait for update
    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(fetchCalled, true);
    assert.equal(result.current.voiceParts[0].label, 'T1');
    assert.equal(result.current.sections[0].code, 'T');
    assert.deepEqual(result.current.labels, ['T1']);
  } finally {
    pb.collection = originalCollection;
  }
});

test('useVoiceParts - refresh triggers manual data fetch', async (t) => {
  const originalCollection = pb.collection;

  let fetchCount = 0;
  const mockGetFirstListItem = t.mock.fn(async () => {
    fetchCount++;
    return {
      key: 'voiceParts',
      value: {
        voiceParts: [{ label: `T${fetchCount}`, fullName: `Tenor ${fetchCount}`, sectionCode: 'T' }],
        sections: [{ code: 'T', name: 'Tenors' }]
      }
    };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as MockCollection;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { result } = renderHook(() => useVoiceParts());

    // Wait for initial fetch
    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(fetchCount, 1);
    assert.equal(result.current.voiceParts[0].label, 'T1');

    // Call refresh explicitly
    await act(async () => {
      await result.current.refresh();
    });

    assert.equal(fetchCount, 2);
    assert.equal(result.current.voiceParts[0].label, 'T2');

  } finally {
    pb.collection = originalCollection;
  }
});

test('useVoiceParts - handles errors gracefully', async (t) => {
  const originalCollection = pb.collection;

  const mockGetFirstListItem = t.mock.fn(async () => {
    throw new Error('Database Error');
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as MockCollection;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const { result } = renderHook(() => useVoiceParts());

    // Wait for update
    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    // The hook internally calls getVoicePartsAndSections. If pocketbase throws,
    // getVoicePartsAndSections catches it and returns default arrays (length 8 for voice parts)
    assert.equal(result.current.isLoading, false);
    assert.equal(result.current.voiceParts.length, 8);
    assert.equal(result.current.voiceParts[0].label, 'S1');

  } finally {
    pb.collection = originalCollection;
  }
});
