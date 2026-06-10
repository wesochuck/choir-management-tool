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
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 bg-surface border-b border-border shadow-sm">
        {/* @allow-inline-style - maxWidth varies per page layout variant */}
        <div className="flex items-center justify-between gap-6 mx-auto px-6 py-3" style={{ maxWidth }}>
          <div className="flex items-center gap-6">
            <Link to="/" className="inline-flex items-center justify-center h-[38px] px-4 rounded-md font-semibold text-sm bg-transparent text-text-muted border border-border hover:bg-primary-light hover:text-primary-deep transition-all duration-200 no-underline whitespace-nowrap" title="Dashboard">🏠 Home</Link>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-text">{title}</h2>
              {subtitle && <p className="text-[0.8125rem] text-text-muted">{subtitle}</p>}
            </div>
          </div>
          {(actions || user?.role === 'admin') && (
            <div className="flex items-center gap-4">
              {actions}
              {user?.role === 'admin' && (
                <>
                  <Link to="/profile" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-transparent text-text-muted border border-border hover:bg-primary-light hover:text-primary-deep px-3 py-1.5">My Profile</Link>
                  <button onClick={handleLogout} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-transparent text-text-muted border border-border hover:bg-primary-light hover:text-primary-deep px-3 py-1.5 cursor-pointer">Logout</button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* @allow-inline-style - maxWidth varies per page layout variant */}
      <main className="w-full mx-auto px-6 py-8" style={{ maxWidth }}>
        {children}
      </main>
    </div>
  );
};
