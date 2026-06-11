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
      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer flex-row items-center gap-2">
          <input
            type="checkbox"
            checked={configAutomationEnabled}
            onChange={(e) => setConfigAutomationEnabled(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span className="text-sm font-semibold text-slate-700">Enable Automated Status Changes</span>
        </label>
        <p className="text-xs text-slate-500 pl-6">
          Automatically mark singers as Active/Inactive based on their attendance and RSVP history.
        </p>

        {configAutomationEnabled && (
          <div className="ml-6 pl-4 border-l border-slate-100 flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Consecutive Misses Threshold</label>
              <input
                type="number"
                min={1}
                max={10}
                value={configAutomationMissThreshold}
                onChange={(e) => setConfigAutomationMissThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-slate-500">
                Mark a singer as Inactive after this many consecutive absences or 'No' RSVPs.
              </p>
            </div>

            <label className="mt-1 flex cursor-pointer flex-row items-center gap-2">
              <input
                type="checkbox"
                checked={configAutomationRecoveryEnabled}
                onChange={(e) => setConfigAutomationRecoveryEnabled(e.target.checked)}
                className="size-4 accent-primary"
              />
              <span className="text-sm font-semibold text-slate-700">Enable Automated Status Recovery</span>
            </label>
            <p className="text-xs text-slate-500 pl-6">
              Automatically mark inactive singers as "Idle" when they RSVP 'Yes' to a future Performance.
            </p>
          </div>
        )}

        <hr className="my-2 border-t border-slate-100" />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Maximum Rehearsal Miss Limit</label>
          <input
            type="number"
            min={0}
            max={20}
            value={configMaxRehearsalMisses}
            onChange={(e) => setConfigMaxRehearsalMisses(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-slate-500">
            The maximum number of rehearsal misses (declined RSVPs or marked absences) allowed for a concert cycle before warnings are shown to singers and admins.
          </p>
        </div>
      </div>
    </AppCard>
  );
}
