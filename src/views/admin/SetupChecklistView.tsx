import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { setupService } from '../../services/setupService';
import { evaluateReadiness } from '../../lib/readiness';
import { ReadinessChecklist } from '../../components/setup/ReadinessChecklist';
import { PageLayout } from '../../components/common/PageLayout';
import { Button } from '../../components/ui';
import { useSetup } from '../../contexts/SetupContext';
import { useDialog } from '../../contexts/DialogContext';

export default function SetupChecklistView() {
  const { status, refreshAll } = useSetup();
  const dialog = useDialog();

  const readinessQuery = useQuery({
    queryKey: queryKeys.readiness.all,
    queryFn: () => setupService.getReadinessSnapshot(),
  });

  const completeSetupMutation = useMutation({
    mutationFn: () => setupService.complete(),
    onSuccess: async () => {
      await refreshAll();
      dialog.showToast('Setup finalized successfully! Your organization is now fully launched.');
    },
    onError: (err: unknown) => {
      void dialog.showMessage({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to finalize setup',
        variant: 'danger',
      });
    },
  });

  const isLoading = readinessQuery.isLoading;
  const snapshot = readinessQuery.data;

  if (isLoading || !snapshot) {
    return (
      <PageLayout title="Setup Checklist" backTo="/admin/settings">
        <div className="text-sm text-slate-400">Loading readiness checklist...</div>
      </PageLayout>
    );
  }

  const { items, readyForLaunch } = evaluateReadiness(snapshot);
  const isCompleted = status?.state === 'initialized';

  return (
    <PageLayout title="Setup Checklist" backTo="/admin/settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-200">Organization Launch Readiness</h2>
          <p className="mt-1 text-sm text-slate-400">
            Review the checklist below to verify if your choir is configured and ready for public
            launch.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-2xl backdrop-blur-xl">
          <ReadinessChecklist items={items} />

          {!isCompleted && (
            <div className="flex flex-col gap-4 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-300">Finalize Installation</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Once all required configurations are complete, you can launch the organization.
                </p>
              </div>
              <Button
                variant="primary"
                disabled={!readyForLaunch || completeSetupMutation.isPending}
                onClick={() => completeSetupMutation.mutate()}
                className="w-full justify-center sm:w-auto"
              >
                <span>{completeSetupMutation.isPending ? 'Finalizing...' : 'Complete Launch'}</span>
              </Button>
            </div>
          )}

          {isCompleted && (
            <div className="border-t border-slate-800 pt-6 text-center">
              <span className="inline-block rounded-full bg-teal-500/20 px-3 py-1.5 text-xs font-medium text-teal-300">
                ✓ Setup Completed & Launched
              </span>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
