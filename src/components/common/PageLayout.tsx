import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

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
  useDocumentTitle(title);
  return (
    <div className="admin-layout-wrapper">
      <header className="admin-layout-header">
        <div className="admin-header-container" style={{ maxWidth }}>
          <div className="admin-header-brand">
            {backTo && (
              <Link to={backTo} className="admin-back-btn">← Back</Link>
            )}
            <Link to="/" className="admin-back-btn" title="Dashboard">🏠 Home</Link>
            <div className="admin-header-titles">
              <h2 className="admin-header-title">{title}</h2>
              {subtitle && <p className="admin-header-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="admin-header-actions">{actions}</div>}
        </div>
      </header>

      <main className="admin-main-content" style={{ maxWidth }}>
        {children}
      </main>
    </div>
  );
};
