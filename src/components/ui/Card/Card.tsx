export interface CardProps {
  children?: React.ReactNode;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function Card({ children, title, actions, noPadding = false, className }: CardProps) {
  const cardClass = [
    'bg-surface border border-border rounded-lg shadow-sm hover:shadow-md',
    'flex flex-col gap-6',
    noPadding ? 'p-0' : 'p-6',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass}>
      {(title || actions) && (
        <div className="flex items-center justify-between">
          {title && <h3 className="m-0 text-2xl font-semibold text-text">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
