import React from 'react';
import { useSetup } from '../../contexts/SetupContext';
import { Button } from '../ui';
import { useNavigate } from 'react-router-dom';
import type { ModuleId } from '../../lib/modules';
import { MODULE_DEFINITIONS } from '../../lib/modules';

interface ModuleRouteProps {
  module: ModuleId;
  children: React.ReactNode;
}

export const ModuleRoute: React.FC<ModuleRouteProps> = ({ module, children }) => {
  const { enabledModules } = useSetup();
  const navigate = useNavigate();

  const isEnabled = enabledModules.has(module);

  if (isEnabled) {
    return <>{children}</>;
  }

  const def = MODULE_DEFINITIONS[module];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center font-sans text-white">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-900 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
        <span className="text-5xl" role="img" aria-label="lock">
          🔒
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-white">Feature Unavailable</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          The <span className="font-semibold text-teal-400">{def?.label || module}</span> module is
          currently disabled for this organization.
        </p>
        <p className="text-xs leading-relaxed text-slate-500">
          To access this feature, please contact an administrator to enable it in Settings.
        </p>
        <div className="flex flex-col gap-2 pt-4">
          <Button variant="primary" onClick={() => navigate(-1)} className="w-full justify-center">
            <span>Go Back</span>
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')} className="w-full justify-center">
            <span>Return Home</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
