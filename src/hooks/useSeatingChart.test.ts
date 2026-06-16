// @vitest-environment jsdom
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';

import { useSeatingChart } from './useSeatingChart';
import { seatingService, type SeatingChart } from '../services/seatingService';
import { profileService, type Profile } from '../services/profileService';
import { rosterService } from '../services/rosterService';
import * as settingsService from '../services/settingsService';
import { type Venue } from '../services/venueService';

const sampleVenue: Venue = {
  id: 'venue_1',
  collectionId: 'pbc_venues_001',
  collectionName: 'pbc_venues_001',
  created: '2026-01-01 00:00:00.000Z',
  updated: '2026-01-01 00:00:00.000Z',
  name: 'Main Hall',
  rowCounts: [4, 4, 4],
  status: 'Active',
};

const sampleProfile: Profile = {
  id: 'profile_1',
  collectionId: 'pbc_profiles_001',
  collectionName: 'pbc_profiles_001',
  created: '2026-01-01 00:00:00.000Z',
  updated: '2026-01-01 00:00:00.000Z',
  user: 'user_1',
  name: 'Test Singer',
  phone: '',
  photo: '',
  voicePart: 'S1',
  globalStatus: 'Active',
  notes: '',
};

const sampleChart: SeatingChart = {
  id: 'chart_1',
  collectionId: 'pbc_seating_001',
  collectionName: 'pbc_seating_001',
  created: '2026-01-01 00:00:00.000Z',
  updated: '2026-01-01 00:00:00.000Z',
  performance: 'perf_1',
  venue: 'venue_1',
  name: 'Main Seating Chart',
  layoutOverride: null,
  formationId: 'default',
  assignments: {},
  sortOrder: 1,
};

interface ServiceOverrides {
  charts?: SeatingChart[];
  profiles?: Profile[];
  roster?: Array<{ profile: string; rsvp: string }>;
  settings?: settingsService.SeatingSettings;
  voiceParts?: settingsService.VoicePartSettings;
  saveChart?: (data: Partial<SeatingChart>) => Promise<SeatingChart>;
  deleteChart?: (id: string) => Promise<unknown>;
  reorderCharts?: (orderedIds: string[]) => Promise<unknown>;
  getChartsThrows?: Error;
}

function mockServices(overrides: ServiceOverrides = {}) {
  const charts = overrides.charts ?? [sampleChart];
  const profiles = overrides.profiles ?? [sampleProfile];
  const roster = overrides.roster ?? [{ profile: 'profile_1', rsvp: 'Yes' }];
  const settings = overrides.settings ?? settingsService.DEFAULT_SEATING_SETTINGS;
  const voiceParts: settingsService.VoicePartSettings = overrides.voiceParts ?? {
    voiceParts: settingsService.DEFAULT_VOICE_PARTS,
    sections: settingsService.DEFAULT_SECTIONS,
  };

  const getCharts = mock.method(
    seatingService,
    'getChartsForPerformance',
    async () => {
      if (overrides.getChartsThrows) throw overrides.getChartsThrows;
      return charts;
    },
  );
  const saveChart = mock.method(
    seatingService,
    'saveChart',
    overrides.saveChart ?? (async (data: Partial<SeatingChart>) => ({ ...sampleChart, ...data, id: data.id ?? `chart_new_${Date.now()}` } as SeatingChart)),
  );
  const deleteChart = mock.method(
    seatingService,
    'deleteChart',
    overrides.deleteChart ?? (async () => undefined),
  );
  const reorderCharts = mock.method(
    seatingService,
    'reorderCharts',
    overrides.reorderCharts ?? (async () => undefined),
  );
  const getActiveProfiles = mock.method(profileService, 'getActiveProfiles', async () => profiles);
  const getEventRoster = mock.method(rosterService, 'getEventRoster', async () => roster);
  const getSeatingSettings = mock.method(settingsService.settingsService, 'getSeatingSettings', async () => settings);
  const getVoiceParts = mock.method(settingsService, 'getVoicePartsAndSections', async () => voiceParts);

  return {
    getCharts,
    saveChart,
    deleteChart,
    reorderCharts,
    getActiveProfiles,
    getEventRoster,
    getSeatingSettings,
    getVoiceParts,
  };
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { Wrapper, client };
}

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

