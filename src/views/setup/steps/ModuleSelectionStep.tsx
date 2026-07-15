import React, { useState, useMemo } from 'react';
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
import { FloatingSaveBar } from '../../../components/admin/FloatingSaveBar';

interface ModuleSelectionStepProps {
  onSuccess: () => void;
  refreshStatus: () => Promise<void>;
  initialEnabled?: ModuleId[];
  persistSetupProgress?: boolean;
  requiredModules?: ModuleId[];
}

export const ModuleSelectionStep: React.FC<ModuleSelectionStepProps> = ({
  onSuccess,
  refreshStatus,
  initialEnabled,
  persistSetupProgress = true,
  requiredModules = [],
}) => {
  const [enabled, setEnabled] = useState<Set<ModuleId>>(() => {
    const initial = initialEnabled !== undefined ? initialEnabled : [...RECOMMENDED_MODULES];
    return new Set<ModuleId>([...initial, ...requiredModules]);
  });

  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const isDirty = useMemo(() => {
    if (!initialEnabled) return false;
    const initialSet = new Set([...initialEnabled, ...requiredModules]);
    if (enabled.size !== initialSet.size) return true;
    for (const id of initialSet) {
      if (!enabled.has(id)) return true;
    }
    return false;
  }, [enabled, initialEnabled, requiredModules]);

  const sortedModuleIds = useMemo(() => {
    return [...MODULE_IDS].sort((a, b) => {
      const labelA = MODULE_DEFINITIONS[a].label.toLowerCase();
      const labelB = MODULE_DEFINITIONS[b].label.toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, []);

  const handleToggle = (id: ModuleId, checked: boolean) => {
    if (!checked && requiredModules.includes(id)) {
      void dialog.showMessage({
        title: 'Roster Required',
        message: 'Roster must remain enabled while the owner is a performing member.',
        variant: 'warning',
      });
      return;
    }
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

      if (persistSetupProgress) {
        await setupService.saveProgress([
          'admin-account',
          'organization-basics',
          'module-selection',
        ]);
      }

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
      <div className="space-y-4 pb-20">
        <p className="text-text-muted text-sm">
          Select the features you want to enable for your choir. Recommended modules are
          preselected.
        </p>

        <div className="border-border bg-surface-muted grid grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-2">
          {sortedModuleIds.map((id) => {
            const def = MODULE_DEFINITIONS[id];
            const isRecommended = RECOMMENDED_MODULES.includes(id);
            const isChecked = enabled.has(id);

            return (
              <button
                type="button"
                key={id}
                onClick={() => handleToggle(id, !isChecked)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                  isChecked
                    ? 'border-emerald-300 bg-emerald-50/60 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-900/20'
                    : 'border-border bg-surface hover:shadow-sm'
                }`}
              >
                <div className="pointer-events-none pt-0.5">
                  <Checkbox checked={isChecked} tabIndex={-1} />
                </div>
                <div className="flex flex-col">
                  <span className="text-text flex items-center gap-1.5 text-sm font-semibold">
                    {def.label}
                    {isRecommended && (
                      <span className="bg-success-bg text-success-text rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                        Recommended
                      </span>
                    )}
                  </span>
                  <span className="text-text-muted mt-1 text-xs leading-relaxed">
                    {def.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {persistSetupProgress ? (
        <SetupNavigation nextLabel="Save & Continue" loading={loading} />
      ) : (
        <FloatingSaveBar
          isDirty={isDirty}
          isSaving={loading}
          onSave={() => {
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
            void handleSubmit(fakeEvent);
          }}
          onDiscard={() => {
            setEnabled(new Set([...(initialEnabled || []), ...requiredModules]));
          }}
        />
      )}
    </form>
  );
};
