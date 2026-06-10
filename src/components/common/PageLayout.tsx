import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../contexts/AuthContext';
import { pb } from '../../lib/pocketbase';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, title, subtitle, actions, maxWidth = '1200px' 
}) => {
  useDocumentTitle(title);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  return (
    <div className="admin-layout-wrapper">
      <header className="admin-layout-header">
        // @allow-inline-style - maxWidth varies per page layout variant
        <div className="admin-header-container" style={{ maxWidth }}>
          <div className="admin-header-brand">
            <Link to="/" className="admin-back-btn" title="Dashboard">🏠 Home</Link>
            <div className="admin-header-titles">
              <h2 className="admin-header-title">{title}</h2>
              {subtitle && <p className="admin-header-subtitle">{subtitle}</p>}
            </div>
          </div>
          {(actions || user?.role === 'admin') && (
            <div className="admin-header-actions">
              {actions}
              {user?.role === 'admin' && (
                <>
                  <Link to="/profile" className="btn btn-ghost">My Profile</Link>
                  <button onClick={handleLogout} className="btn btn-ghost">Logout</button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      // @allow-inline-style - maxWidth varies per page layout variant
      <main className="admin-main-content" style={{ maxWidth }}>
        {children}
      </main>
    </div>
  );
};
