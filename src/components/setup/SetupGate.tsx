import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSetup } from '../../contexts/SetupContext';
import { Button } from '../ui';

export const SetupGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, unavailable, status, refreshAll } = useSetup();
  const location = useLocation();

  if (loading) {
    return (
      <div className="bg-bg flex h-screen w-screen flex-col items-center justify-center gap-4">
        <div
          className="border-border border-t-primary size-10 animate-spin rounded-full border-4"
          role="status"
          aria-label="Loading"
        />
        <span className="text-muted text-sm font-semibold tracking-wide">
          Loading Setup Status...
        </span>
      </div>
    );
  }

  if (unavailable || !status) {
    return (
      <div className="bg-bg flex min-h-screen w-full items-center justify-center p-6">
        <section className="border-border bg-surface w-full max-w-lg rounded-xl border p-8 text-center shadow-sm">
          <div className="mb-4 text-4xl" aria-hidden="true">
            ⚠️
          </div>
          <h1 className="text-text text-xl font-bold">Unable to load application configuration</h1>
          <p className="text-text-muted mt-3 text-sm leading-6">
            The server did not return a valid setup status. PocketBase may be restarting, or its
            custom hooks may not be loaded. This screen has not changed your database.
          </p>
          <div className="mt-6">
            <Button onClick={() => void refreshAll()}>Retry connection</Button>
          </div>
        </section>
      </div>
    );
  }

  const isSetupRoute = location.pathname === '/setup';
  const isLoginRoute = location.pathname === '/login';
  const isResetPasswordRoute = location.pathname === '/reset-password';

  if (status.state !== 'initialized') {
    if (
      isSetupRoute ||
      (status?.state === 'in_progress' && (isLoginRoute || isResetPasswordRoute))
    ) {
      return <>{children}</>;
    }
    return <Navigate to="/setup" replace />;
  }

  if (isSetupRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
