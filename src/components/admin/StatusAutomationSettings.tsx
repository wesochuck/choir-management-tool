import { AppCard } from '../common/AppCard';
import { Input } from '../ui';
import SlDivider from '@shoelace-style/shoelace/dist/react/divider/index.js';

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
          <span className="text-label">Enable Automated Status Changes</span>
        </label>
        <p className="pl-6 text-xs text-slate-500">
          Automatically mark singers as Active/Inactive based on their attendance and RSVP history.
        </p>

        {configAutomationEnabled && (
          <div className="mt-2 ml-6 flex flex-col gap-4 border-l border-slate-100 pl-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-label">Consecutive Misses Threshold</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={configAutomationMissThreshold}
                onChange={(e) => setConfigAutomationMissThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
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
              <span className="text-label">Enable Automated Status Recovery</span>
            </label>
            <p className="pl-6 text-xs text-slate-500">
              Automatically mark inactive singers as "Idle" when they RSVP 'Yes' to a future Performance.
            </p>
          </div>
        )}

        <SlDivider />

        <div className="flex flex-col gap-1.5">
          <label className="text-label">Maximum Rehearsal Miss Limit</label>
          <Input
            type="number"
            min={0}
            max={20}
            value={configMaxRehearsalMisses}
            onChange={(e) => setConfigMaxRehearsalMisses(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-24"
          />
          <p className="text-xs text-slate-500">
            The maximum number of rehearsal misses (declined RSVPs or marked absences) allowed for a concert cycle before warnings are shown to singers and admins.
          </p>
        </div>
      </div>
    </AppCard>
  );
}
