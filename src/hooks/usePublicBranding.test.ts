// @vitest-environment jsdom
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { usePublicBranding } from './usePublicBranding';
import { settingsService } from '../services/settingsService';
import type { LandingPageSettings } from '../services/settings/landingSettings';

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

test('usePublicBranding returns true when showBrandingHeaderFooter is true', async () => {
  const { wrapper } = createHarness();
  mock.method(settingsService, 'getLandingSettings', async (): Promise<Partial<LandingPageSettings>> => ({
    showBrandingHeaderFooter: true,
  }));

  const { result } = renderHook(() => usePublicBranding(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.equal(result.current.data, true);
  assert.equal(result.current.error, null);
});

test('usePublicBranding returns false when showBrandingHeaderFooter is false', async () => {
  const { wrapper } = createHarness();
  mock.method(settingsService, 'getLandingSettings', async (): Promise<Partial<LandingPageSettings>> => ({
    showBrandingHeaderFooter: false,
  }));

  const { result } = renderHook(() => usePublicBranding(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.equal(result.current.data, false);
  assert.equal(result.current.error, null);
});

test('usePublicBranding returns false when showBrandingHeaderFooter is undefined', async () => {
  const { wrapper } = createHarness();
  mock.method(settingsService, 'getLandingSettings', async (): Promise<Partial<LandingPageSettings>> => ({}));

  const { result } = renderHook(() => usePublicBranding(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.equal(result.current.data, false);
  assert.equal(result.current.error, null);
});

test('usePublicBranding returns error when settingsService fails', async () => {
  const { wrapper } = createHarness();
  mock.method(settingsService, 'getLandingSettings', async () => {
    throw new Error('Network error');
  });

  const { result } = renderHook(() => usePublicBranding(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.equal(result.current.data, undefined);
  assert.ok(result.current.error);
  assert.equal(result.current.error.message, 'Network error');
});
