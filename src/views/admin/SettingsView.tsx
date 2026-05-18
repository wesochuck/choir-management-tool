import { useEffect, useState } from 'react';
import { AppCard } from '../../components/common/AppCard';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  DEFAULT_ATTENDANCE_SETTINGS,
  settingsService,
  type CommunicationSettings,
  type AttendanceSettings,
} from '../../services/settingsService';

export default function SettingsView() {
  const [communicationSettings, setCommunicationSettings] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const [communications, attendance] = await Promise.all([
        settingsService.getCommunicationSettings(),
        settingsService.getAttendanceSettings(),
      ]);
      setCommunicationSettings(communications);
      setAttendanceSettings(attendance);
      setIsLoading(false);
    };

    load().catch(() => {
      setMessage('Could not load settings.');
      setIsLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      await Promise.all([
        settingsService.saveCommunicationSettings(communicationSettings),
        settingsService.saveAttendanceSettings(attendanceSettings),
      ]);
      setMessage('Settings saved.');
    } catch {
      setMessage('Settings could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: 'var(--space-xl)' }}>Loading settings...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Settings</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message && <div className="badge badge-rehearsal" style={{ alignSelf: 'flex-start' }}>{message}</div>}

      <AppCard title="Email and Text Reminders">
        <p className="text-muted" style={{ margin: 0 }}>
          Messages use the device email and text apps. Available placeholders: {'{eventTitle}'}, {'{eventDate}'}, {'{eventLocation}'}, {'{eventDetails}'}.
        </p>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Email Subject</label>
          <input
            value={communicationSettings.emailSubject}
            onChange={(event) => setCommunicationSettings({ ...communicationSettings, emailSubject: event.target.value })}
            className="card"
            style={{ padding: '0 12px' }}
          />
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Email Body</label>
          <textarea
            value={communicationSettings.emailBody}
            onChange={(event) => setCommunicationSettings({ ...communicationSettings, emailBody: event.target.value })}
            className="card"
            style={{ minHeight: '160px', resize: 'vertical' }}
          />
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Text Message</label>
          <textarea
            value={communicationSettings.smsBody}
            onChange={(event) => setCommunicationSettings({ ...communicationSettings, smsBody: event.target.value })}
            className="card"
            style={{ minHeight: '96px', resize: 'vertical' }}
          />
        </div>
      </AppCard>

      <AppCard title="Attendance Settings">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Default Sorting Option</label>
          <select
            value={attendanceSettings.defaultSort}
            onChange={(event) => setAttendanceSettings({ defaultSort: event.target.value as 'lastName' | 'voicePart' })}
            className="card"
            style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="lastName">Last Name</option>
            <option value="voicePart">Voice Part + Last Name</option>
          </select>
          <p className="text-muted" style={{ margin: 0 }}>
            Choose the default sorting option used when opening the check-in sheet.
          </p>
        </div>
      </AppCard>
    </div>
  );
}
