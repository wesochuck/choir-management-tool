import { AppCard } from '../common/AppCard';

interface StatusAutomationSettingsProps {
  configAutomationEnabled: boolean;
  setConfigAutomationEnabled: (value: boolean) => void;
  configAutomationMissThreshold: number;
  setConfigAutomationMissThreshold: (value: number) => void;
  configAutomationRecoveryEnabled: boolean;
  setConfigAutomationRecoveryEnabled: (value: boolean) => void;
  configMaxRehearsalMisses: number;
  setConfigMaxRehearsalMisses: (value: number) => void;
}

export function StatusAutomationSettings({
  configAutomationEnabled,
  setConfigAutomationEnabled,
  configAutomationMissThreshold,
  setConfigAutomationMissThreshold,
  configAutomationRecoveryEnabled,
  setConfigAutomationRecoveryEnabled,
  configMaxRehearsalMisses,
  setConfigMaxRehearsalMisses,
}: StatusAutomationSettingsProps) {
  return (
    <AppCard title="Singer Status & Rehearsal Limits">
      <div className="admin-settings-group">
        <label className="admin-checkbox-label">
          <input
            type="checkbox"
            checked={configAutomationEnabled}
            onChange={(e) => setConfigAutomationEnabled(e.target.checked)}
            className="admin-checkbox-input"
          />
          <span className="text-label admin-font-weight-600">Enable Automated Status Changes</span>
        </label>
        <p className="text-muted admin-checkbox-description">
          Automatically mark singers as Active/Inactive based on their attendance and RSVP history.
        </p>

        {configAutomationEnabled && (
          <div className="admin-settings-nested-group">
            <div className="admin-settings-field">
              <label className="text-label">Consecutive Misses Threshold</label>
              <input
                type="number"
                min={1}
                max={10}
                value={configAutomationMissThreshold}
                onChange={(e) => setConfigAutomationMissThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="card admin-settings-input-sm"
              />
              <p className="text-muted admin-settings-description">
                Mark a singer as Inactive after this many consecutive absences or 'No' RSVPs.
              </p>
            </div>

            {/* @allow-inline-style - spacing override */}
            <label className="admin-checkbox-label" style={{ marginTop: 'var(--space-xs)' }}>
              <input
                type="checkbox"
                checked={configAutomationRecoveryEnabled}
                onChange={(e) => setConfigAutomationRecoveryEnabled(e.target.checked)}
                className="admin-checkbox-input"
              />
              <span className="text-label admin-font-weight-600">Enable Automated Status Recovery</span>
            </label>
            <p className="text-muted admin-checkbox-description">
              Automatically mark inactive singers as "Idle" when they RSVP 'Yes' to a future Performance.
            </p>
          </div>
        )}

        <hr className="admin-divider" />

        <div className="admin-settings-field">
          <label className="text-label admin-font-weight-600">Maximum Rehearsal Miss Limit</label>
          <input
            type="number"
            min={0}
            max={20}
            value={configMaxRehearsalMisses}
            onChange={(e) => setConfigMaxRehearsalMisses(Math.max(0, parseInt(e.target.value) || 0))}
            className="card admin-settings-input-sm"
          />
          <p className="text-muted admin-settings-description">
            The maximum number of rehearsal misses (declined RSVPs or marked absences) allowed for a concert cycle before warnings are shown to singers and admins.
          </p>
        </div>
      </div>
    </AppCard>
  );
}
