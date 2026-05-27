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
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Default Status Filter</label>
          <select
            value={configDefaultStatus}
            onChange={(event) => setConfigDefaultStatus(event.target.value)}
            className="card"
            style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Idle">Idle</option>
            <option value="Inactive">Inactive</option>
          </select>
          <p className="text-muted" style={{ margin: 0 }}>
            Choose the default status filter used when opening the global roster.
          </p>
        </div>
      </div>
    </AppCard>
  );
}