test('useSeatingChart loads initial data and selects the first chart', async () => {
  const mocks = mockServices();
  const { Wrapper } = createWrapper();

  const { result } = renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  assert.equal(result.current.isLoading, true);

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
  });

  assert.equal(mocks.getCharts.mock.callCount(), 1);
  assert.equal(result.current.charts.length, 1);
  assert.equal(result.current.charts[0].id, 'chart_1');
  assert.equal(result.current.activeChartId, 'chart_1');
  assert.equal(result.current.chart?.id, 'chart_1');
  assert.equal(result.current.allProfiles.length, 1);
  assert.equal(result.current.activeProfiles.length, 1);
  assert.equal(result.current.error, null);
});

test('useSeatingChart auto-creates a default chart when none exist', async () => {
  const mocks = mockServices({ charts: [] });
  const { Wrapper } = createWrapper();

  renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  await waitFor(() => {
    assert.ok(mocks.saveChart.mock.callCount() >= 1);
  });

  assert.deepStrictEqual(mocks.saveChart.mock.calls[0].arguments, [
    {
      performance: 'perf_1',
      venue: 'venue_1',
      name: 'Main Seating Chart',
      formationId: settingsService.DEFAULT_SEATING_SETTINGS.defaultFormationId,
      assignments: {},
      layoutOverride: null,
    },
  ]);
});

test('useSeatingChart does not auto-create twice for the same context across re-renders', async () => {
  const mocks = mockServices({ charts: [] });
  const { Wrapper } = createWrapper();

  const { rerender } = renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  await waitFor(() => {
    assert.equal(mocks.saveChart.mock.callCount(), 1);
  });

  for (let i = 0; i < 5; i++) {
    rerender();
  }

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(mocks.saveChart.mock.callCount(), 1);
});

test('useSeatingChart.assignSinger queues a save flushed by forceSave', async () => {
  const mocks = mockServices();
  const { Wrapper } = createWrapper();

  const { result } = renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  await waitFor(() => assert.equal(result.current.isLoading, false));

  const callsBefore = mocks.saveChart.mock.callCount();

  await act(async () => {
    await result.current.assignSinger('0-0', 'profile_1');
  });

  assert.equal(result.current.isDirty, true);
  assert.deepStrictEqual(result.current.optimisticAssignments, { '0-0': 'profile_1' });

  await act(async () => {
    await result.current.forceSave();
  });

  await waitFor(() => {
    assert.ok(mocks.saveChart.mock.callCount() > callsBefore);
  });

  const lastCall = mocks.saveChart.mock.calls[mocks.saveChart.mock.callCount() - 1];
  const arg = lastCall.arguments[0] as Partial<SeatingChart>;
  assert.deepStrictEqual(arg.assignments, { '0-0': 'profile_1' });
  assert.equal(arg.performance, 'perf_1');
  assert.equal(arg.venue, 'venue_1');
});

test('useSeatingChart.createChart calls saveChart, refreshes, and activates the new chart', async () => {
  let savedCharts = [sampleChart];
  const newChart: SeatingChart = { ...sampleChart, id: 'chart_2', name: 'Second Chart', sortOrder: 2 };

  const mocks = mockServices({
    saveChart: async (data) => {
      const result = { ...sampleChart, ...data, id: data.id ?? newChart.id } as SeatingChart;
      if (!data.id) savedCharts = [...savedCharts, result];
      return result;
    },
  });

  mocks.getCharts.mock.mockImplementation(async () => savedCharts);

  const { Wrapper } = createWrapper();

  const { result } = renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  await waitFor(() => assert.equal(result.current.isLoading, false));
  assert.equal(result.current.activeChartId, 'chart_1');

  await act(async () => {
    const created = await result.current.createChart('Second Chart');
    assert.equal(created?.id, 'chart_2');
  });

  await waitFor(() => {
    assert.equal(result.current.activeChartId, 'chart_2');
  });

  const createArgs = mocks.saveChart.mock.calls[0].arguments[0] as Partial<SeatingChart>;
  assert.equal(createArgs.name, 'Second Chart');
  assert.equal(createArgs.performance, 'perf_1');
  assert.equal(createArgs.venue, 'venue_1');
  assert.equal(createArgs.sortOrder, 2);
});

