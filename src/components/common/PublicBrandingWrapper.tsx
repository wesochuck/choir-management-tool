import React from 'react';
import { usePublicBranding } from '../../hooks/usePublicBranding';
import { PublicLayout } from './PublicLayout';
import PublicLogo from './PublicLogo';

interface PublicBrandingWrapperProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

function LoadingState() {
  return (
    <div className="bg-bg flex min-h-screen w-screen flex-col items-center justify-center">
      <div
        className="border-border border-t-primary size-10 animate-spin rounded-full border-4"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

export function PublicBrandingWrapper({ children, showLogo = true }: PublicBrandingWrapperProps) {
  const { data: useBranding = false, isLoading } = usePublicBranding();

  if (isLoading) {
    return <LoadingState />;
  }

  if (useBranding) {
    return (
      <PublicLayout>
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-start px-6 py-12">
          {children}
        </div>
      </PublicLayout>
    );
  }

  return (
    <div className="bg-bg flex min-h-screen w-screen flex-col items-center justify-start p-4">
      {showLogo && <PublicLogo />}
      {children}
    </div>
  );
}
