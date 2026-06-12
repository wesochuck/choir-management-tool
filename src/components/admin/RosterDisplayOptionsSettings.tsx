import { Select } from '../ui';
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
          <Select
            value={configDefaultStatus}
            onChange={(event) => setConfigDefaultStatus(event.target.value)}
            className="!h-10"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Idle">Idle</option>
            <option value="Inactive">Inactive</option>
          </Select>
          <p className="text-xs text-slate-500">
            Choose the default status filter used when opening the global roster.
          </p>
        </div>
      </div>
    </AppCard>
  );
}
