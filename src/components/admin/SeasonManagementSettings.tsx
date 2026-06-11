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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Current Season</label>
        <input
          type="text"
          value={configSeason}
          onChange={(event) => setConfigSeason(event.target.value)}
          placeholder="e.g. Fall 2026"
          className="h-10 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="text-xs text-slate-500">
          Set the active season for tracking dues in the roster view. Leave blank to disable dues tracking.
        </p>
      </div>
    </AppCard>
  );
}
