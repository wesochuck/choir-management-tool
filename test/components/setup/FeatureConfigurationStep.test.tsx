// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupProvider } from '../../../src/contexts/SetupContext';
import { FeatureConfigurationStep } from '../../../src/views/setup/steps/FeatureConfigurationStep';
import { settingsService } from '../../../src/services/settingsService';
import { setupService } from '../../../src/services/setupService';
import * as moduleService from '../../../src/services/moduleService';

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

describe('FeatureConfigurationStep', () => {
  it('renders and saves settings for active features', async () => {
    // Mock settings fetch & save
    mock.method(settingsService, 'getRosterSettings', async () => ({
      defaultStatus: 'Active',
      statusAutomationEnabled: true,
      maxRehearsalMisses: 3,
    }));
    mock.method(settingsService, 'getCommunicationSettings', async () => ({
      reminderEnabled: false,
      reminderHoursBefore: 24,
      reportEnabled: false,
    }));

    const saveRosterSpy = mock.method(settingsService, 'saveRosterSettings', async () => {});
    const saveCommSpy = mock.method(settingsService, 'saveCommunicationSettings', async () => {});

    // Mock setup status and active modules
    mock.method(setupService, 'getStatus', async () => ({
      state: 'in_progress',
      initialized: false,
      completedSections: [],
    }));
    mock.method(moduleService, 'getModuleState', async () => ({
      version: 1,
      enabled: ['roster', 'events'],
    }));

    const onSuccessSpy = mock.fn();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <FeatureConfigurationStep onSuccess={onSuccessSpy} />
        </SetupProvider>
      </QueryClientProvider>
    );

    // Wait for the Roster step to load
    await waitFor(() => {
      assert.ok(screen.getByText('Roster Settings'));
    });

    // Advance roster settings
    const saveButton1 = screen.getByText('Save & Next');
    fireEvent.click(saveButton1);

    await waitFor(() => {
      assert.strictEqual(saveRosterSpy.mock.callCount(), 1);
    });

    // Wait for the Events step to load
    await waitFor(() => {
      assert.ok(screen.getByText('Events & Notifications'));
    });

    const saveButton2 = screen.getByText('Save & Next');
    fireEvent.click(saveButton2);

    await waitFor(() => {
      assert.strictEqual(saveCommSpy.mock.callCount(), 1);
      assert.strictEqual(onSuccessSpy.mock.callCount(), 1);
    });
  });
});
