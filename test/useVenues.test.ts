import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: "http://localhost",
});
global.window = dom.window as unknown as Window & typeof globalThis;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null
} as unknown as Storage;
global.sessionStorage = global.localStorage;

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHook, act } from '@testing-library/react';
import { useVenues } from '../src/hooks/useVenues.ts';
import { venueService } from '../src/services/venueService.ts';

test('useVenues error path sets error state correctly', async () => {
  const originalGetVenues = venueService.getVenues;

  venueService.getVenues = async () => {
    throw new Error('Database connection failed');
  };

  try {
    const { result } = renderHook(() => useVenues());

    assert.equal(result.current.isLoading, true);
    assert.equal(result.current.error, null);

    await act(async () => {
      // Wait for the next tick to allow the async fetchVenues to reject
      await new Promise(resolve => setImmediate(resolve));
    });

    assert.equal(result.current.isLoading, false);
    assert.equal(result.current.error, 'Database connection failed');
  } finally {
    venueService.getVenues = originalGetVenues;
  }
});
