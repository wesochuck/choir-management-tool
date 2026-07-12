// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupProvider } from '../../../src/contexts/SetupContext';
import { DialogProvider } from '../../../src/contexts/DialogProvider';
import { IntegrationVerificationStep } from '../../../src/views/setup/steps/IntegrationVerificationStep';
import { pb } from '../../../src/lib/pocketbase';
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

describe('IntegrationVerificationStep', () => {
  it('allows continuation when optional Stripe verification is incomplete', async () => {
    mock.method(pb, 'send', async (url: string) => {
      if (url === '/api/setup/health') {
        return {
          environment: {
            appUrl: true,
            hmacSecret: true,
            maintenanceSecret: true,
            stripeSecretKey: false,
            stripeWebhookSecret: false,
          },
          stripeMode: 'unknown',
          stripeValid: null,
          appUrlMismatch: false,
          emailValid: true,
        };
      }
      throw new Error('Not found');
    });
    mock.method(setupService, 'getStatus', async () => ({
      state: 'in_progress',
      initialized: false,
      completedSections: [],
    }));
    mock.method(moduleService, 'getModuleState', async () => ({
      version: 1,
      enabled: ['ticketSales'],
    }));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <DialogProvider>
          <SetupProvider>
            <IntegrationVerificationStep onSuccess={() => undefined} />
          </SetupProvider>
        </DialogProvider>
      </QueryClientProvider>
    );

    const continueButton = await screen.findByText('Save & Continue');
    assert.strictEqual((continueButton as HTMLButtonElement).disabled, false);
  });

  it('renders checklists and handles email functional tests', async () => {
    // Mock pb.send for health and test-smtp
    const healthMock = mock.fn(async (url: string) => {
      if (url === '/api/setup/health') {
        return {
          environment: {
            appUrl: true,
            hmacSecret: true,
            maintenanceSecret: true,
            stripeSecretKey: false,
            stripeWebhookSecret: false,
          },
          stripeMode: 'unknown',
          stripeValid: null,
          appUrlMismatch: false,
          emailValid: true,
        };
      }
      if (url === '/api/test-smtp') {
        return { success: true };
      }
      throw new Error('Not found');
    });
    const sendSpy = mock.method(pb, 'send', healthMock);

    // Mock SetupContext dependencies
    mock.method(setupService, 'getStatus', async () => ({
      state: 'in_progress',
      initialized: false,
      completedSections: [],
    }));
    mock.method(moduleService, 'getModuleState', async () => ({
      version: 1,
      enabled: ['roster'],
    }));

    const onSuccessSpy = mock.fn();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <DialogProvider>
          <SetupProvider>
            <IntegrationVerificationStep onSuccess={onSuccessSpy} />
          </SetupProvider>
        </DialogProvider>
      </QueryClientProvider>
    );

    // Wait for the checklist to render
    await waitFor(() => {
      assert.ok(screen.getByText('Verification & Integration'));
    });

    // Check that hmac & maintenance secret has checkmark
    assert.ok(screen.getByText('Secrets (HMAC & Maintenance)'));

    // Send a test email
    const emailInput = screen.getByPlaceholderText('test@example.com') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });

    const sendTestBtn = screen.getByText('Send Test');
    fireEvent.click(sendTestBtn);

    await waitFor(() => {
      const smtpCall = sendSpy.mock.calls.find((call) => call.arguments[0] === '/api/test-smtp');
      assert.ok(smtpCall);
      assert.deepStrictEqual(smtpCall.arguments[1], {
        method: 'POST',
        body: { email: 'admin@example.com' },
      });
    });

    // Check that Save & Continue button is enabled (since hmac, app_url, email are all valid and stripe is not required)
    const continueBtn = screen.getByText('Save & Continue') as HTMLButtonElement;
    assert.strictEqual(continueBtn.disabled, false);

    fireEvent.click(continueBtn);
    assert.strictEqual(onSuccessSpy.mock.callCount(), 1);
  });
});
