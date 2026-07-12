import { useSetup } from '../../contexts/SetupContext';
import { ModuleSelectionStep } from '../setup/steps/ModuleSelectionStep';
import { PageLayout } from '../../components/common/PageLayout';

export default function ModuleSettingsView() {
  const { enabledModules, refreshAll } = useSetup();

  return (
    <PageLayout title="Module Settings" backTo="/admin/settings">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-200">Activate or Disable Features</h2>
          <p className="mt-1 text-sm text-slate-400">
            Toggle modules below. Activating a feature will auto-enable any prerequisites. Disabling
            a feature will recursively turn off all downstream capabilities that depend on it.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-2xl backdrop-blur-xl">
          <ModuleSelectionStep
            refreshStatus={refreshAll}
            onSuccess={refreshAll}
            initialEnabled={Array.from(enabledModules)}
          />
        </div>
      </div>
    </PageLayout>
  );
}
