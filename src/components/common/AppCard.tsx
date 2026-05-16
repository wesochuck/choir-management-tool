import React from 'react';

interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({ 
  children, className = '', style, title, actions, noPadding = false 
}) => {
  return (
    <div 
      className={`card flex-col relative-row ${className}`} 
      style={{ 
        padding: noPadding ? 0 : 'var(--space-lg)', 
        gap: 'var(--space-lg)',
        ...style 
      }}
    >
      {(title || actions) && (
        <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: title ? 'var(--space-xs)' : 0 }}>
          {title && <h3 style={{ margin: 0 }}>{title}</h3>}
          {actions && <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
