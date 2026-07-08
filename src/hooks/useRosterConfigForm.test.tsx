// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { useRosterConfigForm } from './useRosterConfigForm';
import * as settingsService from '../services/settingsService';

const mockRosterSettings = {
  defaultStatus: 'Active',
  currentSeason: '2026 Season',
  statusAutomationEnabled: true,
  statusAutomationMissThreshold: 3,
  statusAutomationRecoveryEnabled: true,
  maxRehearsalMisses: 3,
};

const mockVoicePartsAndSections = {
  sections: [
    { code: 'S', name: 'Soprano' },
    { code: 'A', name: 'Alto' },
  ],
  voiceParts: [
    { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
    { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' },
  ],
};

function createHarness() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, client };
}

function mockDependencies() {
  mock.method(settingsService.settingsService, 'getRosterSettings', async () => ({
    ...mockRosterSettings,
  }));
  mock.method(settingsService.settingsService, 'saveRosterSettings', async () => {});
  mock.method(settingsService, 'getVoicePartsAndSections', async () => ({
    ...mockVoicePartsAndSections,
  }));
  mock.method(settingsService, 'saveVoicePartsAndSections', async () => {});
}

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

describe('useRosterConfigForm', () => {
  it('hydrates initial state from settings queries', async () => {
    mockDependencies();
    const { wrapper } = createHarness();

    const { result } = renderHook(
      () =>
        useRosterConfigForm({
          setFilter: mock.fn(),
          refreshRoster: mock.fn(async () => {}),
          refreshVoiceParts: mock.fn(async () => {}),
        }),
      { wrapper }
    );

    await waitFor(() => {
      assert.strictEqual(result.current.configDefaultStatus, 'Active');
      assert.strictEqual(result.current.configSeason, '2026 Season');
      assert.strictEqual(result.current.configAutomationEnabled, true);
      assert.strictEqual(result.current.configAutomationMissThreshold, 3);
      assert.strictEqual(result.current.configAutomationRecoveryEnabled, true);
      assert.strictEqual(result.current.configMaxRehearsalMisses, 3);
      assert.deepEqual(result.current.configSections, mockVoicePartsAndSections.sections);
      assert.deepEqual(result.current.configVoiceParts, mockVoicePartsAndSections.voiceParts);
      assert.strictEqual(result.current.isConfigDirty, false);
    });
  });

  it('detects modifications and transitions to dirty state', async () => {
    mockDependencies();
    const { wrapper } = createHarness();

    const { result } = renderHook(
      () =>
        useRosterConfigForm({
          setFilter: mock.fn(),
          refreshRoster: mock.fn(async () => {}),
          refreshVoiceParts: mock.fn(async () => {}),
        }),
      { wrapper }
    );

    await waitFor(() => {
      assert.strictEqual(result.current.configDefaultStatus, 'Active');
    });

    assert.strictEqual(result.current.isConfigDirty, false);

    act(() => {
      result.current.setConfigDefaultStatus('Idle');
    });

    assert.strictEqual(result.current.isConfigDirty, true);
  });

  it('resets form state and dirty flag when handleConfigDiscard is called', async () => {
    mockDependencies();
    const { wrapper } = createHarness();

    const { result } = renderHook(
      () =>
        useRosterConfigForm({
          setFilter: mock.fn(),
          refreshRoster: mock.fn(async () => {}),
          refreshVoiceParts: mock.fn(async () => {}),
        }),
      { wrapper }
    );

    await waitFor(() => {
      assert.strictEqual(result.current.configDefaultStatus, 'Active');
    });

    act(() => {
      result.current.setConfigDefaultStatus('Idle');
      result.current.setConfigSeason('2027 Season');
    });

    assert.strictEqual(result.current.isConfigDirty, true);

    act(() => {
      result.current.handleConfigDiscard();
    });

    assert.strictEqual(result.current.configDefaultStatus, 'Active');
    assert.strictEqual(result.current.configSeason, '2026 Season');
    assert.strictEqual(result.current.isConfigDirty, false);
  });

  it('clears dirty state and sets success message after successful save', async () => {
    mockDependencies();
    const { wrapper } = createHarness();

    const { result } = renderHook(
      () =>
        useRosterConfigForm({
          setFilter: mock.fn(),
          refreshRoster: mock.fn(async () => {}),
          refreshVoiceParts: mock.fn(async () => {}),
        }),
      { wrapper }
    );

    await waitFor(() => {
      assert.strictEqual(result.current.configDefaultStatus, 'Active');
    });

    act(() => {
      result.current.setConfigDefaultStatus('Idle');
      result.current.setConfigVoiceParts([
        ...mockVoicePartsAndSections.voiceParts,
        { label: 'T1', fullName: 'Tenor 1', sectionCode: 'T' },
      ]);
      // Must also mock section bucket to pass validation if assigning to 'T'
      result.current.setConfigSections([
        ...mockVoicePartsAndSections.sections,
        { code: 'T', name: 'Tenors' },
      ]);
    });

    assert.strictEqual(result.current.isConfigDirty, true);

    await act(async () => {
      await result.current.handleConfigSave();
    });

    assert.strictEqual(result.current.configMessage, 'Configuration saved successfully.');
    assert.strictEqual(result.current.isConfigDirty, false);
  });
});
