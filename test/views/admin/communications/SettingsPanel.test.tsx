// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SettingsPanel } from '../../../../src/views/admin/communications/SettingsPanel';
import type { CommunicationSettings } from '../../../../src/services/settingsService';

afterEach(() => cleanup());

const baseSettings = {
  defaultCountryCode: '1',
  mailingAddress: 'Original Address',
  frontendUrl: 'https://choir.example.com',
} as CommunicationSettings;

function makeProps(
  commSettings: CommunicationSettings,
  onSaveSettings = mock.fn(async () => true)
) {
  return {
    commSettings,
    setCommSettings: mock.fn(),
    testEmailAddress: 'admin@example.com',
    setTestEmailAddress: mock.fn(),
    isTestingSmtp: false,
    onSendConnectionTest: mock.fn(async () => {}),
    testPhoneNumber: '5551234567',
    setTestPhoneNumber: mock.fn(),
    isTestingSms: false,
    onSendSmsTest: mock.fn(async () => {}),
    emailProvider: 'smtp' as const,
    setEmailProvider: mock.fn(),
    brevoApiKey: '',
    setBrevoApiKey: mock.fn(),
    isSavingConfig: false,
    onSaveSettings,
  };
}

describe('SettingsPanel', () => {
  it('preserves unsaved local edits when settings props refetch', () => {
    const { rerender } = render(<SettingsPanel {...makeProps(baseSettings)} />);
    const mailingAddress = screen.getByLabelText('Physical Mailing Address');
    fireEvent.change(mailingAddress, { target: { value: 'Unsaved Address' } });

    rerender(
      <SettingsPanel
        {...makeProps({ ...baseSettings, mailingAddress: 'Background Refetch Address' })}
      />
    );

    assert.equal(
      (screen.getByLabelText('Physical Mailing Address') as HTMLInputElement).value,
      'Unsaved Address'
    );
  });

  it('associates settings and connection-test labels with their controls', () => {
    render(<SettingsPanel {...makeProps(baseSettings)} />);

    for (const label of [
      'Default Country Code (SMS)',
      'Physical Mailing Address',
      'Application Base URL',
      'Test Email Address',
      'Test Phone Number',
    ]) {
      assert.ok(screen.getByLabelText(label));
    }
  });

  it('saves the current local settings snapshot', async () => {
    const onSaveSettings = mock.fn(async (..._args: unknown[]) => true);
    const props = makeProps(baseSettings, onSaveSettings);
    render(<SettingsPanel {...props} />);
    fireEvent.change(screen.getByLabelText('Physical Mailing Address'), {
      target: { value: 'Saved Address' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

    await waitFor(() => assert.equal(onSaveSettings.mock.callCount(), 1));
    assert.equal(
      (onSaveSettings.mock.calls[0]?.arguments[0] as CommunicationSettings).mailingAddress,
      'Saved Address'
    );
    assert.equal(props.setCommSettings.mock.callCount(), 1);
  });

  it('does not publish rejected settings into the application cache', async () => {
    const onSaveSettings = mock.fn(async () => false);
    const props = makeProps(baseSettings, onSaveSettings);
    render(<SettingsPanel {...props} />);

    fireEvent.change(screen.getByLabelText('Physical Mailing Address'), {
      target: { value: 'Rejected Address' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

    await waitFor(() => assert.equal(onSaveSettings.mock.callCount(), 1));
    assert.equal(props.setCommSettings.mock.callCount(), 0);
  });
});
