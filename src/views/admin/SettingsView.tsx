import { useEffect, useMemo, useState } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { settingsService } from '../../services/settingsService';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [initialChoirName, setInitialChoirName] = useState('');
  const [initialTimezone, setInitialTimezone] = useState('America/New_York');

  useEffect(() => {
    const load = async () => {
      const [loadedChoirName, loadedTimezone] = await Promise.all([
        settingsService.getChoirName(),
        settingsService.getTimezone()
      ]);
      setChoirName(loadedChoirName);
      setInitialChoirName(loadedChoirName);
      setTimezone(loadedTimezone);
      setInitialTimezone(loadedTimezone);
      setIsLoading(false);
    };

    load().catch(() => {
      setMessage('Could not load system settings.');
      setIsLoading(false);
    });
  }, []);

  const isDirty = useMemo(() => {
    return calculateSettingsDirty(
      { choirName: initialChoirName, timezone: initialTimezone },
      { choirName, timezone }
    );
  }, [initialChoirName, choirName, initialTimezone, timezone]);

  const handleGlobalDiscard = () => {
    setChoirName(initialChoirName);
    setTimezone(initialTimezone);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      await Promise.all([
        settingsService.saveChoirName(choirName),
        settingsService.saveTimezone(timezone)
      ]);
      setContextChoirName(choirName);
      setContextTimezone(timezone);
      setInitialChoirName(choirName);
      setInitialTimezone(timezone);
      setMessage('System settings saved.');
      await dialog.showMessage({ title: 'Success', message: 'System settings saved successfully.' });
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

      <FloatingSaveBar 
        isDirty={isDirty} 
        isSaving={isSaving} 
        onSave={handleSave} 
        onDiscard={handleGlobalDiscard} 
      />
    </div>
  );
}
