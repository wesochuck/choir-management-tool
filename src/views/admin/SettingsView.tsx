import { useEffect, useMemo, useState } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { pb } from '../../lib/pocketbase';
import { settingsService, queueSettingsService } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useDialog } from '../../contexts/DialogContext';
import { calculateSettingsDirty } from '../../lib/settings/dirtyCheck';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';

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
      'Australia/Sydney'
    ];
  }
})();

export default function SettingsView() {
  const dialog = useDialog();
  const { setChoirName: setContextChoirName, setTimezone: setContextTimezone } = useChoirSettings();
  const [choirName, setChoirName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [initialChoirName, setInitialChoirName] = useState('');
  const [initialTimezone, setInitialTimezone] = useState('America/New_York');
  const [initialHomepageUrl, setInitialHomepageUrl] = useState('');

  useEffect(() => {
    const load = async () => {
      const [loadedChoirName, loadedTimezone, loadedHomepageUrl] = await Promise.all([
        settingsService.getChoirName(),
        settingsService.getTimezone(),
        settingsService.getHomepageUrl()
      ]);
      setChoirName(loadedChoirName);
      setInitialChoirName(loadedChoirName);
      setTimezone(loadedTimezone);
      setInitialTimezone(loadedTimezone);
      setHomepageUrl(loadedHomepageUrl);
      setInitialHomepageUrl(loadedHomepageUrl);
      setIsLoading(false);
    };

    load().catch(() => {
      setMessage('Could not load system settings.');
      setIsLoading(false);
    });
  }, []);

  const isDirty = useMemo(() => {
    return calculateSettingsDirty(
      { choirName: initialChoirName, timezone: initialTimezone, homepageUrl: initialHomepageUrl },
      { choirName, timezone, homepageUrl }
    );
  }, [initialChoirName, choirName, initialTimezone, timezone, initialHomepageUrl, homepageUrl]);

  const handleGlobalDiscard = () => {
    setChoirName(initialChoirName);
    setTimezone(initialTimezone);
    setHomepageUrl(initialHomepageUrl);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      await Promise.all([
        settingsService.saveChoirName(choirName),
        settingsService.saveTimezone(timezone),
        settingsService.saveHomepageUrl(homepageUrl)
      ]);
      setContextChoirName(choirName);
      setContextTimezone(timezone);
      setInitialChoirName(choirName);
      setInitialTimezone(timezone);
      setInitialHomepageUrl(homepageUrl);
      setMessage('System settings saved.');
      dialog.showToast('System settings saved successfully.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage(`Error: ${errMsg}`);
      await dialog.showMessage({ title: 'Error', message: 'Failed to save system settings.', variant: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: 'var(--space-xl)' }}>Loading system settings...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>System Settings</h1>
      </div>

      {message && <div className="badge badge-rehearsal" style={{ alignSelf: 'flex-start' }}>{message}</div>}

      <AppCard title="Choir Name">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label" htmlFor="choir-name">Organization Name</label>
          <input
            id="choir-name"
            type="text"
            value={choirName}
            onChange={(event) => setChoirName(event.target.value)}
            placeholder="e.g. Downtown Community Chorale"
            className="card"
            style={{ width: '100%', maxWidth: '400px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          />
          <p className="text-muted" style={{ margin: 0 }}>
            Displayed in the browser tab title across all pages (e.g. "Roster Management - My Choir").
          </p>
        </div>
      </AppCard>

      <AppCard title="Public Homepage URL">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label" htmlFor="homepage-url">Homepage Address</label>
          <input
            id="homepage-url"
            type="url"
            value={homepageUrl}
            onChange={(event) => setHomepageUrl(event.target.value)}
            placeholder="e.g. https://www.mychoir.org"
            className="card"
            style={{ width: '100%', maxWidth: '400px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          />
          <p className="text-muted" style={{ margin: 0 }}>
            The main public website address where applicants are redirected after submitting their audition sheet successfully.
          </p>
        </div>
      </AppCard>

      <AppCard title="Choir Timezone">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label" htmlFor="choir-timezone">Active Timezone</label>
          <select
            id="choir-timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="card"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0 12px',
              height: '40px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--card-bg, #ffffff)',
              color: 'inherit',
              cursor: 'pointer'
            }}
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
          </select>
          <p className="text-muted" style={{ margin: 0 }}>
            This timezone controls all event scheduling, display clocks, and email/SMS automatic reminders.
          </p>
        </div>
      </AppCard>

      <QueueWebhookSettings />

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
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const loadSettings = async () => {
    try {
      const data = await queueSettingsService.getSettings();
      setToken(data.secret);
    } catch (err) {
      console.error('Failed to load webhook settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleGenerate = async () => {
    if (!window.confirm('Generating a new token revokes the old one. Update the PocketHost configuration immediately.')) {
      return;
    }
    setIsLoading(true);
    try {
      const data = await queueSettingsService.generateToken();
      setToken(data.secret);
    } catch {
      alert('Failed to generate token');
    } finally {
      setIsLoading(false);
    }
  };

  const pbBaseUrl = (pb.baseUrl || window.location.origin).replace(/\/+$/, '');
  const webhookUrl = `${pbBaseUrl}/api/queue/process?token=${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <div style={{ padding: 'var(--space-md) 0' }} className="text-muted">Loading queue configurations...</div>;

  return (
    <AppCard title="Email Queue Webhook">
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <p className="text-muted" style={{ margin: 0 }}>
          PocketHost triggers this URL to process single-recipient messages sequentially in the background.
        </p>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label" htmlFor="webhook-url">Target Webhook URL</label>
          <div className="flex-row" style={{ gap: 'var(--space-xs)', alignItems: 'center' }}>
            <input
              id="webhook-url"
              type="text"
              readOnly
              value={token ? webhookUrl : 'No token generated yet.'}
              className="card"
              style={{
                flex: 1,
                padding: '0 12px',
                height: '40px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--border-light, #f8fafc)',
                color: 'var(--text-muted)',
                fontSize: '14px'
              }}
            />
            <button
              type="button"
              disabled={!token}
              onClick={handleCopy}
              className="btn btn-secondary"
              style={{ height: '40px', whiteSpace: 'nowrap' }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--border-light, #f8fafc)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div className="text-muted" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            <strong>Status:</strong> {token ? `Active (${token.substring(0, 8)}...)` : 'Unassigned'}
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="btn btn-primary"
          >
            {token ? 'Regenerate Token' : 'Generate Token'}
          </button>
        </div>
      </div>
    </AppCard>
  );
}
