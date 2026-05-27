import { AppCard } from '../common/AppCard';

interface StatusAutomationSettingsProps {
  configAutomationEnabled: boolean;
  setConfigAutomationEnabled: (value: boolean) => void;
  configAutomationMissThreshold: number;
  setConfigAutomationMissThreshold: (value: number) => void;
  configAutomationRecoveryEnabled: boolean;
  setConfigAutomationRecoveryEnabled: (value: boolean) => void;
}

export function StatusAutomationSettings({
  configAutomationEnabled,
  setConfigAutomationEnabled,
  configAutomationMissThreshold,
  setConfigAutomationMissThreshold,
  configAutomationRecoveryEnabled,
  setConfigAutomationRecoveryEnabled,
}: StatusAutomationSettingsProps) {
  return (
    <AppCard title="Singer Status Automation">
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={configAutomationEnabled}
            onChange={(e) => setConfigAutomationEnabled(e.target.checked)}
            style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
          />
          <span className="text-label" style={{ fontWeight: 600 }}>Enable Automated Status Changes</span>
        </label>
        <p className="text-muted" style={{ margin: 0, marginTop: '-8px' }}>
          Automatically mark singers as Active/Inactive based on their attendance and RSVP history.
        </p>

        {configAutomationEnabled && (
          <div className="flex-col" style={{ gap: 'var(--space-md)', paddingLeft: 'var(--space-md)', borderLeft: '2px solid var(--border)', marginTop: 'var(--space-xs)' }}>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Consecutive Misses Threshold</label>
              <input
                type="number"
                min={1}
                max={10}
                value={configAutomationMissThreshold}
                onChange={(e) => setConfigAutomationMissThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="card"
                style={{ width: '100%', maxWidth: '120px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
              />
              <p className="text-muted" style={{ margin: 0 }}>
                Mark a singer as Inactive after this many consecutive absences or 'No' RSVPs.
              </p>
            </div>

            <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', marginTop: 'var(--space-xs)' }}>
              <input
                type="checkbox"
                checked={configAutomationRecoveryEnabled}
                onChange={(e) => setConfigAutomationRecoveryEnabled(e.target.checked)}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
              />
              <span className="text-label" style={{ fontWeight: 600 }}>Enable Automated Status Recovery</span>
            </label>
            <p className="text-muted" style={{ margin: 0, marginTop: '-8px' }}>
              Automatically mark inactive singers as "Idle" when they RSVP 'Yes' to a future Performance.
            </p>
          </div>
        )}
      </div>
    </AppCard>
  );
}
