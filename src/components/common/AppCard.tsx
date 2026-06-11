import React from 'react';

interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const AppCard: React.FC<AppCardProps> = ({ 
  children, className = '', style, title, actions, noPadding = false, onClick 
}) => {
  // Use Tailwind utility classes instead of the legacy global .card class to play nicely with utility overrides (p-0, gap-0, etc.)
  const cardClass = [
    'bg-surface border border-border rounded-xl shadow-sm hover:shadow-md transition-all duration-200',
    'flex flex-col',
    noPadding ? 'p-0 gap-0' : 'p-6 gap-6',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div 
      className={cardClass} 
      // @allow-inline-style - passes through style prop for composition
      style={style}
      onClick={onClick}
    >
      {(title || actions) && (
        <div className={`card-header ${title ? 'has-title' : ''}`}>
          {title && <h3 className="card-title">{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
