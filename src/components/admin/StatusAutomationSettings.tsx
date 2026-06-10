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
        <label className="flex cursor-pointer flex-row items-center gap-2">
          <input
            type="checkbox"
            checked={configAutomationEnabled}
            onChange={(e) => setConfigAutomationEnabled(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          <span className="text-label font-semibold">Enable Automated Status Changes</span>
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
            <label className="flex cursor-pointer flex-row items-center gap-2" style={{ marginTop: 'var(--space-xs)' }}>
              <input
                type="checkbox"
                checked={configAutomationRecoveryEnabled}
                onChange={(e) => setConfigAutomationRecoveryEnabled(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              <span className="text-label font-semibold">Enable Automated Status Recovery</span>
            </label>
            <p className="text-muted admin-checkbox-description">
              Automatically mark inactive singers as "Idle" when they RSVP 'Yes' to a future Performance.
            </p>
          </div>
        )}

        <hr className="my-2 border-t border-none border-border" />

        <div className="admin-settings-field">
          <label className="text-label font-semibold">Maximum Rehearsal Miss Limit</label>
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
