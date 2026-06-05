import { AppCard } from '../common/AppCard';

interface SeasonManagementSettingsProps {
  configSeason: string;
  setConfigSeason: (value: string) => void;
}

export function SeasonManagementSettings({
  configSeason,
  setConfigSeason,
}: SeasonManagementSettingsProps) {
  return (
    <AppCard title="Season Management">
      <div className="admin-settings-field">
        <label className="text-label">Current Season</label>
        <input
          type="text"
          value={configSeason}
          onChange={(event) => setConfigSeason(event.target.value)}
          placeholder="e.g. Fall 2026"
          className="card admin-settings-input-md"
        />
        <p className="text-muted admin-settings-description">
          Set the active season for tracking dues in the roster view. Leave blank to disable dues tracking.
        </p>
      </div>
    </AppCard>
  );
}
