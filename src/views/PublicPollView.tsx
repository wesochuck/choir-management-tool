import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { pollService, type PollDetails } from '../services/pollService';
import { formatInTimezone } from '../lib/timezone';
import { pb } from '../lib/pocketbase';
import { useDialog } from '../contexts/DialogContext';

export default function PublicPollView() {
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [pollData, setPollData] = useState<PollDetails | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<'Yes' | 'No' | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);
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
        
        // Resolve local tz if available
        let tz = 'America/New_York';
        try {
          const setting = await pb.collection('appSettings').getFirstListItem<{ value: { timezone?: string } }>('key = "timezone"');
          if (setting?.value?.timezone) tz = setting.value.timezone;
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

    setIsUpdating(true);
    try {
      await pollService.submitResponse(token, val);
      setSelectedResponse(val);
    } catch (err: unknown) {
      const errObj = err as { data?: { error?: string } } | null;
      await dialog.showMessage({
        title: 'Could not record response',
        message: errObj?.data?.error || 'Failed to record response. Please try again.',
        variant: 'danger',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="public-page public-page--primary">
        <div className="public-loading-container">
          <div className="public-loading-icon">🔄</div>
          <h2 className="public-loading-title">Loading Poll Details...</h2>
        </div>
      </div>
    );
  }

  if (status === 'error' || !pollData) {
    return (
      <div className="public-page public-page--error">
        <AppCard className="public-content-sm public-error-card">
          <div className="public-error-body">
            <div className="public-error-icon">⚠️</div>
            <h2 className="public-error-heading">Poll Request Failed</h2>
            <p className="public-error-text">
              {errorMessage}
            </p>
            <div className="public-error-actions">
              <a
                href="/login"
                className="btn btn-primary public-error-link"
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
    <div className="public-page public-page--primary public-page--top">
      <div className="public-content-lg">
        <AppCard className="public-main-card">
          
          <div className="flex-col" style-gap="lg">
            <div className="public-header">
              <div className="public-header-icon">📊</div>
              <h1 className="public-header-title">
                Engagement Poll
              </h1>
              <p className="public-header-subtitle text-muted">
                Quick question for our choir members.
              </p>
            </div>

            <div className="public-info-box">
              <h2 className="public-poll-question">
                {poll.question}
              </h2>

              {poll.event && (
                <div className="public-poll-event-divider">
                  <span className="text-muted public-poll-event-label">Related Event</span>
                  <div className="public-poll-event-title">{poll.event.title}</div>
                  <div className="text-muted public-poll-event-date">
                    {formatInTimezone(poll.event.date, timezone, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
            </div>

            <div className="public-section-gap-12">
              <p className="text-muted public-poll-prompt">
                {hasResponded ? 'Your current response:' : 'Can you help or volunteer?'}
              </p>
              
              <div className="public-poll-actions">
                <button
                  onClick={() => handleSubmitResponse('Yes')}
                  disabled={isUpdating}
                  className={`btn public-poll-btn ${selectedResponse !== 'Yes' ? 'public-poll-btn--unselected' : ''}`}
                  // @allow-inline-style - dynamic colors based on selectedResponse state
                  style={selectedResponse === 'Yes' ? {
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    border: '2px solid var(--primary-deep)',
                  } : undefined}
                >
                  {isUpdating && selectedResponse === 'Yes' ? '...' : 'Yes / Volunteer'}
                </button>
                <button
                  onClick={() => handleSubmitResponse('No')}
                  disabled={isUpdating}
                  className={`btn public-poll-btn ${selectedResponse !== 'No' ? 'public-poll-btn--unselected' : ''}`}
                  // @allow-inline-style - dynamic colors based on selectedResponse state
                  style={selectedResponse === 'No' ? {
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: '2px solid #991b1b',
                  } : undefined}
                >
                  {isUpdating && selectedResponse === 'No' ? '...' : 'No / Cannot'}
                </button>
              </div>
            </div>

            {hasResponded && (
              <div className="public-success-banner">
                ✓ Your response has been recorded. Thank you!
              </div>
            )}

            <div className="public-footer">
              <a href="/login" className="text-muted public-footer-link">
                Go to Member Portal
              </a>
            </div>
          </div>

        </AppCard>
      </div>
    </div>
  );
}
