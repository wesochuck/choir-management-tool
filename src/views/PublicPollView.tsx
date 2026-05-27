import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { pollService, type PollDetails } from '../services/pollService';
import { formatInTimezone } from '../lib/timezone';
import { settingsService } from '../services/settingsService';
import { TokenUrlFactory } from '../lib/tokenUrlUtils';

export default function PublicPollView() {
  const [searchParams] = useSearchParams();
  const token = TokenUrlFactory.extractTokenFromSearchParams(searchParams) || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [pollData, setPollData] = useState<PollDetails | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<'Yes' | 'No' | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  useDocumentTitle(pollData?.poll.question ? `Poll: ${pollData.poll.question}` : 'Engagement Poll');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid poll link. Missing secure verification token.');
      return;
    }

    const loadDetails = async () => {
      try {
        const res = await pollService.getPollDetails(token);
        
        let tz = 'America/New_York';
        try {
          tz = await settingsService.getTimezone();
        } catch {
          // Fallback to default America/New_York
        }

        setPollData(res);
        setSelectedResponse(res.currentStatus);
        setTimezone(tz);
        setStatus('success');
      } catch (err: unknown) {
        setStatus('error');
        const errObj = err as { data?: { error?: string } } | null;
        setErrorMessage(
          errObj?.data?.error || 
          'Failed to load poll details. The link may have expired or is invalid.'
        );
      }
    };

    void loadDetails();
  }, [token]);

  const handleSubmitResponse = async (val: 'Yes' | 'No') => {
    if (!token || isUpdating) return;

    setSubmitError('');
    setIsUpdating(true);
    try {
      await pollService.submitResponse(token, val);
      setSubmitError('');
      setSelectedResponse(val);
    } catch (err: unknown) {
      const errObj = err as { data?: { error?: string } } | null;
      setSubmitError(errObj?.data?.error || 'Failed to record response. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', backgroundColor: 'var(--primary-light)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite' }}>🔄</div>
          <h2 style={{ color: 'var(--primary-deep)', fontWeight: 800, margin: 0 }}>Loading Poll Details...</h2>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (status === 'error' || !pollData) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', backgroundColor: '#fef2f2', padding: 'var(--space-md)' }}>
        <AppCard style={{ width: '100%', maxWidth: '440px', padding: 'var(--space-xl)', textAlign: 'center', border: '1px solid #fee2e2' }}>
          <div className="flex-col" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
            <div style={{ fontSize: '3.5rem' }}>⚠️</div>
            <h2 style={{ margin: 0, color: '#991b1b', fontWeight: 800 }}>Poll Request Failed</h2>
            <p className="text-body" style={{ color: 'var(--neutral-text)', lineHeight: 1.6, margin: 'var(--space-xs) 0 0 0' }}>
              {errorMessage}
            </p>
            <div style={{ marginTop: 'var(--space-md)', width: '100%' }}>
              <a 
                href="/login" 
                className="btn btn-primary" 
                style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', height: '44px', fontWeight: 700 }}
              >
                Sign In to Member Portal
              </a>
            </div>
          </div>
        </AppCard>
      </div>
    );
  }

  const { poll } = pollData;
  const hasResponded = selectedResponse !== '';

  return (
    <div className="flex-col" style={{ minHeight: '100vh', width: '100vw', backgroundColor: 'var(--primary-light)', padding: 'var(--space-lg) var(--space-md)', boxSizing: 'border-box' }}>
      <div style={{ margin: 'auto', width: '100%', maxWidth: '540px' }}>
        <AppCard style={{ width: '100%', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', border: '1px solid rgba(74, 117, 89, 0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
          
          <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            <div className="flex-col" style={{ alignItems: 'center', textAlign: 'center', gap: 'var(--space-xs)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>📊</div>
              <h1 className="text-display" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--primary-deep)' }}>
                Engagement Poll
              </h1>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
                Quick question for our choir members.
              </p>
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md)', backgroundColor: 'var(--neutral-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, textAlign: 'center', color: 'var(--neutral-text)' }}>
                {poll.question}
              </h2>

              {poll.event && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)', textAlign: 'center' }}>
                  <span className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Related Event</span>
                  <div style={{ fontWeight: 600 }}>{poll.event.title}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {formatInTimezone(poll.event.date, timezone, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-col" style={{ gap: '12px' }}>
              <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0, textAlign: 'center', fontWeight: 600 }}>
                {hasResponded ? 'Your current response:' : 'Can you help or volunteer?'}
              </p>
              
              <div style={{ display: 'flex', gap: 'var(--space-sm)', width: '100%' }}>
                <button
                  onClick={() => handleSubmitResponse('Yes')}
                  disabled={isUpdating}
                  className="btn"
                  style={{
                    flex: 1,
                    height: '64px',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    justifyContent: 'center',
                    backgroundColor: selectedResponse === 'Yes' ? 'var(--primary)' : '#f1f5f9',
                    color: selectedResponse === 'Yes' ? 'white' : 'var(--neutral-muted)',
                    border: selectedResponse === 'Yes' ? '2px solid var(--primary-deep)' : '1px solid var(--border)',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isUpdating && selectedResponse === 'Yes' ? '...' : 'Yes / Volunteer'}
                </button>
                <button
                  onClick={() => handleSubmitResponse('No')}
                  disabled={isUpdating}
                  className="btn"
                  style={{
                    flex: 1,
                    height: '64px',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    justifyContent: 'center',
                    backgroundColor: selectedResponse === 'No' ? '#ef4444' : '#f1f5f9',
                    color: selectedResponse === 'No' ? 'white' : 'var(--neutral-muted)',
                    border: selectedResponse === 'No' ? '2px solid #991b1b' : '1px solid var(--border)',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isUpdating && selectedResponse === 'No' ? '...' : 'No / Cannot'}
                </button>
              </div>
            </div>


            {submitError && (
              <div style={{ textAlign: 'center', padding: 'var(--space-sm)', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca', color: '#991b1b', fontWeight: 600 }}>
                {submitError}
              </div>
            )}

            {hasResponded && (
              <div style={{ textAlign: 'center', padding: 'var(--space-sm)', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)', border: '1px solid #d1fae5', color: '#065f46', fontWeight: 600 }}>
                ✓ Your response has been recorded. Thank you!
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)', textAlign: 'center' }}>
              <a href="/login" className="text-muted" style={{ fontSize: '0.85rem', textDecoration: 'underline' }}>
                Go to Member Portal
              </a>
            </div>
          </div>

        </AppCard>
      </div>
    </div>
  );
}
