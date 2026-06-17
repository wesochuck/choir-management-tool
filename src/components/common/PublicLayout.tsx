import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChoirName } from '../../hooks/useDocumentTitle';
import PublicLogo from './PublicLogo';
import { Button } from '../ui/Button/Button';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { choirName } = useChoirName();
  const location = useLocation();

  const getLinkClass = (path: string) => {
    return location.pathname === path
      ? 'text-sm font-medium text-text'
      : 'text-sm text-text-muted hover:text-text';
  };

  return (
    <div className="bg-bg min-h-screen">
      <header className="no-print bg-bg border-border sticky top-0 z-40 border-b shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <PublicLogo />
            <span className="text-text text-lg font-semibold">{choirName || 'Choir'}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/tickets" className={getLinkClass('/tickets')}>
              Tickets
            </Link>
            <Link to="/donate" className={getLinkClass('/donate')}>
              Donate
            </Link>
            <Link to="/auditions" className={getLinkClass('/auditions')}>
              Auditions
            </Link>
            <Link to="/history" className={getLinkClass('/history')}>
              History
            </Link>
            {user ? (
              <Link to="/dashboard">
                <Button variant="secondary" size="small">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="small">
                  Login
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-border text-text-muted border-t py-6 text-center text-sm">
        {choirName && (
          <p>
            &copy; {new Date().getFullYear()} {choirName}
          </p>
        )}
      </footer>
    </div>
  );
};
