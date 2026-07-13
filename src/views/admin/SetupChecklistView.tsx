import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { setupService } from '../../services/setupService';
import { evaluateReadiness } from '../../lib/readiness';
import { ReadinessChecklist } from '../../components/setup/ReadinessChecklist';
import { PageLayout } from '../../components/common/PageLayout';
import { Button } from '../../components/ui';
import { useSetup } from '../../contexts/SetupContext';
import { useDialog } from '../../contexts/DialogContext';
import { AppCard } from '../../components/common/AppCard';

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
        <div className="text-text-muted text-sm">Loading readiness checklist...</div>
      </PageLayout>
    );
  }

  const { items, readyForLaunch } = evaluateReadiness(snapshot);
  const isCompleted = status?.state === 'initialized';

  return (
    <PageLayout title="Setup Checklist" backTo="/admin/settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-text text-xl font-bold">Organization Launch Readiness</h2>
          <p className="text-text-muted mt-1 text-sm">
            Review the checklist below to verify if your choir is configured and ready for public
            launch.
          </p>
        </div>

        <AppCard className="space-y-6">
          <ReadinessChecklist items={items} />

          {!isCompleted && (
            <div className="border-border flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-text text-sm font-semibold">Finalize Installation</h4>
                <p className="text-text-muted mt-1 text-xs">
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
            <div className="border-border border-t pt-6 text-center">
              <span className="bg-success-bg text-success-text inline-block rounded-full px-3 py-1.5 text-xs font-semibold tracking-wider uppercase">
                ✓ Setup Completed & Launched
              </span>
            </div>
          )}
        </AppCard>
      </div>
    </PageLayout>
  );
}
