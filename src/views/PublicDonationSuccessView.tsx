import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { donationService, type DonationRecord } from '../services/donationService';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function PublicDonationSuccessView() {
  useDocumentTitle('Donation Confirmation');
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [loading, setLoading] = useState(true);
  const [donation, setDonation] = useState<DonationRecord | null>(null);

  useEffect(() => {
    async function verifyDonation() {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        const record = await donationService.pollForDonationRecord(sessionId);
        setDonation(record);
      } catch (err) {
        console.error("Verification failed", err);
      } finally {
        setLoading(false);
      }
    }
    verifyDonation();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <AppCard className="w-full max-w-[480px] items-center text-center">
          <h2 className="m-0">Verifying Donation...</h2>
          <Spinner size="medium" />
          <p className="text-sm text-text-muted">Please wait while we confirm your contribution.</p>
          <div className="size-10 animate-spin rounded-full border-4 border-border border-t-primary" />
        </AppCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center p-4">
      <AppCard className="w-full max-w-[480px] items-center gap-4 text-center">
        <div className="text-6xl text-success-text">♥</div>
        <h1 className="text-display m-0">Thank You!</h1>
        <p className="m-0 text-text-muted">
          We have successfully processed your donation.
        </p>

        {donation ? (
          <div className="flex w-full flex-col gap-1 rounded-xl border border-border bg-neutral-100 p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md">
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
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1">
                <span className="text-xs text-text-muted">Tribute</span>
                <strong>{donation.tributeType === 'memory' ? 'In Memory of' : 'In Honor of'} {donation.tributeName}</strong>
              </div>
            )}
            <p className="m-0 border-t border-border pt-1 text-center text-xs text-text-muted">
              We are sending your receipt to your email now. You can safely close this page.
            </p>
          </div>
        ) : (
          <div className="w-full rounded-lg bg-neutral-100 p-4">
            <p className="m-0 text-sm text-text-muted">
              We are sending your receipt to your email now. You can safely close this page.
            </p>
          </div>
        )}

        <Button as={Link} to="/tickets" variant="primary" className="w-full no-underline">
          Back to Concerts
        </Button>
      </AppCard>
    </div>
  );
}
