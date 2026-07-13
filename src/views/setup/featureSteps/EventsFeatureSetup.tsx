import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { settingsService, type CommunicationSettings } from '../../../services/settingsService';
import { Button } from '../../../components/ui';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';

interface EventsFeatureSetupProps {
  onSuccess: () => void;
}

export default function EventsFeatureSetup({ onSuccess }: EventsFeatureSetupProps) {
  const { data: currentSettings } = useQuery({
    queryKey: queryKeys.communications.settings(),
    queryFn: () => settingsService.getCommunicationSettings(),
  });

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHoursBefore, setReminderHoursBefore] = useState(24);
  const [reportEnabled, setReportEnabled] = useState(false);
  const dialog = useDialog();

  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.reminderEnabled !== undefined) {
        setReminderEnabled(currentSettings.reminderEnabled);
      }
      if (currentSettings.reminderHoursBefore !== undefined) {
        setReminderHoursBefore(currentSettings.reminderHoursBefore);
      }
      if (currentSettings.reportEnabled !== undefined) {
        setReportEnabled(currentSettings.reportEnabled);
      }
    }
  }, [currentSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await settingsService.saveCommunicationSettings({
        ...currentSettings,
        reminderEnabled,
        reminderHoursBefore,
        reportEnabled,
      } as CommunicationSettings);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: unknown) => {
      void dialog.showMessage({
        title: 'Event Settings Failed',
        message: formatPocketBaseError(error),
        variant: 'danger',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Events & Notifications</h3>
        <p className="text-sm text-slate-400">Configure default event notification rules.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="event-reminders"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="mt-1 size-4 accent-teal-500"
          />
          <div className="flex flex-col">
            <label htmlFor="event-reminders" className="text-sm font-medium text-slate-200">
              Enable automated email reminders
            </label>
            <span className="text-xs text-slate-400">
              Send a reminder email to performers before scheduled events.
            </span>
          </div>
        </div>

        {reminderEnabled && (
          <div className="mt-2 ml-6 flex flex-col gap-1.5 border-l border-slate-800 pl-4">
            <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Reminder Lead Time (Hours before)
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={reminderHoursBefore}
              onChange={(e) => setReminderHoursBefore(parseInt(e.target.value) || 24)}
              className="w-full max-w-[120px] rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
            />
          </div>
        )}

        <div className="flex items-start gap-3 pt-2">
          <input
            type="checkbox"
            id="attendance-reports"
            checked={reportEnabled}
            onChange={(e) => setReportEnabled(e.target.checked)}
            className="mt-1 size-4 accent-teal-500"
          />
          <div className="flex flex-col">
            <label htmlFor="attendance-reports" className="text-sm font-medium text-slate-200">
              Enable attendance reports
            </label>
            <span className="text-xs text-slate-400">
              Send attendance summary emails to administrators after events.
            </span>
          </div>
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
