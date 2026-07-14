// @vitest-environment jsdom
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useDues } from './useDues';
import { duesService, type SeasonalDue } from '../services/duesService';
import { settingsService } from '../services/settingsService';

const mockSeasonalDues: SeasonalDue[] = [
  {
    id: 'd1',
    profile: 'p1',
    season: 'Fall 2023',
    paid: true,
    collectionId: 'c1',
    collectionName: 'seasonalDues',
    created: '',
    updated: '',
  },
  {
    id: 'd2',
    profile: 'p2',
    season: 'Fall 2023',
    paid: false,
    collectionId: 'c1',
    collectionName: 'seasonalDues',
    created: '',
    updated: '',
  },
];

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

test('useDues returns currentSeason and duesMap correctly', async () => {
  const { wrapper } = createHarness();

  mock.method(settingsService, 'getRosterSettings', async () => ({
    currentSeason: 'Fall 2023',
  }));

  mock.method(duesService, 'getDuesForSeason', async (season: string) => {
    if (season === 'Fall 2023') return mockSeasonalDues;
    return [];
  });

  const { result } = renderHook(() => useDues(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.equal(result.current.currentSeason, 'Fall 2023');
  assert.equal(Object.keys(result.current.duesMap).length, 2);
  assert.deepEqual(result.current.duesMap['p1'], mockSeasonalDues[0]);
  assert.deepEqual(result.current.duesMap['p2'], mockSeasonalDues[1]);
});

test('useDues returns empty duesMap if no data is returned', async () => {
  const { wrapper } = createHarness();

  mock.method(settingsService, 'getRosterSettings', async () => ({
    currentSeason: 'Spring 2024',
  }));

  mock.method(duesService, 'getDuesForSeason', async () => []);

  const { result } = renderHook(() => useDues(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.equal(result.current.currentSeason, 'Spring 2024');
  assert.deepEqual(result.current.duesMap, {});
});

test('useDues handles loading states correctly', async () => {
  const { wrapper } = createHarness();

  // Never resolving promises to keep them in loading state
  mock.method(settingsService, 'getRosterSettings', () => new Promise(() => {}));
  mock.method(duesService, 'getDuesForSeason', () => new Promise(() => {}));

  const { result } = renderHook(() => useDues(), { wrapper });

  assert.equal(result.current.isLoading, true);
});

test('useDues toggleDues updates mutation correctly', async () => {
  const { wrapper } = createHarness();

  mock.method(settingsService, 'getRosterSettings', async () => ({
    currentSeason: 'Fall 2023',
  }));

  mock.method(duesService, 'getDuesForSeason', async () => mockSeasonalDues);

  const updateDuesMock = mock.method(duesService, 'updateDues', async () => ({}));

  const { result } = renderHook(() => useDues(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  await result.current.toggleDues('p2', true);

  assert.equal(updateDuesMock.mock.callCount(), 1);
  assert.deepEqual(updateDuesMock.mock.calls[0].arguments, ['p2', 'Fall 2023', true]);
});

test('useDues toggleDues skipping mutation if no currentSeason', async () => {
  const { wrapper } = createHarness();

  mock.method(settingsService, 'getRosterSettings', async () => ({
    currentSeason: '',
  }));

  const updateDuesMock = mock.method(duesService, 'updateDues', async () => ({}));

  const { result } = renderHook(() => useDues(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  await result.current.toggleDues('p2', true);

  assert.equal(updateDuesMock.mock.callCount(), 0);
});

test('useDues refresh re-fetches queries', async () => {
  const { wrapper } = createHarness();

  const getRosterSettingsMock = mock.method(settingsService, 'getRosterSettings', async () => ({
    currentSeason: 'Fall 2023',
  }));

  const getDuesForSeasonMock = mock.method(duesService, 'getDuesForSeason', async () => mockSeasonalDues);

  const { result } = renderHook(() => useDues(), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.equal(getRosterSettingsMock.mock.callCount(), 1);
  assert.equal(getDuesForSeasonMock.mock.callCount(), 1);

  await result.current.refresh();

  assert.equal(getRosterSettingsMock.mock.callCount(), 2);
  assert.equal(getDuesForSeasonMock.mock.callCount(), 2);
});
