import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  DEFAULT_ROSTER_SETTINGS,
  settingsService,
  type AttendanceSettings,
  type RosterSettings,
  getVoiceParts,
  saveVoiceParts,
  type VoicePartDef,
} from '../../services/settingsService';
import { profileService, type Profile } from '../../services/profileService';

export default function SettingsView() {
  const navigate = useNavigate();
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [rosterSettings, setRosterSettings] = useState<RosterSettings>(DEFAULT_ROSTER_SETTINGS);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const attendance = await settingsService.getAttendanceSettings();
      setAttendanceSettings(attendance);
      const roster = await settingsService.getRosterSettings();
      setRosterSettings(roster);
      const parts = await getVoiceParts();
      setVoiceParts(parts);
      const allProfiles = await profileService.getProfiles();
      setProfiles(allProfiles);
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
      await settingsService.saveRosterSettings(rosterSettings);
      await saveVoiceParts(voiceParts);
      setMessage('Settings saved.');
    } catch {
      setMessage('Settings could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const getSingerCountForPart = (label: string) => {
    if (!label) return 0;
    return profiles.filter(p => p.voicePart === label).length;
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

      <AppCard title="Roster Settings">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Default Status Filter</label>
          <select
            value={rosterSettings.defaultStatus}
            onChange={(event) => setRosterSettings({ defaultStatus: event.target.value })}
            className="card"
            style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="">All Statuses</option>
            <option value="Active (Current)">Active (Current)</option>
            <option value="Active (Future)">Active (Future)</option>
            <option value="Inactive">Inactive</option>
          </select>
          <p className="text-muted" style={{ margin: 0 }}>
            Choose the default status filter used when opening the global roster.
          </p>
        </div>
      </AppCard>

      <AppCard title="Voice Part Configurations">
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <p className="text-muted" style={{ margin: 0 }}>
            Configure the custom voice parts for the choir (e.g. S1, Soprano 1).
          </p>

          <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
            {voiceParts.map((vp, index) => {
              const count = getSingerCountForPart(vp.label);
              const isTied = count > 0;
              return (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 120px 100px', gap: 'var(--space-md)', alignItems: 'center', width: '100%' }}>
                  <input
                    value={vp.label}
                    onChange={(e) => {
                      const newParts = [...voiceParts];
                      newParts[index] = { ...newParts[index], label: e.target.value };
                      setVoiceParts(newParts);
                    }}
                    placeholder="Label (e.g. S1)"
                    disabled={isTied}
                    className="card"
                    style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px' }}
                    title={isTied ? "Cannot change the label of a voice part with assigned singers" : undefined}
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
                    style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px' }}
                  />
                  {vp.label ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/roster?voicePart=${vp.label}`)}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      title={`Click to view the ${count} singer(s) in this voice part`}
                    >
                      <span style={{ fontWeight: 600 }}>{count}</span>
                      <span>singer{count === 1 ? '' : 's'}</span>
                    </button>
                  ) : (
                    <div style={{ height: '36px' }} />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceParts(voiceParts.filter((_, idx) => idx !== index));
                    }}
                    disabled={isTied}
                    className="btn btn-danger btn-sm"
                    style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={isTied ? "Cannot delete voice part with assigned singers" : undefined}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
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

