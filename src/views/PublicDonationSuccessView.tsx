import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { donationService, type DonationRecord } from '../services/donationService';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Card } from '../components/ui/Card/Card';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './PublicForms.css';

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
      <div className="flex-col pub-style-1">
        <AppCard className="pub-style-55">
          <h2 className="pub-style-6">Verifying Donation...</h2>
          <Spinner size="medium" />
          <p className="text-muted text-sm">Please wait while we confirm your contribution.</p>
          <div className="flex-col pub-style-56" />
        </AppCard>
      </div>
    );
  }

  return (
    <div className="flex-col pub-style-2">
      <AppCard className="pub-style-57">
        <div className="pub-style-58">♥</div>
        <h1 className="text-display pub-style-6">Thank You!</h1>
        <p className="text-muted pub-style-6">
          We have successfully processed your donation.
        </p>

        {donation ? (
          <Card className="pub-style-59">
            <div className="flex-row pub-style-38">
              <span className="text-muted">Transaction ID:</span>
              <strong>{donation.id}</strong>
            </div>
            <div className="flex-row pub-style-38">
              <span className="text-muted">Donor Name:</span>
              <strong>{donation.donorName}</strong>
            </div>
            <div className="flex-row pub-style-38">
              <span className="text-muted">Donor Email:</span>
              <strong>{donation.donorEmail}</strong>
            </div>
            <div className="flex-row pub-style-38">
              <span className="text-muted">Amount Contributed:</span>
              <strong>${(donation.amountPaidCents / 100).toFixed(2)}</strong>
            </div>
            {donation.tributeType !== 'none' && (
              <div className="flex-col pub-style-60">
                <span className="text-muted text-xs">Tribute</span>
                <strong>{donation.tributeType === 'memory' ? 'In Memory of' : 'In Honor of'} {donation.tributeName}</strong>
              </div>
            )}
            <p className="text-xs text-muted pub-style-62">
              We are sending your receipt to your email now. You can safely close this page.
            </p>
          </Card>
        ) : (
          <div className="flex-col pub-style-63">
            <p className="text-muted text-sm pub-style-6">
              We are sending your receipt to your email now. You can safely close this page.
            </p>
          </div>
        )}

        <Button as={Link} to="/tickets" variant="primary" className="pub-style-64">
          Back to Concerts
        </Button>
      </AppCard>
    </div>
  );
}
