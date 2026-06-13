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
  children, title, actions, maxWidth = '1200px' 
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
      <header className="no-print sticky top-0 z-40 border-b border-border bg-surface shadow-sm">
        <div 
          className="mx-auto flex items-center justify-between gap-6 px-6 py-3" 
          // @allow-inline-style - dynamic maxWidth from props
          style={{ maxWidth }}
        >
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="inline-flex h-[38px] items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-semibold whitespace-nowrap text-text-muted no-underline transition-all duration-200 hover:bg-primary-light hover:text-primary-deep" title="Dashboard">🏠 Home</Link>
          </div>
          {(actions || user?.role === 'admin') && (
            <div className="flex items-center gap-4">
              {actions}
              {user?.role === 'admin' && (
                <>
                  <Link to="/profile" className="inline-flex items-center justify-center rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-primary-light hover:text-primary-deep">My Profile</Link>
                  <button onClick={handleLogout} className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-primary-light hover:text-primary-deep">Logout</button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main 
        className="mx-auto w-full px-6 py-8" 
        // @allow-inline-style - dynamic maxWidth from props
        style={{ maxWidth }}
      >
        {children}
      </main>
    </div>
  );
};
