import React from 'react';
import { Link } from 'react-router-dom';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, title, subtitle, backTo, actions, maxWidth = '1200px' 
}) => {
  return (
    <div className="flex-col" style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <header className="surface" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="container flex-responsive" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-lg)', maxWidth }}>
          <div className="flex-responsive" style={{ gap: 'var(--space-lg)' }}>
            {backTo && (
              <Link to={backTo} className="btn btn-ghost">← Back</Link>
            )}
            <div className="flex-col" style={{ gap: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
              {subtitle && <p className="text-muted" style={{ margin: 0, fontSize: '0.8125rem' }}>{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex-row" style={{ gap: 'var(--space-md)' }}>{actions}</div>}
        </div>
      </header>

      <main className="container" style={{ maxWidth }}>
        {children}
      </main>
    </div>
  );
};
