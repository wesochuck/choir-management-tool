import React, { useState } from 'react';
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
            <PublicLogo variant="header" />
            <span className="text-text text-lg font-semibold">{choirName || 'Choir'}</span>
          </Link>

          <button
            type="button"
            className="text-text-muted hover:text-text inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent p-0 transition-colors md:hidden"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileNavOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>

          <nav className="hidden items-center gap-4 md:flex">
            <Link to="/tickets" className={getLinkClass('/tickets')}>
              Tickets
            </Link>
            <Link to="/donate" className={getLinkClass('/donate')}>
              Donate
            </Link>
            <Link to="/auditions" className={getLinkClass('/auditions')}>
              Auditions
            </Link>
            <Link to="/performances" className={getLinkClass('/performances')}>
              Performances
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

        {mobileNavOpen && (
          <div className="border-border bg-bg flex flex-col gap-1 border-t px-6 py-3 md:hidden">
            <Link
              to="/tickets"
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/tickets' ? 'bg-primary-light text-primary-deep' : 'text-text-muted hover:bg-primary-light/50 hover:text-text'}`}
              onClick={() => setMobileNavOpen(false)}
            >
              Tickets
            </Link>
            <Link
              to="/donate"
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/donate' ? 'bg-primary-light text-primary-deep' : 'text-text-muted hover:bg-primary-light/50 hover:text-text'}`}
              onClick={() => setMobileNavOpen(false)}
            >
              Donate
            </Link>
            <Link
              to="/auditions"
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/auditions' ? 'bg-primary-light text-primary-deep' : 'text-text-muted hover:bg-primary-light/50 hover:text-text'}`}
              onClick={() => setMobileNavOpen(false)}
            >
              Auditions
            </Link>
            <Link
              to="/performances"
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/performances' ? 'bg-primary-light text-primary-deep' : 'text-text-muted hover:bg-primary-light/50 hover:text-text'}`}
              onClick={() => setMobileNavOpen(false)}
            >
              Performances
            </Link>
            <Link
              to="/history"
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/history' ? 'bg-primary-light text-primary-deep' : 'text-text-muted hover:bg-primary-light/50 hover:text-text'}`}
              onClick={() => setMobileNavOpen(false)}
            >
              History
            </Link>
            <div className="border-border/50 border-t pt-2">
              {user ? (
                <Link to="/dashboard" onClick={() => setMobileNavOpen(false)}>
                  <Button variant="secondary" size="small" className="w-full">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/login" onClick={() => setMobileNavOpen(false)}>
                  <Button variant="primary" size="small" className="w-full">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
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
