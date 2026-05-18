import { useEffect, useState } from 'react';
import { AppCard } from '../../components/common/AppCard';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  settingsService,
  type AttendanceSettings,
  getVoiceParts,
  saveVoiceParts,
  type VoicePartDef,
} from '../../services/settingsService';

export default function SettingsView() {
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const attendance = await settingsService.getAttendanceSettings();
      setAttendanceSettings(attendance);
      const parts = await getVoiceParts();
      setVoiceParts(parts);
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
      await settingsService.saveAttendanceSettings(attendanceSettings);
      await saveVoiceParts(voiceParts);
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

      <AppCard title="Voice Part Configurations">
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <p className="text-muted" style={{ margin: 0 }}>
            Configure the custom voice parts for the choir (e.g. S1, Soprano 1).
          </p>

          <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
            {voiceParts.map((vp, index) => (
              <div key={index} className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
                <input
                  value={vp.label}
                  onChange={(e) => {
                    const newParts = [...voiceParts];
                    newParts[index] = { ...newParts[index], label: e.target.value };
                    setVoiceParts(newParts);
                  }}
                  placeholder="Label (e.g. S1)"
                  className="card"
                  style={{ width: '120px', padding: '0 12px', height: '40px' }}
                />
                <input
                  value={vp.fullName}
                  onChange={(e) => {
                    const newParts = [...voiceParts];
                    newParts[index] = { ...newParts[index], fullName: e.target.value };
                    setVoiceParts(newParts);
                  }}
                  placeholder="Full Name (e.g. Soprano 1)"
                  className="card"
                  style={{ flex: 1, padding: '0 12px', height: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setVoiceParts(voiceParts.filter((_, idx) => idx !== index));
                  }}
                  className="btn btn-danger btn-sm"
                  style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setVoiceParts([...voiceParts, { label: '', fullName: '' }])}
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-start' }}
          >
            + Add Voice Part
          </button>
        </div>
      </AppCard>
    </div>
  );
}

