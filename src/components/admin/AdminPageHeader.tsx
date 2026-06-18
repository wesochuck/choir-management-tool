import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  below?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  actions,
  below,
  className = '',
}: AdminPageHeaderProps) {
  return (
    <div className={`no-print flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        )}
      </div>

      {below}
    </div>
  );
}
