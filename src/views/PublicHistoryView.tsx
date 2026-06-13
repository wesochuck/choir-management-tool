import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAuth } from '../contexts/AuthContext';
import { settingsService, type LandingPageSettings } from '../services/settingsService';
import { useChoirName } from '../hooks/useDocumentTitle';
import PublicLogo from '../components/common/PublicLogo';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';

function PublicHistoryView() {
  const { user } = useAuth();
  const { choirName } = useChoirName();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<LandingPageSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await settingsService.getLandingSettings();
        setSettings(s);
      } catch (err: unknown) {
        console.error('Failed to load history page data', err);
        setError('Unable to load page content. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted">{error || 'Unable to load page.'}</p>
      </div>
    );
  }

  const historyHtml = settings.historyText
    ? DOMPurify.sanitize(marked.parse(settings.historyText, { async: false }) as string)
    : '';

  return (
    <div className="min-h-screen bg-bg">
      <header className="no-print sticky top-0 z-40 bg-bg border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <PublicLogo />
            <span className="text-lg font-semibold text-text">{choirName || 'Choir'}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/tickets" className="text-sm text-text-muted hover:text-text">Tickets</Link>
            <Link to="/donate" className="text-sm text-text-muted hover:text-text">Donate</Link>
            <Link to="/auditions" className="text-sm text-text-muted hover:text-text">Auditions</Link>
            <Link to="/history" className="text-sm font-medium text-text">History</Link>
            {user ? (
              <Link to="/dashboard">
                <Button variant="secondary" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">Login</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-3xl mx-auto px-6 py-16">
          <AppCard title="Our History">
            {settings.historyText ? (
              <div
                className="prose prose-sm max-w-none text-text"
                dangerouslySetInnerHTML={{ __html: historyHtml }}
              />
            ) : (
              <p className="text-text-muted">No history has been published yet.</p>
            )}
          </AppCard>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-text-muted">
        {choirName && <p>&copy; {new Date().getFullYear()} {choirName}</p>}
      </footer>
    </div>
  );
}

export default PublicHistoryView;
