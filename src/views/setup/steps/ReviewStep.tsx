import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { setupService } from '../../../services/setupService';
import { evaluateReadiness } from '../../../lib/readiness';
import { ReadinessChecklist } from '../../../components/setup/ReadinessChecklist';
import { SetupNavigation } from '../../../components/setup/SetupNavigation';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';

interface ReviewStepProps {
  onSuccess: () => void;
  refreshStatus: () => Promise<void>;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ onSuccess, refreshStatus }) => {
  const dialog = useDialog();

  const readinessQuery = useQuery({
    queryKey: queryKeys.readiness.all,
    queryFn: () => setupService.getReadinessSnapshot(),
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readinessQuery.data) return;

    const { readyForLaunch } = evaluateReadiness(readinessQuery.data);
    if (!readyForLaunch) {
      void dialog.showMessage({
        title: 'Launch Blocked',
        message: 'Please complete all required setup steps before finalizing the launch.',
        variant: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      await setupService.complete();
      await refreshStatus();
      onSuccess();
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Launch Failed',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = readinessQuery.isLoading;
  const snapshot = readinessQuery.data;

  if (isLoading || !snapshot) {
    return <div className="text-sm text-slate-400">Evaluating launch readiness...</div>;
  }

  const { items, readyForLaunch } = evaluateReadiness(snapshot);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-200">Launch Checklist Review</h3>
          <p className="mt-1 text-xs text-slate-400">
            Ensure all required items below show green checkmarks before completing the installation
            setup.
          </p>
        </div>

        <ReadinessChecklist items={items} />

        {!readyForLaunch && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
            <span className="text-lg text-rose-400" role="img" aria-hidden="true">
              ⚠️
            </span>
            <div className="flex-1 text-xs leading-relaxed text-rose-300">
              Launch is currently disabled. One or more required configuration settings are missing.
              Please complete them to proceed.
            </div>
          </div>
        )}
      </div>

      <SetupNavigation
        nextLabel="Complete Setup & Launch"
        loading={submitting}
        nextDisabled={!readyForLaunch}
      />
    </form>
  );
};
