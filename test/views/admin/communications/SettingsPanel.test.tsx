// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { SettingsPanel } from '../../../../src/views/admin/communications/SettingsPanel';
import type { CommunicationConfig } from '../../../../src/views/admin/communications/communicationSettingsForm';

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

const defaultConfig: CommunicationConfig = {
  physicalAddress: '123 Choir St',
  baseUrl: 'https://choir.example.com',
  defaultSmsCountryCode: 'US',
  emailProvider: 'smtp',
  brevoApiKey: 'brevo-123',
  testEmail: 'test@example.com',
  testPhone: '+15555555555',
};

describe('SettingsPanel', () => {
  it('renders General, Delivery, and Connection sections with correct labels', () => {
    render(
      <SettingsPanel
        config={defaultConfig}
        isSaving={false}
        saveError={null}
        onSave={mock.fn(async () => {})}
        onSendTestEmail={mock.fn(async () => {})}
        onSendTestSms={mock.fn(async () => {})}
      />
    );

    for (const heading of ['General & Compliance', 'Delivery Provider', 'Connection Tests']) {
      assert.ok(screen.getByText(heading));
    }
    assert.ok(screen.getByLabelText('Physical mailing address'));
    assert.ok(screen.getByLabelText('Application base URL'));
    assert.ok(screen.getByLabelText('Default SMS country code'));
    assert.ok(screen.getByLabelText('Test email address'));
    assert.ok(screen.getByLabelText('Test phone number'));
  });

  it('manages dirty state, cancels changes, and saves direct payload', async () => {
    const onSave = mock.fn(async () => {});
    render(
      <SettingsPanel
        config={defaultConfig}
        isSaving={false}
        saveError={null}
        onSave={onSave}
        onSendTestEmail={mock.fn(async () => {})}
        onSendTestSms={mock.fn(async () => {})}
      />
    );

    // Sticky bar should not be visible when clean
    assert.strictEqual(screen.queryByText('Unsaved changes'), null);

    // Edit address to make dirty
    const addressInput = screen.getByLabelText('Physical mailing address') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(addressInput, { target: { value: '456 Sing Rd' } });
    });

    // Sticky bar should now be visible
    assert.ok(screen.getByText('Unsaved changes'));

    // Cancel changes
    const cancelButton = screen.getByRole('button', { name: 'Cancel changes' });
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    // Input should be restored and sticky bar hidden
    assert.strictEqual(addressInput.value, '123 Choir St');
    assert.strictEqual(screen.queryByText('Unsaved changes'), null);

    // Edit again and save
    await act(async () => {
      fireEvent.change(addressInput, { target: { value: '456 Sing Rd' } });
    });
    const saveButton = screen.getByRole('button', { name: 'Save settings' });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    assert.strictEqual(onSave.mock.callCount(), 1);
    assert.deepEqual(onSave.mock.calls[0].arguments[0], {
      ...defaultConfig,
      physicalAddress: '456 Sing Rd',
    });
  });

  it('triggers send test email and displays success/error feedback', async () => {
    const onSendTestEmail = mock.fn(async () => {});
    const { waitFor } = await import('@testing-library/react');
    render(
      <SettingsPanel
        config={defaultConfig}
        isSaving={false}
        saveError={null}
        onSave={mock.fn(async () => {})}
        onSendTestEmail={onSendTestEmail}
        onSendTestSms={mock.fn(async () => {})}
      />
    );

    const testEmailInput = screen.getByLabelText('Test email address') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(testEmailInput, { target: { value: 'target@example.com' } });
    });

    const sendEmailButton = screen.getByRole('button', { name: 'Send Test Email' });

    // Success scenario
    await act(async () => {
      fireEvent.click(sendEmailButton);
    });
    assert.strictEqual(onSendTestEmail.mock.callCount(), 1);
    assert.strictEqual(onSendTestEmail.mock.calls[0].arguments[0], 'target@example.com');
    await waitFor(() => {
      assert.ok(screen.getByText(/Test email sent successfully/i));
    });

    // Error scenario
    const failingSendTestEmail = mock.fn(async () => {
      throw new Error('SMTP connection refused');
    });
    cleanup();
    render(
      <SettingsPanel
        config={defaultConfig}
        isSaving={false}
        saveError={null}
        onSave={mock.fn(async () => {})}
        onSendTestEmail={failingSendTestEmail}
        onSendTestSms={mock.fn(async () => {})}
      />
    );

    const failingSendEmailButton = screen.getByRole('button', { name: 'Send Test Email' });
    await act(async () => {
      fireEvent.click(failingSendEmailButton);
    });
    await waitFor(() => {
      assert.ok(screen.getByText(/SMTP Connection Failed: SMTP connection refused/i));
    });
  });

  it('triggers send test SMS and displays success/error feedback', async () => {
    const onSendTestSms = mock.fn(async () => {});
    const { waitFor } = await import('@testing-library/react');
    render(
      <SettingsPanel
        config={defaultConfig}
        isSaving={false}
        saveError={null}
        onSave={mock.fn(async () => {})}
        onSendTestEmail={mock.fn(async () => {})}
        onSendTestSms={onSendTestSms}
      />
    );

    const testPhoneInput = screen.getByLabelText('Test phone number') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(testPhoneInput, { target: { value: '+15550009999' } });
    });

    const sendSmsButton = screen.getByRole('button', { name: 'Send Test SMS' });

    // Success scenario
    await act(async () => {
      fireEvent.click(sendSmsButton);
    });
    assert.strictEqual(onSendTestSms.mock.callCount(), 1);
    assert.strictEqual(onSendTestSms.mock.calls[0].arguments[0], '+15550009999');
    await waitFor(() => {
      assert.ok(screen.getByText(/Test SMS sent successfully/i));
    });

    // Error scenario
    const failingSendTestSms = mock.fn(async () => {
      throw new Error('SMS quota exceeded');
    });
    cleanup();
    render(
      <SettingsPanel
        config={defaultConfig}
        isSaving={false}
        saveError={null}
        onSave={mock.fn(async () => {})}
        onSendTestEmail={mock.fn(async () => {})}
        onSendTestSms={failingSendTestSms}
      />
    );

    const failingSendSmsButton = screen.getByRole('button', { name: 'Send Test SMS' });
    await act(async () => {
      fireEvent.click(failingSendSmsButton);
    });
    await waitFor(() => {
      assert.ok(screen.getByText(/SMS Connection Failed: SMS quota exceeded/i));
    });
  });
});
