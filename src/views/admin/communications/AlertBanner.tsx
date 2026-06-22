import type React from 'react';

type AlertVariant = 'warning' | 'info' | 'success';

interface AlertBannerProps {
  variant: AlertVariant;
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}

const variantStyles: Record<AlertVariant, string> = {
  warning: 'border-amber-100 border-l-amber-600 bg-amber-50 text-amber-900',
  info: 'border-blue-100 border-l-blue-600 bg-blue-50 text-blue-900',
  success: 'border-emerald-100 border-l-emerald-600 bg-emerald-50 text-emerald-900',
};

export function AlertBanner({ variant, icon, title, children }: AlertBannerProps) {
  return (
    <div
      className={`flex w-full items-start gap-3 rounded-lg border border-l-4 p-3 text-xs leading-normal transition-transform duration-200 hover:translate-x-0.5 ${variantStyles[variant]}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>
        <strong>{title}</strong>
        {children && <> {children}</>}
      </span>
    </div>
  );
}
