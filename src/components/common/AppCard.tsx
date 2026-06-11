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
  return (
    <div 
      className={`card relative-row flex-col ${noPadding ? 'p-0' : ''} ${className}`} 
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
