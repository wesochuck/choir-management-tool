import React, { useState } from 'react';
import { useSetup } from '../../contexts/SetupContext';
import { OwnerSignInStep } from './steps/OwnerSignInStep';
import { AdminIdentityStep } from './steps/AdminIdentityStep';
import { AdminRecoveryStep } from './steps/AdminRecoveryStep';
import { Navigate } from 'react-router-dom';

const SetupView: React.FC = () => {
  const { status, refreshStatus } = useSetup();
  const [suCredentials, setSuCredentials] = useState<{ email: string; pass: string } | null>(null);

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

  // Stepper Header
  const steps = [
    { id: 'account', label: 'Owner Account' },
    { id: 'basics', label: 'Organization' },
    { id: 'modules', label: 'Modules' },
    { id: 'roster', label: 'Roster Structure' },
  ];

  // Determine current active step index
  let activeStepIdx = 0;
  if (status.state === 'in_progress') {
    const completed = status.completedSections || [];
    if (!completed.includes('organization-basics')) {
      activeStepIdx = 1;
    } else if (!completed.includes('module-selection')) {
      activeStepIdx = 2;
    } else {
      activeStepIdx = 3;
    }
  }

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
                    idx <= activeStepIdx
                      ? 'border-teal-500 bg-teal-500/20 text-teal-400'
                      : 'border-slate-800 bg-slate-900 text-slate-500'
                  }`}
                >
                  {idx < activeStepIdx ? '✓' : idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-medium transition-colors ${
                    idx === activeStepIdx ? 'text-teal-400' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-all ${
                    idx < activeStepIdx ? 'bg-teal-500' : 'bg-slate-800'
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

          {status.state === 'in_progress' && (
            <div className="space-y-4 py-6 text-center">
              <h2 className="text-xl font-semibold text-slate-200">
                Step {activeStepIdx + 1}: {steps[activeStepIdx].label}
              </h2>
              <p className="text-sm text-slate-400">
                Placeholder for {steps[activeStepIdx].label} wizard step. We will configure this in
                the next steps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupView;
