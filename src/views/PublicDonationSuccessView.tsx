import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { donationService } from '../services/donationService';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PublicBrandingWrapper } from '../components/common/PublicBrandingWrapper';
import { queryKeys } from '../lib/queryKeys';
import { useSetup } from '../contexts/SetupContext';

export default function PublicDonationSuccessView() {
  useDocumentTitle('Donation Confirmation');
  const { enabledModules } = useSetup();
  const ticketsEnabled = enabledModules.has('ticketSales');
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';

  const donationQuery = useQuery({
    queryKey: queryKeys.donations.verify(sessionId),
    queryFn: () => donationService.pollForDonationRecord(sessionId),
    enabled: !!sessionId,
    refetchInterval: (query) => (query.state.data ? false : 3000),
  });

  const donation = donationQuery.data ?? null;
  const loading = !!sessionId && donationQuery.isPending;

  if (loading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <AppCard className="w-full max-w-[480px] items-center text-center">
          <h2 className="m-0">Verifying Donation...</h2>
          <Spinner size="medium" />
          <p className="text-text-muted text-sm">Please wait while we confirm your contribution.</p>
          <div className="border-border border-t-primary size-10 animate-spin rounded-full border-4" />
        </AppCard>
      </div>
    );
  }

  return (
    <PublicBrandingWrapper showLogo={false}>
      <AppCard className="w-full max-w-[480px] items-center gap-4 text-center">
        <div className="text-success-text text-6xl">♥</div>
        <h1 className="text-display m-0">Thank You!</h1>
        <p className="text-text-muted m-0">We have successfully processed your donation.</p>

        {donation ? (
          <div className="border-border flex w-full flex-col gap-1 rounded-xl border bg-neutral-100 p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Transaction ID:</span>
              <strong>{donation.id}</strong>
            </div>
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Donor Name:</span>
              <strong>{donation.donorName}</strong>
            </div>
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Donor Email:</span>
              <strong>{donation.donorEmail}</strong>
            </div>
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Amount Contributed:</span>
              <strong>${(donation.amountPaidCents / 100).toFixed(2)}</strong>
            </div>
            {donation.tributeType !== 'none' && (
              <div className="border-border mt-1 flex flex-col gap-1 border-t pt-1">
                <span className="text-text-muted text-xs">Tribute</span>
                <strong>
                  {donation.tributeType === 'memory' ? 'In Memory of' : 'In Honor of'}{' '}
                  {donation.tributeName}
                </strong>
              </div>
            )}
            <p className="border-border text-text-muted m-0 border-t pt-1 text-center text-xs">
              We are sending your receipt to your email now. You can safely close this page.
            </p>
          </div>
        ) : (
          <div className="w-full rounded-lg bg-neutral-100 p-4">
            <p className="text-text-muted m-0 text-sm">
              We are sending your receipt to your email now. You can safely close this page.
            </p>
          </div>
        )}

        {ticketsEnabled && (
          <Button as={Link} to="/tickets" variant="primary" className="w-full no-underline">
            Back to Concerts
          </Button>
        )}
      </AppCard>
    </PublicBrandingWrapper>
  );
}
