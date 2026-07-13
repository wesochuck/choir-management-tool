import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { AppCard } from '../../components/common/AppCard';
import { pb } from '../../lib/pocketbase';
import { settingsService, queueSettingsService } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useDialog } from '../../contexts/DialogContext';
import { calculateSettingsDirty } from '../../lib/settings/dirtyCheck';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';
import { pluralizeLabel } from '../../lib/labelHelpers';
import { Button, Select, Input, CopyButton, Checkbox } from '../../components/ui';
import { useSetup } from '../../contexts/SetupContext';

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Phoenix', label: 'Mountain Time (Arizona, no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'London, Greenwich Mean Mean' },
  { value: 'Europe/Paris', label: 'Paris, Central European Time' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Japan Standard Time' },
  { value: 'Australia/Sydney', label: 'Sydney, Eastern Australian Time' },
];

const ALL_SYSTEM_TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Australia/Sydney',
    ];
  }
})();

const inputClasses = 'max-w-lg';

export default function SettingsView() {
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const { enabledModules } = useSetup();
  const {
    setChoirName: setContextChoirName,
    setTimezone: setContextTimezone,
    setPerformerLabel: setContextPerformerLabel,
  } = useChoirSettings();
  const [choirName, setChoirName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [message, setMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);
  const [directoryEnabled, setDirectoryEnabled] = useState(true);
  const [performerLabel, setPerformerLabel] = useState('Performer');
  const performerLabelPlural = pluralizeLabel(performerLabel);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        choirName ? settingsService.saveChoirName(choirName) : Promise.resolve(),
        settingsService.saveTimezone(timezone),
        settingsService.savePerformerLabel(performerLabel),
        settingsService.saveDirectorySettings({ enabled: directoryEnabled }),
        logoFile
          ? settingsService.saveLogo(logoFile)
          : logoUrl === null
            ? settingsService.saveLogo(null)
            : Promise.resolve(),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.choirSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.appSettings.directory });
      setMessage('Settings saved successfully');
    },
    onError: (err: unknown) => {
      setMessage(err instanceof Error ? err.message : 'Failed to save settings');
    },
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.choirSettings.admin,
    queryFn: async () => {
      const [
        loadedChoirName,
        loadedTimezone,
        loadedLogoUrl,
        loadedDirectorySettings,
        loadedPerformerLabel,
      ] = await Promise.all([
        settingsService.getChoirName(),
        settingsService.getTimezone(),
        settingsService.getLogoUrl(),
        settingsService.getDirectorySettings(),
        settingsService.getPerformerLabel(),
      ]);
      return {
        loadedChoirName,
        loadedTimezone,
        loadedLogoUrl,
        loadedDirectorySettings,
        loadedPerformerLabel,
      };
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const {
      loadedChoirName,
      loadedTimezone,
      loadedLogoUrl,
      loadedDirectorySettings,
      loadedPerformerLabel,
    } = settingsQuery.data;
    setChoirName(loadedChoirName);
    setTimezone(loadedTimezone);
    setLogoUrl(loadedLogoUrl);
    setDirectoryEnabled(loadedDirectorySettings?.enabled ?? true);
    setPerformerLabel(loadedPerformerLabel ?? 'Performer');
  }, [settingsQuery.data]);

  const isLoading = settingsQuery.isLoading;

  const settingsData = settingsQuery.data;
  const isDirty = useMemo(() => {
    const fieldsDirty = calculateSettingsDirty(
      {
        choirName: settingsData?.loadedChoirName ?? '',
        timezone: settingsData?.loadedTimezone ?? 'America/New_York',
      },
      { choirName, timezone }
    );
    const directoryDirty =
      directoryEnabled !== (settingsData?.loadedDirectorySettings?.enabled ?? true);
    const logoDirty = logoFile !== null || isLogoRemoved;
    const labelDirty = performerLabel !== (settingsData?.loadedPerformerLabel ?? 'Performer');
    return fieldsDirty || directoryDirty || logoDirty || labelDirty;
  }, [
    settingsData,
    choirName,
    timezone,
    directoryEnabled,
    logoFile,
    isLogoRemoved,
    performerLabel,
  ]);

  const handleGlobalDiscard = () => {
    setChoirName(settingsData?.loadedChoirName ?? '');
    setTimezone(settingsData?.loadedTimezone ?? 'America/New_York');
    setDirectoryEnabled(settingsData?.loadedDirectorySettings?.enabled ?? true);
    setPerformerLabel(settingsData?.loadedPerformerLabel ?? 'Performer');
    if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
    setLogoUrl(settingsData?.loadedLogoUrl ?? null);
    setLogoFile(null);
    setIsLogoRemoved(false);
  };

  const handleSave = async () => {
    setMessage('');

    try {
      await saveSettingsMutation.mutateAsync();

      const newLogoUrl = logoFile ? await settingsService.getLogoUrl() : logoUrl;

      setContextChoirName(choirName);
      setContextTimezone(timezone);
      setContextPerformerLabel(performerLabel);
      if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
      if (logoFile) {
        setLogoUrl(newLogoUrl);
      } else if (isLogoRemoved) {
        setLogoUrl(null);
      }
      setLogoFile(null);
      setIsLogoRemoved(false);

      dialog.showToast('System settings saved successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save system settings.';
      await dialog.showMessage({
        title: 'Error',
        message,
        variant: 'danger',
      });
    }
  };

  if (isLoading) return <div className="mx-auto max-w-4xl p-6">Loading system settings...</div>;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 pb-24">
      <div>
        <h1 className="text-text text-4xl font-bold tracking-tight">System Settings</h1>
        <p className="text-text-muted mt-2 text-sm">
          Configure global metadata, timezone options, organization logos, and email queue webhooks.
          {enabledModules.has('publicWebsite') && (
            <>
              {' '}
              Public-facing website settings live under{' '}
              <a href="/admin/website" className="text-primary hover:text-primary-deep underline">
                Public Website
              </a>
              .
            </>
          )}
        </p>
      </div>

      {message && (
        <div className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold">
          {message}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <AppCard title="First-Run & Modules">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/admin/settings/setup-checklist"
              className="bg-bg hover:border-primary hover:bg-primary-light hover:text-primary-deep inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-800 no-underline transition-all duration-200"
            >
              📋 Setup Checklist
            </Link>
            <Link
              to="/admin/settings/modules"
              className="bg-bg hover:border-primary hover:bg-primary-light hover:text-primary-deep inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-800 no-underline transition-all duration-200"
            >
              ⚙️ Enable/Disable Modules
            </Link>
          </div>
        </AppCard>

        <AppCard title="Choir Name">
          <div className="flex flex-col gap-2">
            <Input
              id="choir-name"
              type="text"
              value={choirName}
              onChange={(event) => setChoirName(event.target.value)}
              placeholder="e.g. Downtown Community Chorale"
              className={inputClasses}
            />
            <p className="text-text-muted text-xs">
              Displayed in the browser tab title across all pages (e.g. "Roster Management - My
              Choir").
            </p>
          </div>
        </AppCard>

        <AppCard title="Organization Logo">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Organization logo preview"
                  className="size-full object-contain p-2"
                />
              ) : (
                <svg
                  className="size-10 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18M10.5 3.75h3v3h-3v-3z"
                  />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="bg-primary-light text-primary-deep hover:bg-primary-deep/10 inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-sans text-xs font-semibold transition-colors active:translate-y-px">
                  <span aria-hidden="true">⬆️</span>
                  <span>{logoUrl ? 'Replace Logo' : 'Upload Logo'}</span>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        dialog.showToast('File size must be under 5MB');
                        return;
                      }
                      if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
                      setLogoFile(file);
                      setIsLogoRemoved(false);
                      setLogoUrl(URL.createObjectURL(file));
                    }}
                  />
                </label>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="danger"
                    size="small"
                    onClick={() => {
                      setLogoFile(null);
                      setIsLogoRemoved(true);
                      setLogoUrl(null);
                    }}
                  >
                    Remove Logo
                  </Button>
                )}
              </div>
              <p className="max-w-md text-xs leading-normal text-slate-500">
                Displayed on public pages and the {performerLabel.toLowerCase()} dashboard. PNG,
                JPG, SVG, or WebP formats are supported.
              </p>
            </div>
          </div>
        </AppCard>

        <AppCard title="Choir Timezone">
          <div className="flex flex-col gap-2">
            <Select
              id="choir-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="max-w-lg"
            >
              <optgroup label="Common Timezones">
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={`common-${tz.value}`} value={tz.value}>
                    {tz.label} ({tz.value})
                  </option>
                ))}
              </optgroup>
              <optgroup label="All System Timezones">
                {ALL_SYSTEM_TIMEZONES.map((tz) => (
                  <option key={`all-${tz}`} value={tz}>
                    {tz}
                  </option>
                ))}
              </optgroup>
            </Select>
            <p className="text-text-muted text-xs">
              This timezone controls all event scheduling, display clocks, and email/SMS automatic
              reminders.
            </p>
          </div>
        </AppCard>

        <AppCard title="Participant Label">
          <div className="flex flex-col gap-2">
            <Input
              id="performer-label"
              type="text"
              value={performerLabel}
              onChange={(event) => setPerformerLabel(event.target.value)}
              placeholder="e.g. Performer"
              className={inputClasses}
            />
            <p className="text-text-muted text-xs">
              Label used throughout the app for participants (shown as "Add Performer", "Performer
              Dashboard", "No performers found", etc.). Default: "Performer".
            </p>
          </div>
        </AppCard>

        <AppCard title={`${performerLabel} Directory`}>
          <div className="flex flex-col gap-2">
            <Checkbox
              id="enable-directory"
              checked={directoryEnabled}
              onChange={(event) => setDirectoryEnabled(event.target.checked)}
            >
              Enable {performerLabel} Directory
            </Checkbox>
            <p className="text-text-muted text-xs">
              Allow {performerLabelPlural.toLowerCase()} to see the directory of all active members.
              Admins always retain preview access.
            </p>
          </div>
        </AppCard>

        <QueueWebhookSettings setMessage={setMessage} />
      </div>

      <FloatingSaveBar
        isDirty={isDirty}
        isSaving={saveSettingsMutation.isPending}
        onSave={handleSave}
        onDiscard={handleGlobalDiscard}
      />
    </div>
  );
}

