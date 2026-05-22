import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { pb } from '../lib/pocketbase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function PublicUnsubscribeView() {
  useDocumentTitle('Unsubscribe');
  const [searchParams] = useSearchParams();
  let token = searchParams.get('token') || '';
  const pParam = searchParams.get('p');
  const sParam = searchParams.get('s');

  if (!token && pParam && sParam) {
    token = `p=${pParam}&s=${sParam}`;
  } else if (token && sParam && !token.includes('&s=')) {
    token = `${token}&s=${sParam}`;
  }
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid unsubscribe link. Missing secure verification token.');
      return;
    }

    const process = async () => {
      try {
        await pb.send('/api/unsubscribe', {
          method: 'POST',
          body: { token }
        });
        setStatus('success');
      } catch (err: unknown) {
        console.error('Unsubscribe error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('error');
        setErrorMessage(msg || 'Failed to process unsubscription. Please contact your choir administrator.');
      }
    };

    void process();
  }, [token]);

  return (
    <div className="container" style={{ maxWidth: '500px', paddingTop: '80px' }}>
      <AppCard title="Unsubscribe from Emails">
        <div className="flex-col" style={{ gap: 'var(--space-md)', textAlign: 'center' }}>
          {status === 'loading' && (
            <p className="text-muted">Processing your request...</p>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '3rem' }}>✅</div>
              <h3 className="text-headline">Unsubscribed Successfully</h3>
              <p className="text-muted">
                You have been unsubscribed from all future choir management emails.
              </p>
              <div style={{ marginTop: 'var(--space-md)' }}>
                <Link to="/login" className="btn btn-primary">Go to Login</Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '3rem' }}>❌</div>
              <h3 className="text-headline" style={{ color: 'var(--color-danger-text)' }}>Unsubscribe Failed</h3>
              <p className="text-muted">
                {errorMessage}
              </p>
              <div style={{ marginTop: 'var(--space-md)' }}>
                <Link to="/login" className="btn btn-ghost">Return to Site</Link>
              </div>
            </>
          )}
        </div>
      </AppCard>
    </div>
  );
}
