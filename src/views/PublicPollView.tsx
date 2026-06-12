import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { pollService, type PollDetails } from '../services/pollService';
import { formatInTimezone } from '../lib/timezone';
import { pb } from '../lib/pocketbase';
import { useDialog } from '../contexts/DialogContext';
import { Button } from '../components/ui';

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
          // ignore error and fallback to default timezone
          void 0;
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
      <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-primary-light">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin text-4xl">🔄</div>
          <h2 className="m-0 font-extrabold text-primary-deep">Loading Poll Details...</h2>
        </div>
      </div>
    );
  }

  if (status === 'error' || !pollData) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-[#fef2f2]">
        <AppCard className="w-full max-w-[min(440px,calc(100vw-32px))] border border-red-100 p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl">⚠️</div>
            <h2 className="m-0 font-extrabold text-red-800">Poll Request Failed</h2>
            <p className="m-0 mt-1 leading-relaxed text-text-muted">
              {errorMessage}
            </p>
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button
                as="a"
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center font-bold no-underline"
                variant="primary"
              >
                Sign In to Member Portal
              </Button>
            </div>
          </div>
        </AppCard>
      </div>
    );
  }

  const { poll } = pollData;
  const hasResponded = selectedResponse !== '';

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-start bg-primary-light px-4 py-6 sm:px-6 lg:py-8">
      <div className="m-auto w-full max-w-[540px]">
        <AppCard className="box-border flex w-full flex-col gap-6 border p-6">
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-1 border-b border-border pb-4 text-center">
              <div className="mb-2 text-5xl">📊</div>
              <h1 className="m-0 text-2xl font-extrabold text-primary-deep">
                Engagement Poll
              </h1>
              <p className="m-0 text-sm text-text-muted">
                Quick question for our choir members.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-lg border border-border bg-[var(--neutral-bg,#f8fafc)] p-4">
              <h2 className="m-0 text-center text-lg font-bold text-text-muted">
                {poll.question}
              </h2>

              {poll.event && (
                <div className="mt-2 border-t border-border pt-2 text-center">
                  <span className="text-xs font-bold text-text-muted uppercase">Related Event</span>
                  <div className="font-semibold">{poll.event.title}</div>
                  <div className="text-xs text-text-muted">
                    {formatInTimezone(poll.event.date, timezone, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <p className="m-0 text-center text-sm font-semibold text-text-muted">
                {hasResponded ? 'Your current response:' : 'Can you help or volunteer?'}
              </p>
              
              <div className="flex w-full gap-2">
                <Button
                  onClick={() => handleSubmitResponse('Yes')}
                  disabled={isUpdating}
                  variant={selectedResponse === 'Yes' ? 'primary' : 'secondary'}
                  className={`h-16 flex-1 justify-center rounded-xl text-lg font-extrabold transition-all ${
                    selectedResponse === 'Yes'
                      ? 'border-2 border-primary-deep'
                      : 'border border-border bg-[var(--primary-light,#f1f5f9)] text-text-muted hover:bg-slate-200'
                  }`}
                >
                  {isUpdating && selectedResponse === 'Yes' ? '...' : 'Yes / Volunteer'}
                </Button>
                <Button
                  onClick={() => handleSubmitResponse('No')}
                  disabled={isUpdating}
                  className={`h-16 flex-1 justify-center rounded-xl text-lg font-extrabold transition-all ${
                    selectedResponse === 'No'
                      ? 'bg-[#ef4444] text-white border-2 border-[#991b1b] hover:bg-[#dc2626]'
                      : 'border border-border bg-[var(--primary-light,#f1f5f9)] text-text-muted hover:bg-slate-200'
                  }`}
                >
                  {isUpdating && selectedResponse === 'No' ? '...' : 'No / Cannot'}
                </Button>
              </div>
            </div>

            {hasResponded && (
              <div className="rounded border border-green-200 bg-green-50 p-2 text-center font-semibold text-green-800">
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
