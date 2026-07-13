// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupProvider } from '../../../src/contexts/SetupContext';
import { DialogProvider } from '../../../src/contexts/DialogProvider';
import { InitialDataStep } from '../../../src/views/setup/steps/InitialDataStep';
import * as moduleService from '../../../src/services/moduleService';
import { setupService } from '../../../src/services/setupService';

afterEach(() => {
  document.body.innerHTML = '';
  mock.restoreAll();
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('InitialDataStep', () => {
  it('renders roster and music cards and triggers onSuccess when skipped', async () => {
    // Mock SetupContext dependencies
    mock.method(setupService, 'getStatus', async () => ({
      state: 'in_progress',
      initialized: false,
      completedSections: [],
    }));
    mock.method(moduleService, 'getPublicModuleState', async () => ({
      version: 1,
      enabled: ['roster', 'musicLibrary'],
    }));

    const onSuccessSpy = mock.fn();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <DialogProvider>
          <SetupProvider>
            <InitialDataStep onSuccess={onSuccessSpy} />
          </SetupProvider>
        </DialogProvider>
      </QueryClientProvider>
    );

    // Wait for render
    const heading = await screen.findByText('Add Initial Data');
    assert.ok(heading);

    // Assert cards exist
    await waitFor(() => {
      assert.ok(screen.getByText('Import Performers Roster'));
      assert.ok(screen.getByText('Import Music Library'));
    });

    // Trigger template download flow
    const downloadSpies = mock.method(URL, 'createObjectURL', () => 'blob:mock-url');
    const revokeSpies = mock.method(URL, 'revokeObjectURL', () => {});

    const downloadButtons = screen.getAllByText('Download CSV Template');
    fireEvent.click(downloadButtons[0]);

    assert.strictEqual(downloadSpies.mock.callCount(), 1);

    // Click skip button
    const skipBtn = screen.getByText('Skip & Continue');
    fireEvent.click(skipBtn);

    assert.strictEqual(onSuccessSpy.mock.callCount(), 1);
  });
});
