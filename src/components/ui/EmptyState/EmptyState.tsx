export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-8 px-4">
      {icon && <div className="text-[2rem] leading-none mb-1">{icon}</div>}
      <h3 className="text-base font-semibold text-text m-0">{title}</h3>
      {description && <p className="text-sm text-text-muted m-0">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
