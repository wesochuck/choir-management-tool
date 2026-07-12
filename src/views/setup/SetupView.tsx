import React, { useState } from 'react';
import { useSetup } from '../../contexts/SetupContext';
import { OwnerSignInStep } from './steps/OwnerSignInStep';
import { AdminIdentityStep } from './steps/AdminIdentityStep';
import { AdminRecoveryStep } from './steps/AdminRecoveryStep';
import { OrganizationBasicsStep } from './steps/OrganizationBasicsStep';
import { RosterStructureStep } from './steps/RosterStructureStep';
import { ModuleSelectionStep } from './steps/ModuleSelectionStep';
import { ReviewStep } from './steps/ReviewStep';
import { FeatureConfigurationStep } from './steps/FeatureConfigurationStep';
import { PocketHostStep } from './steps/PocketHostStep';
import { IntegrationVerificationStep } from './steps/IntegrationVerificationStep';
import { InitialDataStep } from './steps/InitialDataStep';
import { SETUP_SECTIONS } from './setupSections';
import { SetupNavigation } from '../../components/setup/SetupNavigation';
import { useDialog } from '../../contexts/DialogContext';
import { setupService } from '../../services/setupService';
import { formatPocketBaseError, pb } from '../../lib/pocketbase';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';

const SetupView: React.FC = () => {
  const { status, enabledModules, refreshAll: refreshStatus } = useSetup();
  const navigate = useNavigate();
  const [suCredentials, setSuCredentials] = useState<{ email: string; pass: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  if (!status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading setup status...</p>
      </div>
    );
  }

  // If already fully set up, redirect out
  if (status.state === 'initialized') {
    return <Navigate to="/dashboard" replace />;
  }

  // Recovery Flow
  if (status.state === 'recovery_required') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 font-sans text-white">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <span className="text-4xl" role="img" aria-label="shield">
              🛡️
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Admin Recovery</h1>
            <p className="mt-2 text-sm text-slate-400">
              No administrator accounts were found in this installation. Use superuser credentials
              to restore access.
            </p>
          </div>

          <div className="mt-8">
            <AdminRecoveryStep refreshStatus={refreshStatus} onSuccess={refreshStatus} />
          </div>
        </div>
      </div>
    );
  }

  const rosterEnabled = enabledModules.has('roster');

  // Stepper Header definitions
  const steps = [
    { id: 'account', label: 'Owner Account', section: 'admin-account' },
    { id: 'basics', label: 'Organization', section: 'organization-basics' },
    { id: 'modules', label: 'Modules', section: 'module-selection' },
  ];

  if (rosterEnabled) {
    steps.push({ id: 'roster', label: 'Roster Structure', section: 'roster-structure' });
  }

  const hasConfigurableFeatures = SETUP_SECTIONS.some((sec) => enabledModules.has(sec.moduleId));
  if (hasConfigurableFeatures) {
    steps.push({ id: 'features', label: 'Configure Features', section: 'feature-configuration' });
  }

  steps.push({ id: 'pockethost', label: 'Secrets', section: 'pockethost-config' });
  steps.push({ id: 'verification', label: 'Verification', section: 'integration-verification' });

  const showInitialData = enabledModules.has('roster') || enabledModules.has('musicLibrary');
  if (showInitialData) {
    steps.push({ id: 'data', label: 'Initial Data', section: 'initial-data' });
  }

  steps.push({ id: 'review', label: 'Review', section: 'review' });

  const completed = status.completedSections || [];

  // Find first uncompleted step
  let activeStepIdx = 0;
  for (let i = 0; i < steps.length; i++) {
    if (!completed.includes(steps[i].section)) {
      activeStepIdx = i;
      break;
    }
  }

  // Check if all steps are completed
  const allCompleted = steps.every((s) => completed.includes(s.section));

  const handleCompleteSetup = async () => {
    setLoading(true);
    try {
      await setupService.complete();
      await refreshStatus();
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Initialization Failed',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 font-sans text-white">
      <div className="w-full max-w-2xl space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="text-center">
          <span className="text-4xl" role="img" aria-label="rocket">
            🚀
          </span>
          <h1 id="setup-view-title" className="mt-4 text-3xl font-bold tracking-tight text-white">
            First-Run Setup
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Welcome to Choir Management. Let's configure your application.
          </p>
        </div>

        {/* Stepper Indicators */}
        <div className="relative mt-8 flex items-center justify-between">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="z-10 flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                    idx <= activeStepIdx || allCompleted
                      ? 'border-teal-500 bg-teal-500/20 text-teal-400'
                      : 'border-slate-800 bg-slate-900 text-slate-500'
                  }`}
                >
                  {completed.includes(step.section) ? '✓' : idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-medium transition-colors ${
                    idx === activeStepIdx && !allCompleted ? 'text-teal-400' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-all ${
                    completed.includes(steps[idx].section) ? 'bg-teal-500' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content Render based on current state / step */}
        <div className="mt-10 border-t border-slate-800/50 pt-8">
          {status.state === 'unclaimed' && !suCredentials && (
            <OwnerSignInStep onSuccess={(creds) => setSuCredentials(creds)} />
          )}

          {status.state === 'unclaimed' && suCredentials && (
            <AdminIdentityStep
              initialEmail={suCredentials.email}
              initialPassword={suCredentials.pass}
              refreshStatus={refreshStatus}
              onSuccess={refreshStatus}
            />
          )}

          {status.state === 'in_progress' && !pb.authStore.isValid && (
            <div className="space-y-6 py-6 text-center">
              <span className="text-4xl" role="img" aria-label="key">
                🔑
              </span>
              <h2 className="text-2xl font-bold text-slate-100">Setup In Progress</h2>
              <p className="mx-auto max-w-md text-sm text-slate-400">
                An administrator account has already been created for this installation. Please sign
                in to resume setup.
              </p>
              <div className="mx-auto max-w-xs pt-4">
                <Button
                  variant="primary"
                  onClick={() => navigate('/login')}
                  className="w-full justify-center"
                >
                  <span>Go to Sign In</span>
                </Button>
              </div>
            </div>
          )}

          {status.state === 'in_progress' && pb.authStore.isValid && (
            <>
              {allCompleted ? (
                <div className="space-y-6 py-6 text-center">
                  <span className="text-4xl" role="img" aria-label="sparkles">
                    ✨
                  </span>
                  <h2 className="text-2xl font-bold text-slate-100">Setup Complete!</h2>
                  <p className="mx-auto max-w-md text-sm text-slate-400">
                    Your choir management application is ready. Click the button below to initialize
                    and launch your dashboard.
                  </p>
                  <SetupNavigation
                    nextLabel="Launch Application"
                    onNext={handleCompleteSetup}
                    loading={loading}
                  />
                </div>
              ) : (
                <>
                  {activeStepIdx < steps.length && (
                    <>
                      {steps[activeStepIdx].section === 'organization-basics' && (
                        <OrganizationBasicsStep
                          refreshStatus={refreshStatus}
                          onSuccess={refreshStatus}
                        />
                      )}

                      {steps[activeStepIdx].section === 'module-selection' && (
                        <ModuleSelectionStep
                          refreshStatus={refreshStatus}
                          onSuccess={refreshStatus}
                          initialEnabled={Array.from(enabledModules)}
                        />
                      )}

                      {steps[activeStepIdx].section === 'roster-structure' && (
                        <RosterStructureStep
                          refreshStatus={refreshStatus}
                          onSuccess={refreshStatus}
                          ownerIsPerformer={!!status.ownerIsPerformer}
                        />
                      )}

                      {steps[activeStepIdx].section === 'feature-configuration' && (
                        <FeatureConfigurationStep
                          onSuccess={async () => {
                            const completed = [
                              'admin-account',
                              'organization-basics',
                              'module-selection',
                            ];
                            if (rosterEnabled) completed.push('roster-structure');
                            completed.push('feature-configuration');
                            await setupService.saveProgress(completed);
                            await refreshStatus();
                          }}
                        />
                      )}

                      {steps[activeStepIdx].section === 'pockethost-config' && (
                        <PocketHostStep
                          onSuccess={async () => {
                            const completed = [
                              'admin-account',
                              'organization-basics',
                              'module-selection',
                            ];
                            if (rosterEnabled) completed.push('roster-structure');
                            if (hasConfigurableFeatures) completed.push('feature-configuration');
                            completed.push('pockethost-config');
                            await setupService.saveProgress(completed);
                            await refreshStatus();
                          }}
                        />
                      )}

                      {steps[activeStepIdx].section === 'integration-verification' && (
                        <IntegrationVerificationStep
                          onSuccess={async () => {
                            const completed = [
                              'admin-account',
                              'organization-basics',
                              'module-selection',
                            ];
                            if (rosterEnabled) completed.push('roster-structure');
                            if (hasConfigurableFeatures) completed.push('feature-configuration');
                            completed.push('pockethost-config');
                            completed.push('integration-verification');
                            await setupService.saveProgress(completed);
                            await refreshStatus();
                          }}
                        />
                      )}

                      {steps[activeStepIdx].section === 'initial-data' && (
                        <InitialDataStep
                          onSuccess={async () => {
                            const completed = [
                              'admin-account',
                              'organization-basics',
                              'module-selection',
                            ];
                            if (rosterEnabled) completed.push('roster-structure');
                            if (hasConfigurableFeatures) completed.push('feature-configuration');
                            completed.push('pockethost-config');
                            completed.push('integration-verification');
                            completed.push('initial-data');
                            await setupService.saveProgress(completed);
                            await refreshStatus();
                          }}
                        />
                      )}

                      {steps[activeStepIdx].section === 'review' && (
                        <ReviewStep refreshStatus={refreshStatus} onSuccess={refreshStatus} />
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupView;
