// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupProvider } from '../src/contexts/SetupContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ChoirNameProvider } from '../src/hooks/useDocumentTitle';
import { DialogProvider } from '../src/contexts/DialogProvider';
import App from '../src/App';
import { setupService } from '../src/services/setupService';
import * as moduleService from '../src/services/moduleService';
import { pb } from '../src/lib/pocketbase';

const originalAuthStore = pb.authStore;

afterEach(() => {
  document.body.innerHTML = '';
  mock.restoreAll();
  pb.authStore = originalAuthStore;
  window.history.pushState({}, '', '/');
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('App setup routing seal', () => {
  it('redirects to /setup when installation is not initialized', async () => {
    mock.method(setupService, 'getStatus', async () => ({
      state: 'in_progress',
      initialized: false,
      completedSections: [],
      ownerIsPerformer: undefined,
      ownerVoicePartSet: undefined,
    }));
    mock.method(moduleService, 'getModuleState', async () => ({ version: 1, enabled: [] }));

    (pb as any).authStore = {
      model: null,
      isValid: false,
      token: '',
      clear: mock.fn(),
      save: mock.fn(),
      onChange: mock.fn(() => () => {}),
    };

    window.history.pushState({}, '', '/dashboard');

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <AuthProvider>
            <ChoirNameProvider>
              <DialogProvider>
                <App />
              </DialogProvider>
            </ChoirNameProvider>
          </AuthProvider>
        </SetupProvider>
      </QueryClientProvider>
    );

    // Wait for the SetupView component text to appear
    await screen.findByText('First-Run Setup');
    assert.strictEqual(window.location.pathname, '/setup');
  });

  it('allows normal routing when setup is initialized', async () => {
    mock.method(setupService, 'getStatus', async () => ({
      state: 'initialized',
      initialized: true,
      completedSections: ['legacy-install'],
      ownerIsPerformer: undefined,
      ownerVoicePartSet: undefined,
    }));
    mock.method(moduleService, 'getModuleState', async () => ({
      version: 1,
      enabled: ['publicWebsite'],
    }));

    (pb as any).authStore = {
      model: null,
      isValid: false,
      token: '',
      clear: mock.fn(),
      save: mock.fn(),
      onChange: mock.fn(() => () => {}),
    };

    window.history.pushState({}, '', '/login');

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <AuthProvider>
            <ChoirNameProvider>
              <DialogProvider>
                <App />
              </DialogProvider>
            </ChoirNameProvider>
          </AuthProvider>
        </SetupProvider>
      </QueryClientProvider>
    );

    // Wait for the Sign In / Login component text to appear
    await screen.findByText(/Sign In/i);
    assert.strictEqual(window.location.pathname, '/login');
  });
});
