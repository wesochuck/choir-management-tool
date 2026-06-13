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
    <div className="min-h-screen bg-bg">
      <header className="no-print sticky top-0 z-40 bg-bg border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <PublicLogo />
            <span className="text-lg font-semibold text-text">{choirName || 'Choir'}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/tickets" className={getLinkClass('/tickets')}>Tickets</Link>
            <Link to="/donate" className={getLinkClass('/donate')}>Donate</Link>
            <Link to="/auditions" className={getLinkClass('/auditions')}>Auditions</Link>
            <Link to="/history" className={getLinkClass('/history')}>History</Link>
            {user ? (
              <Link to="/dashboard">
                <Button variant="secondary" size="small">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="small">Login</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border py-6 text-center text-sm text-text-muted">
        {choirName && <p>&copy; {new Date().getFullYear()} {choirName}</p>}
      </footer>
    </div>
  );
};
