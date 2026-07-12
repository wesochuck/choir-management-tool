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
    mock.method(moduleService, 'getModuleState', () =>
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
    }));
    mock.method(moduleService, 'getModuleState', async () => ({ version: 1, enabled: [] }));

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

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(screen.queryByText('Setup Page'));
    assert.equal(screen.queryByText('Dashboard Content'), null);
  });

  it('allows rendering child component if initialized', async () => {
    mock.method(setupService, 'getStatus', async () => ({
      state: 'initialized',
      initialized: true,
    }));
    mock.method(moduleService, 'getModuleState', async () => ({ version: 1, enabled: [] }));

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

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(screen.queryByText('Dashboard Content'));
    assert.equal(screen.queryByText('Setup Page'), null);
  });
});
