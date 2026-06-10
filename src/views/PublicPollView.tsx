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
        
        let tz = 'America/New_York';
        try {
          const setting = await pb.collection('appSettings').getFirstListItem<{ value: { timezone?: string } }>('key = "timezone"');
          if (setting?.value?.timezone) tz = setting.value.timezone;
        } catch {
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
      <div className="flex flex-col min-h-screen w-screen bg-primary-light items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl animate-spin">🔄</div>
          <h2 className="text-primary-deep font-extrabold m-0">Loading Poll Details...</h2>
        </div>
      </div>
    );
  }

  if (status === 'error' || !pollData) {
    return (
      <div className="flex flex-col min-h-screen w-screen bg-[#fef2f2] items-center justify-center">
        <AppCard className="w-full max-w-[min(440px,calc(100vw-32px))] p-6 text-center border border-red-100">
          <div className="flex flex-col gap-4 items-center">
            <div className="text-5xl">⚠️</div>
            <h2 className="m-0 text-red-800 font-extrabold">Poll Request Failed</h2>
            <p className="text-text-muted leading-relaxed mt-1 m-0">
              {errorMessage}
            </p>
            <div className="mt-4 w-full flex flex-col gap-2">
              <a
                href="/login"
                className="btn btn-primary inline-flex w-full justify-center items-center no-underline h-11 font-bold"
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
    <div className="flex flex-col min-h-screen w-screen bg-primary-light items-center justify-start px-4 sm:px-6 py-6 lg:py-8">
      <div className="m-auto w-full max-w-[540px]">
        <AppCard className="w-full p-6 flex flex-col gap-6 border box-border">
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-1 pb-4 border-b border-border">
              <div className="text-5xl mb-2">📊</div>
              <h1 className="text-2xl font-extrabold m-0 text-primary-deep">
                Engagement Poll
              </h1>
              <p className="m-0 text-sm text-text-muted">
                Quick question for our choir members.
              </p>
            </div>

            <div className="flex flex-col gap-4 p-4 bg-[var(--neutral-bg,#f8fafc)] rounded-lg border border-border">
              <h2 className="m-0 text-lg font-bold text-center text-text-muted">
                {poll.question}
              </h2>

              {poll.event && (
                <div className="border-t border-border pt-2 mt-2 text-center">
                  <span className="text-xs text-text-muted uppercase font-bold">Related Event</span>
                  <div className="font-semibold">{poll.event.title}</div>
                  <div className="text-xs text-text-muted">
                    {formatInTimezone(poll.event.date, timezone, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-muted text-center font-semibold m-0">
                {hasResponded ? 'Your current response:' : 'Can you help or volunteer?'}
              </p>
              
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => handleSubmitResponse('Yes')}
                  disabled={isUpdating}
                  className={`btn flex-1 h-16 font-extrabold text-lg justify-center rounded-xl transition-all ${selectedResponse !== 'Yes' ? 'bg-[var(--primary-light,#f1f5f9)] text-text-muted border border-border' : ''}`}
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
                  className={`btn flex-1 h-16 font-extrabold text-lg justify-center rounded-xl transition-all ${selectedResponse !== 'No' ? 'bg-[var(--primary-light,#f1f5f9)] text-text-muted border border-border' : ''}`}
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
              <div className="text-center p-2 bg-green-50 rounded border border-green-200 text-green-800 font-semibold">
                ✓ Your response has been recorded. Thank you!
              </div>
            )}

            <div className="border-t border-border pt-4 text-center">
              <a href="/login" className="text-xs text-text-muted underline">
                Go to Member Portal
              </a>
            </div>
          </div>

        </AppCard>
      </div>
    </div>
  );
}
