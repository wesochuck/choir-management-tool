import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
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

  const unsubscribeMutation = useMutation({
    mutationFn: (tkn: string) =>
      pb.send('/api/unsubscribe', {
        method: 'POST',
        body: { token: tkn },
      }),
  });

  useEffect(() => {
    if (token) unsubscribeMutation.mutate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="bg-bg flex min-h-screen w-screen flex-col items-center justify-start px-4 pt-20">
      <AppCard title="Unsubscribe from Emails" className="w-full max-w-[500px]">
        <div className="flex flex-col gap-4 text-center">
          {!token && (
            <>
              <div className="text-4xl">❌</div>
              <h3 className="text-headline text-danger-text">Unsubscribe Failed</h3>
              <p className="text-text-muted">
                Invalid unsubscribe link. Missing secure verification token.
              </p>
              <div className="mt-4">
                <Button as={Link} to="/login" variant="outline">
                  Return to Site
                </Button>
              </div>
            </>
          )}

          {!!token && !unsubscribeMutation.isSuccess && !unsubscribeMutation.isError && (
            <div className="text-text-muted flex flex-row items-center gap-2">
              <Spinner size="small" /> Processing your request...
            </div>
          )}

          {unsubscribeMutation.isSuccess && (
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

          {unsubscribeMutation.isError && (
            <>
              <div className="text-4xl">❌</div>
              <h3 className="text-headline text-danger-text">Unsubscribe Failed</h3>
              <p className="text-text-muted">
                This unsubscribe link is invalid or has expired. Please contact a choir administrator if you need help updating your message preferences.
              </p>
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
