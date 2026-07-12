import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { settingsService } from '../../../services/settingsService';
import { Button } from '../../../components/ui';

interface CommercialFeatureSetupProps {
  onSuccess: () => void;
  onSetLater?: () => void;
}

export default function CommercialFeatureSetup({
  onSuccess,
  onSetLater,
}: CommercialFeatureSetupProps) {
  const { data: ticketSettings } = useQuery({
    queryKey: queryKeys.choirSettings.admin,
    queryFn: () => settingsService.getTicketConfirmationPageSettings(),
  });

  const [willCallInstructions, setWillCallInstructions] = useState('');
  const [setUpLater, setSetUpLater] = useState(true);

  useEffect(() => {
    if (ticketSettings) {
      setWillCallInstructions(ticketSettings.willCallInstructions || '');
    }
  }, [ticketSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (ticketSettings) {
        await settingsService.saveTicketConfirmationPageSettings({
          ...ticketSettings,
          willCallInstructions,
        });
      }
    },
    onSuccess: () => {
      if (setUpLater && onSetLater) {
        onSetLater();
      } else {
        onSuccess();
      }
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Commercial & Ticketing Settings</h3>
        <p className="text-sm text-slate-400">Configure public ticket sales and Stripe payments.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Will Call Instructions
          </label>
          <textarea
            value={willCallInstructions}
            onChange={(e) => setWillCallInstructions(e.target.value)}
            rows={3}
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
          />
          <span className="text-xs text-slate-400">
            Instructions shown to ticket buyers when picking up tickets.
          </span>
        </div>

        <div className="flex items-start gap-3 border-t border-slate-800 pt-4">
          <input
            type="checkbox"
            id="stripe-later"
            checked={setUpLater}
            onChange={(e) => setSetUpLater(e.target.checked)}
            className="mt-1 size-4 accent-teal-500"
          />
          <div className="flex flex-col">
            <label htmlFor="stripe-later" className="text-sm font-medium text-slate-200">
              Set up Stripe payments later
            </label>
            <span className="text-xs text-slate-400">
              You can sell free tickets immediately, but Stripe credentials are required to collect
              credit card payments.
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
          {setUpLater ? 'Skip & Continue' : 'Save & Next'}
        </Button>
      </div>
    </div>
  );
}
