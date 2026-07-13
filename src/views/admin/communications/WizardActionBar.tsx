import type React from 'react';

interface WizardActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function WizardActionBar({ children, className = '' }: WizardActionBarProps) {
  return (
    <div
      className={`border-border bg-surface sticky inset-x-0 bottom-0 z-50 -mx-3 flex min-h-16 items-center justify-between gap-2 border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:-mx-6 lg:static lg:mx-0 lg:min-h-0 lg:w-full lg:border-t-0 lg:bg-transparent lg:p-0 lg:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}
