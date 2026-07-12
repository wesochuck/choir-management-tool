import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSetup } from '../../contexts/SetupContext';

export const SetupGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, status } = useSetup();
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

  const isSetupRoute = location.pathname === '/setup';
  const isLoginRoute = location.pathname === '/login';

  if (!status || status.state !== 'initialized') {
    if (isSetupRoute || (status?.state === 'in_progress' && isLoginRoute)) {
      return <>{children}</>;
    }
    return <Navigate to="/setup" replace />;
  }

  if (isSetupRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
