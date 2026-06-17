import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../contexts/AuthContext';
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
          className="mx-auto flex items-center justify-between gap-6 px-6 py-3"
          // @allow-inline-style - dynamic maxWidth from props
          style={{ maxWidth }}
        >
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="border-border text-text-muted hover:bg-primary-light hover:text-primary-deep inline-flex h-[38px] items-center justify-center rounded-md border bg-transparent px-4 text-sm font-semibold whitespace-nowrap no-underline transition-all duration-200"
              title="Dashboard"
            >
              🏠 Home
            </Link>
          </div>
          {(actions || user?.role === 'admin') && (
            <div className="flex items-center gap-4">
              {actions}
              {user?.role === 'admin' && (
                <>
                  <Link
                    to="/profile"
                    className="border-border text-text-muted hover:bg-primary-light hover:text-primary-deep inline-flex items-center justify-center rounded-md border bg-transparent px-3 py-1.5 text-sm font-medium"
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="border-border text-text-muted hover:bg-primary-light hover:text-primary-deep inline-flex cursor-pointer items-center justify-center rounded-md border bg-transparent px-3 py-1.5 text-sm font-medium"
                  >
                    Logout
                  </button>
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
