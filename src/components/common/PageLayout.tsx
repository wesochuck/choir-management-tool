import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui';
interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  actions,
  maxWidth = '1200px',
}) => {
  useDocumentTitle(title);
  const { user, logout } = useAuth();

  return (
    <div className="bg-bg min-h-screen">
      <header className="no-print border-border bg-surface sticky top-0 z-40 border-b shadow-sm">
        <div
          className="mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
          // @allow-inline-style - dynamic maxWidth from props
          style={{ maxWidth }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Button as={Link} to="/dashboard" variant="outline" size="default" title="Dashboard">
              <span aria-hidden="true">🏠</span>
              <span>Home</span>
            </Button>
          </div>
          {(actions || user?.role === 'admin') && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {actions}
              {user?.role === 'admin' && (
                <>
                  <Button as={Link} to="/profile" variant="ghost" size="default">
                    My Profile
                  </Button>
                  <Button type="button" variant="outline" size="default" onClick={logout}>
                    Logout
                  </Button>
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
