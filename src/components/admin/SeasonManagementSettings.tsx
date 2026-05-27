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
      <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
        <label className="text-label">Current Season</label>
        <input
          type="text"
          value={configSeason}
          onChange={(event) => setConfigSeason(event.target.value)}
          placeholder="e.g. Fall 2026"
          className="card"
          style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
        />
        <p className="text-muted" style={{ margin: 0 }}>
          Set the active season for tracking dues in the roster view. Leave blank to disable dues tracking.
        </p>
      </div>
    </AppCard>
  );
}
