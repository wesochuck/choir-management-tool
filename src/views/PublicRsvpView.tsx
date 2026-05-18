import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { pb } from '../lib/pocketbase';

export default function PublicRsvpView() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const rsvpValue = searchParams.get('rsvp');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token || !rsvpValue) {
      setStatus('error');
      setErrorMessage('Invalid RSVP link. Missing token or RSVP value.');
      return;
    }

    const processRsvp = async () => {
      try {
        await pb.send('/api/quick-rsvp', {
          method: 'POST',
          body: { token, rsvp: rsvpValue }
        });
        setStatus('success');
      } catch (err: unknown) {
        setStatus('error');
        const errObj = err as { data?: { error?: string } } | null;
        setErrorMessage(errObj?.data?.error || 'Failed to record RSVP. The event might be closed or the link expired.');
      }
    };

    processRsvp();
  }, [token, rsvpValue]);

  return (
    <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
      <AppCard style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        {status === 'loading' && (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <h2 style={{ margin: 0 }}>Processing RSVP...</h2>
            <p className="text-muted">Please wait while we record your response.</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h2 style={{ margin: 0 }}>Thank You!</h2>
            <p className="text-body" style={{ margin: 0 }}>
              Your RSVP has been recorded successfully as <strong>{rsvpValue}</strong>.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div style={{ fontSize: '3rem' }}>❌</div>
            <h2 style={{ margin: 0, color: 'var(--color-danger-text)' }}>RSVP Failed</h2>
            <p className="text-body" style={{ margin: 0 }}>
              {errorMessage}
            </p>
          </div>
        )}
      </AppCard>
    </div>
  );
}
