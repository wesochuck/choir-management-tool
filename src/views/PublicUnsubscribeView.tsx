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
        setStatus('error');
        setErrorMessage('This unsubscribe link is invalid or has expired. Please contact a choir administrator if you need help updating your message preferences.');
      }
    };

    void process();
  }, [token]);

  return (
    <div className="public-unsubscribe-container">
      <AppCard title="Unsubscribe from Emails">
        <div className="public-unsubscribe-body">
          {status === 'loading' && (
            <p className="text-muted">Processing your request...</p>
          )}

          {status === 'success' && (
            <>
              <div className="public-emoji-lg">✅</div>
              <h3 className="text-headline">Unsubscribed Successfully</h3>
              <p className="text-muted">
                You have been unsubscribed from all future choir management emails.
              </p>
              <div className="public-margin-top-md">
                <Link to="/login" className="btn btn-primary">Go to Login</Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="public-emoji-lg">❌</div>
              <h3 className="text-headline public-unsubscribe-error-title">Unsubscribe Failed</h3>
              <p className="text-muted">
                {errorMessage}
              </p>
              <div className="public-margin-top-md">
                <Link to="/login" className="btn btn-ghost">Return to Site</Link>
              </div>
            </>
          )}
        </div>
      </AppCard>
    </div>
  );
}
