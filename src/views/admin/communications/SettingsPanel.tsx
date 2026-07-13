import React, { useEffect, useState } from 'react';
import { AppCard } from '../../../components/common/AppCard';
import type { CommunicationSettings } from '../../../services/settingsService';

import { Button, Input, Select } from '../../../components/ui';

export interface SettingsPanelProps {
  commSettings: CommunicationSettings;
  setCommSettings: React.Dispatch<React.SetStateAction<CommunicationSettings>>;
  testEmailAddress: string;
  setTestEmailAddress: (value: string) => void;
  isTestingSmtp: boolean;
  onSendConnectionTest: () => Promise<void>;
  testPhoneNumber: string;
  setTestPhoneNumber: (value: string) => void;
  isTestingSms: boolean;
  onSendSmsTest: () => Promise<void>;
  emailProvider: 'smtp' | 'brevo';
  setEmailProvider: (value: 'smtp' | 'brevo') => void;
  brevoApiKey: string;
  setBrevoApiKey: (value: string) => void;
  isSavingConfig: boolean;
  onSaveSettings: () => Promise<void>;
}

export function SettingsPanel({
  commSettings,
  setCommSettings,
  testEmailAddress,
  setTestEmailAddress,
  isTestingSmtp,
  onSendConnectionTest,
  testPhoneNumber,
  setTestPhoneNumber,
  isTestingSms,
  onSendSmsTest,
  emailProvider,
  setEmailProvider,
  brevoApiKey,
  setBrevoApiKey,
  isSavingConfig,
  onSaveSettings,
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<CommunicationSettings>(commSettings);

  useEffect(() => {
    setLocalSettings(commSettings);
  }, [commSettings]);

  const handleSave = async () => {
    setCommSettings(localSettings);
    await onSaveSettings();
  };

  return (
    <div className="flex flex-col gap-4">
      <AppCard title="Application & Regional Settings">
        <div className="flex flex-col gap-4">
          <SettingsGrid>
            <Field
              label="Default Country Code (SMS)"
              value={localSettings.defaultCountryCode || '1'}
              onChange={(v) => setLocalSettings((prev) => ({ ...prev, defaultCountryCode: v }))}
              placeholder="e.g. 1"
            />
            <Field
              label="Physical Mailing Address"
              value={localSettings.mailingAddress}
              onChange={(v) => setLocalSettings((prev) => ({ ...prev, mailingAddress: v }))}
            />
            <Field
              label="Application Base URL"
              value={localSettings.frontendUrl}
              onChange={(v) => setLocalSettings((prev) => ({ ...prev, frontendUrl: v }))}
            />
          </SettingsGrid>
          <div className="text-muted text-xs">
            Note: These values are used for legal compliance (footer), link generation, and outgoing
            SMS formatting.
          </div>
        </div>
      </AppCard>

      <AppCard title="Email Provider">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email-provider-select" className="text-text text-xs font-semibold">
              Select Outgoing Email Provider
            </label>
            <Select
              id="email-provider-select"
              value={emailProvider}
              onChange={(event) => setEmailProvider(event.target.value as 'smtp' | 'brevo')}
              className="max-w-lg"
            >
              <option value="smtp">Built-in SMTP (SMTP2GO)</option>
              <option value="brevo">Brevo Transactional API (Email & SMS)</option>
            </Select>
            <p className="text-text-muted text-xs">
              Note: The <strong>Sender Name</strong> and <strong>Sender Address</strong> for all
              outgoing messages are configured in the core PocketBase Admin dashboard under{' '}
              <em>Settings &rarr; Mail settings</em>.
            </p>
          </div>

          {emailProvider === 'brevo' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="brevo-api-key" className="text-text text-xs font-semibold">
                Brevo API Key
              </label>
              <Input
                id="brevo-api-key"
                type="password"
                value={brevoApiKey}
                onChange={(event) => setBrevoApiKey(event.target.value)}
                placeholder="xkeysib-..."
                className="max-w-lg"
              />
              <p className="text-text-muted text-xs">
                Enter your Brevo Transactional SMS and SMTP API key.
              </p>
            </div>
          )}
        </div>
      </AppCard>

      <AppCard title="Test Outgoing Connections">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-muted text-sm">
              Send a quick test email using the active provider settings to verify delivery.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Input
                className="max-w-[300px] flex-1"
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="e.g. test@example.com"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onSendConnectionTest}
                disabled={isTestingSmtp || !testEmailAddress}
              >
                {isTestingSmtp ? 'Sending Test...' : '🧪 Send Test Email'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-muted text-sm">
              Send a quick test SMS using the active provider settings to verify delivery.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Input
                className="max-w-[300px] flex-1"
                type="tel"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="e.g. 5551234567"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onSendSmsTest}
                disabled={isTestingSms || !testPhoneNumber}
              >
                {isTestingSms ? 'Sending Test...' : '📱 Send Test SMS'}
              </Button>
            </div>
          </div>
        </div>
      </AppCard>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} disabled={isSavingConfig}>
          {isSavingConfig ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

function SettingsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">{children}</div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
