import React, { useState } from 'react';
import { Checkbox } from '../../../components/ui';
import { SetupNavigation } from '../../../components/setup/SetupNavigation';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import {
  MODULE_IDS,
  MODULE_DEFINITIONS,
  RECOMMENDED_MODULES,
  enableModule,
  getDisableCascade,
  type ModuleId,
} from '../../../lib/modules';
import { saveModuleState } from '../../../services/moduleService';
import { setupService } from '../../../services/setupService';

interface ModuleSelectionStepProps {
  onSuccess: () => void;
  refreshStatus: () => Promise<void>;
  initialEnabled?: ModuleId[];
}

export const ModuleSelectionStep: React.FC<ModuleSelectionStepProps> = ({
  onSuccess,
  refreshStatus,
  initialEnabled,
}) => {
  const [enabled, setEnabled] = useState<Set<ModuleId>>(() => {
    if (initialEnabled && initialEnabled.length > 0) {
      return new Set<ModuleId>(initialEnabled);
    }
    return new Set<ModuleId>(RECOMMENDED_MODULES);
  });

  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const handleToggle = (id: ModuleId, checked: boolean) => {
    if (checked) {
      const next = enableModule(enabled, id);
      setEnabled(next);
    } else {
      const cascade = getDisableCascade(enabled, id);
      if (cascade.length > 1) {
        const others = cascade.filter((m) => m !== id).map((m) => MODULE_DEFINITIONS[m].label);
        void dialog
          .confirm({
            title: 'Confirm Disabling Dependent Modules',
            message: `Disabling this module will also disable the following dependent features:\n\n${others.join(', ')}\n\nDo you want to proceed?`,
            confirmLabel: 'Disable All',
            variant: 'warning',
          })
          .then((confirmed) => {
            if (confirmed) {
              const next = new Set(enabled);
              cascade.forEach((m) => next.delete(m));
              setEnabled(next);
            }
          });
      } else {
        const next = new Set(enabled);
        next.delete(id);
        setEnabled(next);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const enabledArray = Array.from(enabled);
      await saveModuleState(enabledArray);

      await setupService.saveProgress(['admin-account', 'organization-basics', 'module-selection']);

      await refreshStatus();
      onSuccess();
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Save Failed',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Select the features you want to enable for your choir. Recommended modules are
          preselected.
        </p>

        <div className="grid max-h-[400px] grid-cols-1 gap-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/20 p-4 pr-2 sm:grid-cols-2">
          {MODULE_IDS.map((id) => {
            const def = MODULE_DEFINITIONS[id];
            const isRecommended = RECOMMENDED_MODULES.includes(id);
            const isChecked = enabled.has(id);

            return (
              <div
                key={id}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
                  isChecked
                    ? 'border-teal-500/50 bg-teal-500/5'
                    : 'border-slate-800 bg-slate-900/30'
                }`}
              >
                <div className="pt-0.5">
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => handleToggle(id, e.target.checked)}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                    {def.label}
                    {isRecommended && (
                      <span className="rounded-full bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">
                        Recommended
                      </span>
                    )}
                  </span>
                  <span className="mt-1 text-xs leading-relaxed text-slate-400">
                    {def.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SetupNavigation nextLabel="Save & Continue" loading={loading} />
    </form>
  );
};
