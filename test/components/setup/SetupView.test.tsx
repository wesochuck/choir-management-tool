// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupProvider } from '../../../src/contexts/SetupContext';
import { DialogProvider } from '../../../src/contexts/DialogProvider';
import SetupView from '../../../src/views/setup/SetupView';
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

describe('SetupView', () => {
  it('renders OwnerSignInStep initially when state is unclaimed', async () => {
    mock.method(setupService, 'getStatus', async () => ({
      state: 'unclaimed',
      initialized: false,
    }));
    mock.method(moduleService, 'getModuleState', async () => ({ version: 1, enabled: [] }));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <DialogProvider>
            <MemoryRouter>
              <SetupView />
            </MemoryRouter>
          </DialogProvider>
        </SetupProvider>
      </QueryClientProvider>
    );

    // Wait for the query to finish and display setup
    await screen.findByText('First-Run Setup');
    assert.ok(screen.queryByText(/Enter the superuser credentials/i));
  });

  it('renders AdminRecoveryStep when state is recovery_required', async () => {
    mock.method(setupService, 'getStatus', async () => ({
      state: 'recovery_required',
      initialized: false,
    }));
    mock.method(moduleService, 'getModuleState', async () => ({ version: 1, enabled: [] }));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <DialogProvider>
            <MemoryRouter>
              <SetupView />
            </MemoryRouter>
          </DialogProvider>
        </SetupProvider>
      </QueryClientProvider>
    );

    await screen.findByText('Admin Recovery');
    assert.ok(screen.queryByText(/Authorization required: Enter superuser credentials/i));
  });
});
