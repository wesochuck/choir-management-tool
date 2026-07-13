import { useSetup } from '../../contexts/SetupContext';
import { ModuleSelectionStep } from '../setup/steps/ModuleSelectionStep';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';

export default function ModuleSettingsView() {
  const { enabledModules, refreshAll } = useSetup();

  return (
    <PageLayout title="Module Settings" backTo="/admin/settings">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-text text-xl font-semibold">Activate or Disable Features</h2>
          <p className="text-text-muted mt-1 text-sm">
            Toggle modules below. Activating a feature will auto-enable any prerequisites. Disabling
            a feature will recursively turn off all downstream capabilities that depend on it.
          </p>
        </div>

        <AppCard>
          <ModuleSelectionStep
            refreshStatus={refreshAll}
            onSuccess={refreshAll}
            initialEnabled={Array.from(enabledModules)}
            persistSetupProgress={false}
          />
        </AppCard>
      </div>
    </PageLayout>
  );
}
