import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Spinner } from '../components/ui/Spinner/Spinner';
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
          body: { token },
        });
        setStatus('success');
      } catch (err: unknown) {
        console.error('Unsubscribe error:', err);
        setStatus('error');
        setErrorMessage(
          'This unsubscribe link is invalid or has expired. Please contact a choir administrator if you need help updating your message preferences.'
        );
      }
    };

    void process();
  }, [token]);

  return (
    <div className="bg-bg flex min-h-screen w-screen flex-col items-center justify-start px-4 pt-20">
      <AppCard title="Unsubscribe from Emails" className="w-full max-w-[500px]">
        <div className="flex flex-col gap-4 text-center">
          {status === 'loading' && (
            <div className="text-text-muted flex flex-row items-center gap-2">
              <Spinner size="small" /> Processing your request...
            </div>
          )}

          {status === 'success' && (
            <>
              <div className="text-4xl">✅</div>
              <h3 className="text-headline">Unsubscribed Successfully</h3>
              <p className="text-text-muted">
                You have been unsubscribed from all future choir management emails.
              </p>
              <div className="mt-4">
                <Button as={Link} to="/login" variant="primary">
                  Go to Login
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-4xl">❌</div>
              <h3 className="text-headline text-danger-text">Unsubscribe Failed</h3>
              <p className="text-text-muted">{errorMessage}</p>
              <div className="mt-4">
                <Button as={Link} to="/login" variant="outline">
                  Return to Site
                </Button>
              </div>
            </>
          )}
        </div>
      </AppCard>
    </div>
  );
}
