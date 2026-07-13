import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { AppCard } from '../../../components/common/AppCard';
import { Button, Input, Select } from '../../../components/ui';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import { isConfigEqual, type CommunicationConfig } from './communicationSettingsForm';

export interface SettingsPanelProps {
  config: CommunicationConfig;
  isSaving: boolean;
  saveError: unknown;
  onSave: (config: CommunicationConfig) => Promise<void>;
  onSendTestEmail: (email: string) => Promise<void>;
  onSendTestSms: (phone: string) => Promise<void>;
}

export function SettingsPanel({
  config,
  isSaving,
  saveError,
  onSave,
  onSendTestEmail,
  onSendTestSms,
}: SettingsPanelProps) {
  const [localConfig, setLocalConfig] = useState<CommunicationConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const isDirty = useMemo(() => {
    return !isConfigEqual(localConfig, config);
  }, [localConfig, config]);

  const handleCancel = () => {
    setLocalConfig(config);
  };

  const handleSave = async () => {
    await onSave(localConfig);
  };

  // Connection test states
  const [smtpStatus, setSmtpStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [smtpError, setSmtpError] = useState<string | null>(null);

  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [smsError, setSmsError] = useState<string | null>(null);

  const handleSendTestEmail = async () => {
    if (!localConfig.testEmail) return;
    setSmtpStatus('sending');
    setSmtpError(null);
    try {
      await onSendTestEmail(localConfig.testEmail);
      setSmtpStatus('success');
    } catch (err: unknown) {
      setSmtpStatus('error');
      setSmtpError(err instanceof Error ? err.message : formatPocketBaseError(err));
    }
  };

  const handleSendTestSms = async () => {
    if (!localConfig.testPhone) return;
    setSmsStatus('sending');
    setSmsError(null);
    try {
      await onSendTestSms(localConfig.testPhone);
      setSmsStatus('success');
    } catch (err: unknown) {
      setSmsStatus('error');
      setSmsError(err instanceof Error ? err.message : formatPocketBaseError(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AppCard title="General & Compliance">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="communications-mailing-address" className="text-label">
                Physical mailing address
              </label>
              <Input
                id="communications-mailing-address"
                value={localConfig.physicalAddress}
                onChange={(e) =>
                  setLocalConfig((prev) => ({ ...prev, physicalAddress: e.target.value }))
                }
                placeholder="123 Choir St, Harmony City"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="communications-base-url" className="text-label">
                Application base URL
              </label>
              <Input
                id="communications-base-url"
                value={localConfig.baseUrl}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://choir.example.com"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="communications-country-code" className="text-label">
                Default SMS country code
              </label>
              <Input
                id="communications-country-code"
                value={localConfig.defaultSmsCountryCode}
                onChange={(e) =>
                  setLocalConfig((prev) => ({ ...prev, defaultSmsCountryCode: e.target.value }))
                }
                placeholder="US"
              />
            </div>
          </div>
          <p className="text-text-muted text-xs">
            Note: These values are used for CAN-SPAM legal compliance footers, link generation, and
            outgoing SMS formatting.
          </p>
        </div>
      </AppCard>

      <AppCard title="Delivery Provider">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="communications-email-provider" className="text-label">
              Select Outgoing Email Provider
            </label>
            <div className="max-w-md py-[3px]">
              <Select
                id="communications-email-provider"
                value={localConfig.emailProvider}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    emailProvider: e.target.value as 'smtp' | 'brevo',
                  }))
                }
              >
                <option value="smtp">Built-in SMTP (SMTP2GO)</option>
                <option value="brevo">Brevo Transactional API (Email & SMS)</option>
              </Select>
            </div>
            <p className="text-text-muted text-xs">
              Note: The Sender Name and Sender Address for all outgoing messages are configured in
              the core PocketBase Admin dashboard under Settings → Mail settings.
            </p>
          </div>

          {localConfig.emailProvider === 'brevo' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="communications-brevo-key" className="text-label">
                Brevo API Key
              </label>
              <Input
                id="communications-brevo-key"
                type="password"
                value={localConfig.brevoApiKey}
                onChange={(e) =>
                  setLocalConfig((prev) => ({ ...prev, brevoApiKey: e.target.value }))
                }
                placeholder="xkeysib-..."
                className="max-w-md"
              />
              <p className="text-text-muted text-xs">
                Enter your Brevo Transactional SMS and SMTP API key.
              </p>
            </div>
          )}
        </div>
      </AppCard>

      <AppCard title="Connection Tests">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-text-muted text-sm">
              Send a quick test email using the active provider settings to verify delivery.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex max-w-[400px] min-w-[280px] flex-1 flex-col gap-1">
                <label htmlFor="communications-test-email" className="text-label">
                  Test email address
                </label>
                <Input
                  id="communications-test-email"
                  type="email"
                  value={localConfig.testEmail}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({ ...prev, testEmail: e.target.value }))
                  }
                  placeholder="e.g. test@example.com"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSendTestEmail}
                disabled={smtpStatus === 'sending' || !localConfig.testEmail}
              >
                {smtpStatus === 'sending' ? (
                  'Sending Test...'
                ) : (
                  <>
                    <span aria-hidden="true" className="mr-1.5">
                      🧪
                    </span>
                    <span>Send Test Email</span>
                  </>
                )}
              </Button>
            </div>
            {smtpStatus === 'success' && (
              <p className="text-xs font-semibold text-emerald-600" aria-live="polite">
                ✓ Test email sent successfully! Check your inbox.
              </p>
            )}
            {smtpStatus === 'error' && smtpError && (
              <p className="text-xs font-semibold text-rose-600" aria-live="polite">
                ⚠️ SMTP Connection Failed: {smtpError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-text-muted text-sm">
              Send a quick test SMS using the active provider settings to verify delivery.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex max-w-[400px] min-w-[280px] flex-1 flex-col gap-1">
                <label htmlFor="communications-test-phone" className="text-label">
                  Test phone number
                </label>
                <Input
                  id="communications-test-phone"
                  type="tel"
                  value={localConfig.testPhone}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({ ...prev, testPhone: e.target.value }))
                  }
                  placeholder="e.g. +15551234567"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSendTestSms}
                disabled={smsStatus === 'sending' || !localConfig.testPhone}
              >
                {smsStatus === 'sending' ? (
                  'Sending Test...'
                ) : (
                  <>
                    <span aria-hidden="true" className="mr-1.5">
                      📱
                    </span>
                    <span>Send Test SMS</span>
                  </>
                )}
              </Button>
            </div>
            {smsStatus === 'success' && (
              <p className="text-xs font-semibold text-emerald-600" aria-live="polite">
                ✓ Test SMS sent successfully!
              </p>
            )}
            {smsStatus === 'error' && smsError && (
              <p className="text-xs font-semibold text-rose-600" aria-live="polite">
                ⚠️ SMS Connection Failed: {smsError}
              </p>
            )}
          </div>
        </div>
      </AppCard>

      {(isDirty || isSaving || saveError) && (
        <div className="border-border bg-surface sticky bottom-0 z-40 -mx-3 flex items-center justify-between gap-3 border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_8px_rgba(0,0,0,0.08)] sm:-mx-6">
          <span className="text-text-muted text-sm" aria-live="polite">
            {isSaving
              ? 'Saving settings…'
              : saveError
                ? formatPocketBaseError(saveError)
                : 'Unsaved changes'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel changes
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving || !isDirty}>
              Save settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
