import type React from 'react';

interface WizardActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function WizardActionBar({ children, className = '' }: WizardActionBarProps) {
  return (
    <div
      className={`border-border bg-surface sticky inset-x-0 bottom-0 z-50 -mx-3 flex flex-col gap-3 border-t p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:-mx-6 sm:flex-row sm:items-center sm:justify-between lg:static lg:mx-0 lg:w-full lg:border-t-0 lg:bg-transparent lg:p-0 lg:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}
