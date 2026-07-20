// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupProvider } from '../../../src/contexts/SetupContext';
import { SetupGate } from '../../../src/components/setup/SetupGate';
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

describe('SetupGate', () => {
  it('renders loader while fetching status', async () => {
    mock.method(setupService, 'getStatus', () => new Promise(() => {})); // never resolves
    mock.method(moduleService, 'getPublicModuleState', () =>
      Promise.resolve({ version: 1, enabled: [] })
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <SetupGate>
              <div>Dashboard Content</div>
            </SetupGate>
          </MemoryRouter>
        </SetupProvider>
      </QueryClientProvider>
    );

    assert.ok(screen.getByText('Loading Setup Status...'));
    assert.equal(screen.queryByText('Dashboard Content'), null);
  });

  it('redirects to /setup when unclaimed or in_progress', async () => {
    mock.method(setupService, 'getStatus', async () => ({
      state: 'unclaimed',
      initialized: false,
      completedSections: [],
      ownerIsPerformer: undefined,
      ownerVoicePartSet: undefined,
    }));
    mock.method(moduleService, 'getPublicModuleState', async () => ({ version: 1, enabled: [] }));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <SetupGate>
              <Routes>
                <Route path="/setup" element={<div>Setup Page</div>} />
                <Route path="/dashboard" element={<div>Dashboard Content</div>} />
              </Routes>
            </SetupGate>
          </MemoryRouter>
        </SetupProvider>
      </QueryClientProvider>
    );

    await screen.findByText('Setup Page');
    assert.equal(screen.queryByText('Dashboard Content'), null);
  });

  it('shows a server error instead of setup when setup status cannot be loaded', async () => {
    mock.method(setupService, 'getStatus', async () => {
      throw new Error('Invalid setup response');
    });
    mock.method(moduleService, 'getPublicModuleState', async () => ({ version: 1, enabled: [] }));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <SetupGate>
              <Routes>
                <Route path="/setup" element={<div>Setup Page</div>} />
                <Route path="/dashboard" element={<div>Dashboard Content</div>} />
              </Routes>
            </SetupGate>
          </MemoryRouter>
        </SetupProvider>
      </QueryClientProvider>
    );

    await screen.findByText('Unable to load application configuration');
    assert.equal(screen.queryByText('Setup Page'), null);
    assert.equal(screen.queryByText('Dashboard Content'), null);
    assert.ok(screen.getByRole('button', { name: 'Retry connection' }));
  });

  it('allows rendering child component if initialized', async () => {
    mock.method(setupService, 'getStatus', async () => ({
      state: 'initialized',
      initialized: true,
      completedSections: ['legacy-install'],
      ownerIsPerformer: undefined,
      ownerVoicePartSet: undefined,
    }));
    mock.method(moduleService, 'getPublicModuleState', async () => ({ version: 1, enabled: [] }));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <SetupGate>
              <Routes>
                <Route path="/setup" element={<div>Setup Page</div>} />
                <Route path="/dashboard" element={<div>Dashboard Content</div>} />
              </Routes>
            </SetupGate>
          </MemoryRouter>
        </SetupProvider>
      </QueryClientProvider>
    );

    await screen.findByText('Dashboard Content');
    assert.equal(screen.queryByText('Setup Page'), null);
  });
});
