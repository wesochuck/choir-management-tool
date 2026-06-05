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
      <div className="admin-settings-group">
        <div className="admin-settings-field">
          <label className="text-label">Default Status Filter</label>
          <select
            value={configDefaultStatus}
            onChange={(event) => setConfigDefaultStatus(event.target.value)}
            className="card admin-settings-input-md"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Idle">Idle</option>
            <option value="Inactive">Inactive</option>
          </select>
          <p className="text-muted admin-settings-description">
            Choose the default status filter used when opening the global roster.
          </p>
        </div>
      </div>
    </AppCard>
  );
}
