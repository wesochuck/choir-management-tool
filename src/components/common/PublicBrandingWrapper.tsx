import React from 'react';
import { usePublicBranding } from '../../hooks/usePublicBranding';
import { PublicLayout } from './PublicLayout';
import PublicLogo from './PublicLogo';

interface PublicBrandingWrapperProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

export function PublicBrandingWrapper({ children, showLogo = true }: PublicBrandingWrapperProps) {
  const { data: useBranding = false, isLoading } = usePublicBranding();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-bg">
        <div className="size-10 animate-spin rounded-full border-4 border-border border-t-primary" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (useBranding) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col items-center justify-start">
          {children}
        </div>
      </PublicLayout>
    );
  }

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-start p-4 bg-bg">
      {showLogo && <PublicLogo />}
      {children}
    </div>
  );
}
