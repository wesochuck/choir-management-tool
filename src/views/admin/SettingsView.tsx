import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { AppCard } from '../../components/common/AppCard';
import { pb } from '../../lib/pocketbase';
import { settingsService, queueSettingsService } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useDialog } from '../../contexts/DialogContext';
import { calculateSettingsDirty } from '../../lib/settings/dirtyCheck';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';
import { LandingPageSettingsPanel } from '../../components/admin/LandingPageSettingsPanel';
import type { LandingPageSettingsPanelHandle } from '../../components/admin/LandingPageSettingsPanel';
import { Button, Select, Input, CopyButton } from '../../components/ui';

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Phoenix', label: 'Mountain Time (Arizona, no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'London, Greenwich Mean Time' },
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
  const { setChoirName: setContextChoirName, setTimezone: setContextTimezone } = useChoirSettings();
  const [choirName, setChoirName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [initialChoirName, setInitialChoirName] = useState('');
  const [initialTimezone, setInitialTimezone] = useState('America/New_York');
  const [initialHomepageUrl, setInitialHomepageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [initialLogoUrl, setInitialLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);
  const [landingDirty, setLandingDirty] = useState(false);
  const landingPanelRef = useRef<LandingPageSettingsPanelHandle>(null);
  const handleLandingDirtyChange = useCallback((dirty: boolean) => {
    setLandingDirty(dirty);
  }, []);

  const settingsQuery = useQuery({
    queryKey: queryKeys.choirSettings.all,
    queryFn: async () => {
      const [loadedChoirName, loadedTimezone, loadedHomepageUrl, loadedLogoUrl] = await Promise.all(
        [
          settingsService.getChoirName(),
          settingsService.getTimezone(),
          settingsService.getHomepageUrl(),
          settingsService.getLogoUrl(),
        ]
      );
      return { loadedChoirName, loadedTimezone, loadedHomepageUrl, loadedLogoUrl };
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const { loadedChoirName, loadedTimezone, loadedHomepageUrl, loadedLogoUrl } =
      settingsQuery.data;
    setChoirName(loadedChoirName);
    setInitialChoirName(loadedChoirName);
    setTimezone(loadedTimezone);
    setInitialTimezone(loadedTimezone);
    setHomepageUrl(loadedHomepageUrl);
    setInitialHomepageUrl(loadedHomepageUrl);
    setLogoUrl(loadedLogoUrl);
    setInitialLogoUrl(loadedLogoUrl);
  }, [settingsQuery.data]);

  const isLoading = settingsQuery.isLoading;

  const isDirty = useMemo(() => {
    const fieldsDirty = calculateSettingsDirty(
      { choirName: initialChoirName, timezone: initialTimezone, homepageUrl: initialHomepageUrl },
      { choirName, timezone, homepageUrl }
    );
    const logoDirty = logoFile !== null || isLogoRemoved;
    return fieldsDirty || logoDirty || landingDirty;
  }, [
    initialChoirName,
    choirName,
    initialTimezone,
    timezone,
    initialHomepageUrl,
    homepageUrl,
    logoFile,
    isLogoRemoved,
    landingDirty,
  ]);

  const handleGlobalDiscard = () => {
    setChoirName(initialChoirName);
    setTimezone(initialTimezone);
    setHomepageUrl(initialHomepageUrl);
    if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
    setLogoUrl(initialLogoUrl);
    setLogoFile(null);
    setIsLogoRemoved(false);
    landingPanelRef.current?.reset();
    setLandingDirty(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      const landingSettings = landingPanelRef.current?.getSettings();
      const heroChanges = landingPanelRef.current?.getHeroImageChanges();

      await Promise.all([
        choirName ? settingsService.saveChoirName(choirName) : Promise.resolve(),
        settingsService.saveTimezone(timezone),
        homepageUrl ? settingsService.saveHomepageUrl(homepageUrl) : Promise.resolve(),
        logoFile !== null
          ? settingsService.saveLogo(logoFile)
          : isLogoRemoved
            ? settingsService.saveLogo(null)
            : Promise.resolve(),
        landingSettings ? settingsService.saveLandingSettings(landingSettings) : Promise.resolve(),
        heroChanges?.removed
          ? settingsService.saveHeroImage(null)
          : heroChanges?.file
            ? settingsService.saveHeroImage(heroChanges.file)
            : Promise.resolve(),
      ]);

      const [newLogoUrl, newHeroUrl] = await Promise.all([
        logoFile ? settingsService.getLogoUrl() : Promise.resolve(logoUrl),
        heroChanges?.file || heroChanges?.removed
          ? settingsService.getHeroImageUrl()
          : Promise.resolve(null),
      ]);

      setContextChoirName(choirName);
      setContextTimezone(timezone);
      setInitialChoirName(choirName);
      setInitialTimezone(timezone);
      setInitialHomepageUrl(homepageUrl);
      if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
      if (logoFile) {
        setLogoUrl(newLogoUrl);
        setInitialLogoUrl(newLogoUrl);
      } else if (isLogoRemoved) {
        setLogoUrl(null);
        setInitialLogoUrl(null);
      }
      setLogoFile(null);
      setIsLogoRemoved(false);

      landingPanelRef.current?.markSaved(
        landingSettings ?? (await settingsService.getLandingSettings()),
        newHeroUrl
      );

      setMessage('System settings saved.');
      dialog.showToast('System settings saved successfully.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage(`Error: ${errMsg}`);
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to save system settings.',
        variant: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="mx-auto max-w-4xl p-6">Loading system settings...</div>;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 pb-24">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Configure global metadata, timezone options, organization logos, and email queue webhooks.
        </p>
      </div>

      {message && (
        <div className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold">
          {message}
        </div>
      )}

      <div className="flex flex-col gap-6">
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
            <p className="text-xs text-slate-500">
              Displayed in the browser tab title across all pages (e.g. "Roster Management - My
              Choir").
            </p>
          </div>
        </AppCard>

        <AppCard title="Organization Logo">
          <div className="flex items-center gap-6">
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
              <div className="flex items-center gap-2">
                <label className="bg-primary-light text-primary-deep hover:bg-primary-deep/10 inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-sans text-xs font-semibold transition-colors active:translate-y-px">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {logoUrl ? 'Replace Logo' : 'Upload Logo'}
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
                Displayed on public pages and the singer dashboard. PNG, JPG, SVG, or WebP formats
                are supported.
              </p>
            </div>
          </div>
        </AppCard>

        <AppCard title="Public Homepage URL">
          <div className="flex flex-col gap-2">
            <Input
              id="homepage-url"
              type="url"
              value={homepageUrl}
              onChange={(event) => setHomepageUrl(event.target.value)}
              placeholder="e.g. https://www.mychoir.org"
              className={inputClasses}
            />
            <p className="text-xs text-slate-500">
              The main public website address where applicants are redirected after submitting their
              audition sheet successfully.
            </p>
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
            <p className="text-xs text-slate-500">
              This timezone controls all event scheduling, display clocks, and email/SMS automatic
              reminders.
            </p>
          </div>
        </AppCard>

        <LandingPageSettingsPanel ref={landingPanelRef} onDirtyChange={handleLandingDirtyChange} />

        <QueueWebhookSettings />
      </div>

      <FloatingSaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onDiscard={handleGlobalDiscard}
      />
    </div>
  );
}

function QueueWebhookSettings() {
  const dialog = useDialog();
  const [token, setToken] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const webhookQuery = useQuery({
    queryKey: queryKeys.queueWebhookSettings.all,
    queryFn: () => queueSettingsService.getSettings(),
  });

  useEffect(() => {
    if (webhookQuery.data) {
      setToken(webhookQuery.data.secret);
    }
  }, [webhookQuery.data]);

  const isLoading = webhookQuery.isLoading || isGenerating;

  const handleGenerate = async () => {
    const confirmed = await dialog.confirm({
      title: 'Revoke Token?',
      message:
        'Generating a new token revokes the old one. Update the PocketHost configuration immediately.',
      confirmLabel: 'Regenerate',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsGenerating(true);
    try {
      const data = await queueSettingsService.generateToken();
      setToken(data.secret);
    } catch {
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to generate token',
        variant: 'danger',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const pbBaseUrl = (pb.baseUrl || window.location.origin).replace(/\/+$/, '');
  const webhookUrl = `${pbBaseUrl}/api/queue/process?token=${token}`;

  if (isLoading)
    return <div className="text-xs text-slate-400">Loading queue configurations...</div>;

  return (
    <AppCard title="Email Queue Webhook">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-slate-500">
          PocketHost triggers this URL to process single-recipient messages sequentially in the
          background.
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-700" htmlFor="webhook-url">
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
            >
              Copy Link
            </CopyButton>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="text-xs text-slate-500">
            <strong>Status:</strong>{' '}
            {token ? (
              <span className="font-semibold text-emerald-700">
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