test('useSeatingChart.deleteChart clears active chart when deleting the active one', async () => {
  const mocks = mockServices();
  const { Wrapper } = createWrapper();

  const { result } = renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  await waitFor(() => assert.equal(result.current.isLoading, false));
  assert.equal(result.current.activeChartId, 'chart_1');

  mocks.getCharts.mock.mockImplementation(async () => []);

  await act(async () => {
    await result.current.deleteChart('chart_1');
  });

  await waitFor(() => {
    assert.equal(result.current.activeChartId, '');
  });

  assert.equal(mocks.deleteChart.mock.callCount(), 1);
  assert.deepStrictEqual(mocks.deleteChart.mock.calls[0].arguments, ['chart_1']);
});

test('useSeatingChart.refresh returns a Promise that resolves after the refetch completes', async () => {
  const mocks = mockServices();
  const { Wrapper } = createWrapper();

  const { result } = renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  await waitFor(() => assert.equal(result.current.isLoading, false));

  const callsBefore = mocks.getCharts.mock.callCount();

  await act(async () => {
    const promise = result.current.refresh();
    assert.ok(promise && typeof (promise as Promise<unknown>).then === 'function');
    await promise;
  });

  assert.ok(mocks.getCharts.mock.callCount() > callsBefore);
});

test('useSeatingChart surfaces load errors via error state', async () => {
  mockServices({ getChartsThrows: new Error('PocketBase unavailable') });
  const { Wrapper } = createWrapper();

  const { result } = renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  await waitFor(() => {
    assert.equal(result.current.isLoading, false);
    assert.equal(result.current.error, 'PocketBase unavailable');
  });
});

test('useSeatingChart.createChart surfaces save errors and rethrows', async () => {
  mockServices({
    saveChart: async () => {
      throw new Error('Save failed');
    },
  });
  const { Wrapper } = createWrapper();

  const { result } = renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  await waitFor(() => assert.equal(result.current.isLoading, false));

  let thrown: Error | null = null;
  await act(async () => {
    try {
      await result.current.createChart('New');
    } catch (err: unknown) {
      thrown = err instanceof Error ? err : new Error(String(err));
    }
  });

  assert.ok(thrown, 'expected createChart to throw');
  assert.match(thrown!.message, /Save failed/);
  await waitFor(() => {
    assert.equal(result.current.error, 'Save failed');
  });
});

test('useSeatingChart flushes dirty state on unmount', async () => {
  const mocks = mockServices();
  const { Wrapper } = createWrapper();

  const { result, unmount } = renderHook(() => useSeatingChart('perf_1', sampleVenue), { wrapper: Wrapper });

  await waitFor(() => assert.equal(result.current.isLoading, false));

  const callsBefore = mocks.saveChart.mock.callCount();

  await act(async () => {
    await result.current.assignSinger('1-2', 'profile_1');
  });

  assert.equal(result.current.isDirty, true);

  unmount();

  await waitFor(() => {
    assert.ok(mocks.saveChart.mock.callCount() > callsBefore);
  });

  const flushCall = mocks.saveChart.mock.calls[mocks.saveChart.mock.callCount() - 1];
  const arg = flushCall.arguments[0] as Partial<SeatingChart>;
  assert.deepStrictEqual(arg.assignments, { '1-2': 'profile_1' });
});
