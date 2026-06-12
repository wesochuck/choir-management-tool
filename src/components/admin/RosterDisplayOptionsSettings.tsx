import { AppCard } from '../common/AppCard';

interface RosterDisplayOptionsSettingsProps {
  configDefaultStatus: string;
  setConfigDefaultStatus: (value: string) => void;
}

export function RosterDisplayOptionsSettings({
  configDefaultStatus,
  setConfigDefaultStatus,
}: RosterDisplayOptionsSettingsProps) {
  return (
    <AppCard title="Roster Display Options">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Default Status Filter</label>
          <select
            value={configDefaultStatus}
            onChange={(event) => setConfigDefaultStatus(event.target.value)}
            className="h-10 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Idle">Idle</option>
            <option value="Inactive">Inactive</option>
          </select>
          <p className="text-xs text-slate-500">
            Choose the default status filter used when opening the global roster.
          </p>
        </div>
      </div>
    </AppCard>
  );
}
