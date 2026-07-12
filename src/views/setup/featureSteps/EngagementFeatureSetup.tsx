import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { settingsService } from '../../../services/settingsService';
import { Button } from '../../../components/ui';

interface EngagementFeatureSetupProps {
  onSuccess: () => void;
}

export default function EngagementFeatureSetup({ onSuccess }: EngagementFeatureSetupProps) {
  const { data: directorySettings } = useQuery({
    queryKey: queryKeys.appSettings.directory,
    queryFn: () => settingsService.getDirectorySettings(),
  });

  const { data: pollSettings } = useQuery({
    queryKey: queryKeys.choirSettings.admin,
    queryFn: () => settingsService.getPollSettings(),
  });

  const [directoryEnabled, setDirectoryEnabled] = useState(true);
  const [autoArchiveDays, setAutoArchiveDays] = useState(3);

  useEffect(() => {
    if (directorySettings) {
      if (directorySettings.enabled !== undefined) {
        setDirectoryEnabled(directorySettings.enabled);
      }
    }
  }, [directorySettings]);

  useEffect(() => {
    if (pollSettings) {
      if (pollSettings.defaultAutoArchiveDays !== undefined) {
        setAutoArchiveDays(pollSettings.defaultAutoArchiveDays);
      }
    }
  }, [pollSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        settingsService.saveDirectorySettings({ enabled: directoryEnabled }),
        settingsService.savePollSettings({ defaultAutoArchiveDays: autoArchiveDays }),
      ]);
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Engagement & Directory Settings</h3>
        <p className="text-sm text-slate-400">
          Configure member directory and engagement polls behavior.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="directory-enabled"
            checked={directoryEnabled}
            onChange={(e) => setDirectoryEnabled(e.target.checked)}
            className="mt-1 size-4 accent-teal-500"
          />
          <div className="flex flex-col">
            <label htmlFor="directory-enabled" className="text-sm font-medium text-slate-200">
              Enable performer directory
            </label>
            <span className="text-xs text-slate-400">
              Allow members to opt into sharing their contact information with other ensemble
              members.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-4">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Poll Auto-Archive Days
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={autoArchiveDays}
            onChange={(e) => setAutoArchiveDays(parseInt(e.target.value) || 3)}
            className="w-full max-w-[120px] rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
          />
          <span className="text-xs text-slate-400">
            Automatically archive engagement polls after this many days.
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
