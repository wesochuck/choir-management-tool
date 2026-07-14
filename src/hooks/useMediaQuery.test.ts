// @vitest-environment jsdom
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

afterEach(() => {
  cleanup();
});

test('useMediaQuery returns false when matchMedia reports no match', () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
  assert.equal(result.current, false);
});

test('useMediaQuery returns true when matchMedia reports a match', () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
  assert.equal(result.current, true);
});

test('useMediaQuery updates when the media query change event fires', () => {
  let changeHandler: (() => void) | null = null;
  let currentMatches = false;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      get matches() {
        return currentMatches;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: () => void) => {
        changeHandler = cb;
      },
      removeEventListener: () => {
        changeHandler = null;
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
  assert.equal(result.current, false);

  currentMatches = true;
  act(() => {
    changeHandler?.();
  });
  assert.equal(result.current, true);
});

test('useMediaQuery handles undefined window.matchMedia gracefully', () => {
  const originalMatchMedia = window.matchMedia;

  // @ts-expect-error - testing environment without matchMedia
  window.matchMedia = undefined;

  const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
  assert.equal(result.current, false);

  window.matchMedia = originalMatchMedia;
});

test('useMediaQuery fallback in handleChange when event is undefined', () => {
  let changeHandler: ((event?: any) => void) | null = null;
  let currentMatches = false;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      get matches() {
        return currentMatches;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: any) => void) => {
        changeHandler = cb;
      },
      removeEventListener: () => {
        changeHandler = null;
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
  assert.equal(result.current, false);

  currentMatches = true;
  act(() => {
    // Call without matches property to trigger `event?.matches ?? mql.matches`
    changeHandler?.({});
  });
  assert.equal(result.current, true);
});
