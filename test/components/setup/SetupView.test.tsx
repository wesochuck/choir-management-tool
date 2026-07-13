// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupProvider } from '../../../src/contexts/SetupContext';
import { DialogProvider } from '../../../src/contexts/DialogProvider';
import SetupView from '../../../src/views/setup/SetupView';
import { setupService } from '../../../src/services/setupService';
import * as moduleService from '../../../src/services/moduleService';
import { pb } from '../../../src/lib/pocketbase';

afterEach(() => {
  cleanup();
  pb.authStore.clear();
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
    mock.method(moduleService, 'getPublicModuleState', async () => ({ version: 1, enabled: [] }));

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
    mock.method(moduleService, 'getPublicModuleState', async () => ({ version: 1, enabled: [] }));

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

  it('lets an admin revisit a completed setup section', async () => {
    pb.authStore.save('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.signature', {
      id: 'owner-user',
      collectionName: 'users',
      role: 'admin',
    });
    mock.method(setupService, 'getStatus', async () => ({
      state: 'in_progress',
      initialized: false,
      completedSections: ['admin-account', 'organization-basics'],
    }));
    mock.method(moduleService, 'getPublicModuleState', async () => ({
      version: 1,
      enabled: ['roster', 'events', 'venues', 'musicLibrary', 'setLists'],
    }));

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

    const organizationStep = await screen.findByRole('button', { name: /organization/i });
    fireEvent.click(organizationStep);

    assert.ok(await screen.findByPlaceholderText('Metropolitan Community Choir'));
  });
});
