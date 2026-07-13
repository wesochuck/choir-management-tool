import React from 'react';
import { useSetup } from '../../contexts/SetupContext';
import { Button } from '../ui';
import { Navigate, useNavigate } from 'react-router-dom';
import type { ModuleId } from '../../lib/modules';
import { MODULE_DEFINITIONS } from '../../lib/modules';
import { pb } from '../../lib/pocketbase';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { settingsService } from '../../services/settingsService';

interface ModuleRouteProps {
  module: ModuleId;
  children: React.ReactNode;
}

export const ModuleRoute: React.FC<ModuleRouteProps> = ({ module, children }) => {
  const { enabledModules } = useSetup();
  const navigate = useNavigate();

  const isEnabled = enabledModules.has(module);
  const user = pb.authStore.model;
  const isAuthenticated = pb.authStore.isValid && !!user;
  const isAdmin = isAuthenticated && user.role === 'admin';

  const homepageQuery = useQuery({
    queryKey: queryKeys.appSettings.all,
    queryFn: () => settingsService.getHomepageUrl(),
    enabled: !isEnabled && !isAuthenticated,
    retry: false,
    staleTime: 5 * 60_000,
  });

  if (isEnabled) {
    return <>{children}</>;
  }

  if (isAdmin) {
    return <Navigate to="/admin/settings/modules" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const def = MODULE_DEFINITIONS[module];
  const configuredHomepage = homepageQuery.data?.trim() ?? '';
  let homepageUrl = '';
  if (configuredHomepage) {
    try {
      const target = new URL(configuredHomepage, window.location.origin);
      const isWebUrl = target.protocol === 'http:' || target.protocol === 'https:';
      const isSameOriginRoot = target.origin === window.location.origin && target.pathname === '/';
      const isCurrentRoute =
        target.origin === window.location.origin && target.pathname === window.location.pathname;
      if (isWebUrl && !isSameOriginRoot && !isCurrentRoute) {
        homepageUrl = target.href;
      }
    } catch {
      // Ignore malformed configuration and leave only the reliable Go Back action.
    }
  }

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
          {homepageUrl && (
            <Button as="a" href={homepageUrl} variant="ghost" className="w-full justify-center">
              <span>Return Home</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
