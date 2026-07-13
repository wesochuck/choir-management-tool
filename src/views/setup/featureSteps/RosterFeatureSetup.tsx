import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { settingsService } from '../../../services/settingsService';
import { Button } from '../../../components/ui';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';

interface RosterFeatureSetupProps {
  onSuccess: () => void;
}

export default function RosterFeatureSetup({ onSuccess }: RosterFeatureSetupProps) {
  const { data: currentSettings } = useQuery({
    queryKey: queryKeys.choirSettings.admin,
    queryFn: () => settingsService.getRosterSettings(),
  });

  const [defaultStatus, setDefaultStatus] = useState('Active');
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [maxRehearsalMisses, setMaxRehearsalMisses] = useState(3);
  const dialog = useDialog();

  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.defaultStatus) setDefaultStatus(currentSettings.defaultStatus);
      if (currentSettings.statusAutomationEnabled !== undefined) {
        setAutomationEnabled(currentSettings.statusAutomationEnabled);
      }
      if (currentSettings.maxRehearsalMisses !== undefined) {
        setMaxRehearsalMisses(currentSettings.maxRehearsalMisses);
      }
    }
  }, [currentSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await settingsService.saveRosterSettings({
        defaultSort: 'lastName',
        defaultRsvpSort: 'lastName',
        ...currentSettings,
        defaultStatus,
        statusAutomationEnabled: automationEnabled,
        maxRehearsalMisses,
      });
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: unknown) => {
      void dialog.showMessage({
        title: 'Roster Settings Failed',
        message: formatPocketBaseError(error),
        variant: 'danger',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Roster Settings</h3>
        <p className="text-sm text-slate-400">
          Configure member status defaults and attendance limits.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Default Member Status
          </label>
          <select
            value={defaultStatus}
            onChange={(e) => setDefaultStatus(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            <option value="Active">Active</option>
            <option value="Idle">On Break</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-start gap-3 pt-2">
          <input
            type="checkbox"
            id="roster-automation"
            checked={automationEnabled}
            onChange={(e) => setAutomationEnabled(e.target.checked)}
            className="mt-1 size-4 accent-teal-500"
          />
          <div className="flex flex-col">
            <label htmlFor="roster-automation" className="text-sm font-medium text-slate-200">
              Enable status automation
            </label>
            <span className="text-xs text-slate-400">
              Automatically track active vs break status based on attendance patterns.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-2">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Maximum Rehearsal Misses
          </label>
          <input
            type="number"
            min={0}
            max={20}
            value={maxRehearsalMisses}
            onChange={(e) => setMaxRehearsalMisses(parseInt(e.target.value) || 0)}
            className="w-full max-w-[120px] rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
          />
          <span className="text-xs text-slate-400">
            Consecutive misses allowed in a rehearsal cycle before warnings appear.
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
          Save & Next
        </Button>
      </div>
    </div>
  );
}
