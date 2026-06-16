import { AppCard } from '../common/AppCard';
import { Input } from '../ui';

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
        <Input
          type="text"
          value={configSeason}
          onChange={(event) => setConfigSeason(event.target.value)}
          placeholder="e.g. Fall 2026"
        />
        <p className="text-xs text-slate-500">
          Set the active season for tracking dues in the roster view. Leave blank to disable dues tracking.
        </p>
      </div>
    </AppCard>
  );
}