function QueueWebhookSettings({ setMessage }: { setMessage: (msg: string) => void }) {
  const dialog = useDialog();
  const [token, setToken] = useState<string>('');

  const generateTokenMutation = useMutation({
    mutationFn: () => queueSettingsService.generateToken(),
    onSuccess: (data) => {
      setToken(data.secret);
      setMessage('');
    },
    onError: (err: unknown) => {
      setMessage(err instanceof Error ? err.message : 'Failed to generate token');
    },
  });

  const webhookQuery = useQuery({
    queryKey: queryKeys.queueWebhookSettings.all,
    queryFn: () => queueSettingsService.getSettings(),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (webhookQuery.data) {
      setToken(webhookQuery.data.secret);
    }
  }, [webhookQuery.data]);

  const isLoading = webhookQuery.isLoading || generateTokenMutation.isPending;

  const handleGenerate = async () => {
    const confirmed = await dialog.confirm({
      title: 'Revoke Token?',
      message:
        'Generating a new token revokes the old one. Update the PocketHost configuration immediately.',
      confirmLabel: 'Regenerate',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await generateTokenMutation.mutateAsync();
    } catch {
      // Error handled by mutation onError
    }
  };

  const pbBaseUrl = (pb.baseUrl || window.location.origin).replace(/\/+$/, '');
  const webhookUrl = `${pbBaseUrl}/api/queue/process?token=${token}`;

  if (isLoading)
    return <div className="text-text-muted text-xs">Loading queue configurations...</div>;

  return (
    <AppCard title="Email Queue Webhook">
      <div className="flex flex-col gap-4">
        <p className="text-text-muted text-xs">
          PocketHost triggers this URL to process single-recipient messages sequentially in the
          background.
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-text text-xs font-semibold" htmlFor="webhook-url">
            Target Webhook URL
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="webhook-url"
              type="text"
              readOnly
              value={token ? webhookUrl : 'No token generated yet.'}
              className="block w-full max-w-lg flex-1"
            />
            <CopyButton
              value={webhookUrl}
              disabled={!token}
              className={`${!token ? 'cursor-not-allowed opacity-50' : ''}`}
            />
            <span className="text-text-muted hidden text-xs md:inline">Copy Link</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="text-text-muted text-xs">
            <strong>Status:</strong>{' '}
            {token ? (
              <span className="text-success-text font-semibold">
                Active ({token.substring(0, 8)}...)
              </span>
            ) : (
              <span className="text-slate-400">Unassigned</span>
            )}
          </div>
          <Button type="button" onClick={handleGenerate} variant="secondary" size="small">
            {token ? 'Regenerate Token' : 'Generate Token'}
          </Button>
        </div>
      </div>
    </AppCard>
  );
}
