export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      {icon && <div className="mb-1 text-[2rem] leading-none">{icon}</div>}
      <h3 className="text-text m-0 text-base font-semibold">{title}</h3>
      {description && <p className="text-text-muted m-0 text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
