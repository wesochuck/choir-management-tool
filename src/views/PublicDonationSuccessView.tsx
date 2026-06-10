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
      <div className="flex flex-col min-h-screen justify-center items-center w-screen">
        <AppCard className="w-full max-w-[480px] text-center items-center">
          <h2 className="m-0">Verifying Donation...</h2>
          <Spinner size="medium" />
          <p className="text-text-muted text-sm">Please wait while we confirm your contribution.</p>
          <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin" />
        </AppCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen justify-center items-center w-screen p-4">
      <AppCard className="w-full max-w-[480px] text-center items-center gap-4">
        <div className="text-6xl text-success-text">♥</div>
        <h1 className="text-display m-0">Thank You!</h1>
        <p className="text-text-muted m-0">
          We have successfully processed your donation.
        </p>

        {donation ? (
          <div className="card w-full p-4 flex flex-col gap-1 bg-neutral-bg text-left">
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
              <div className="border-t border-border pt-1 mt-1 flex flex-col gap-1">
                <span className="text-text-muted text-xs">Tribute</span>
                <strong>{donation.tributeType === 'memory' ? 'In Memory of' : 'In Honor of'} {donation.tributeName}</strong>
              </div>
            )}
            <p className="text-xs text-text-muted border-t border-border pt-1 m-0 text-center">
              We are sending your receipt to your email now. You can safely close this page.
            </p>
          </div>
        ) : (
          <div className="w-full p-4 bg-neutral-bg rounded-lg">
            <p className="text-text-muted text-sm m-0">
              We are sending your receipt to your email now. You can safely close this page.
            </p>
          </div>
        )}

        <Button as={Link} to="/tickets" variant="primary" className="no-underline w-full">
          Back to Concerts
        </Button>
      </AppCard>
    </div>
  );
}
