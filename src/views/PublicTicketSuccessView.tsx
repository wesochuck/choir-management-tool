import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ticketService, type TicketPurchase } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { pb } from '../lib/pocketbase';
import './PublicForms.css';

export default function PublicTicketSuccessView() {
  useDocumentTitle('Order Confirmation');
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<TicketPurchase | null>(null);

  useEffect(() => {
    async function verifyOrder() {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        const record = await ticketService.pollForPurchaseRecord(sessionId);
        setPurchase(record);
      } catch (err) {
        console.error("Verification failed", err);
      } finally {
        setLoading(false);
      }
    }
    verifyOrder();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex-col pub-style-1">
        <AppCard className="pub-style-55">
          <h2 className="pub-style-6">Verifying Order...</h2>
          <Spinner size="medium" />
          <p className="text-muted text-sm">Please wait while we confirm your transaction.</p>
          <div className="flex-col pub-style-56" />
        </AppCard>
      </div>
    );
  }

  return (
    <div className="flex-col pub-style-2">
      <AppCard className="pub-style-57">
        <div className="pub-style-58">✓</div>
        <h1 className="text-display pub-style-6">Thank You!</h1>
        <p className="text-muted pub-style-6">
          Your purchase has been successfully processed.
        </p>

        {purchase ? (
          <div className="card flex-col pub-style-59">
            <div className="flex-row pub-style-38">
              <span className="text-muted">Order ID:</span>
              <strong>{purchase.id}</strong>
            </div>
            <div className="flex-row pub-style-38">
              <span className="text-muted">Will Call Name:</span>
              <strong>{purchase.buyerName}</strong>
            </div>
            <div className="flex-row pub-style-38">
              <span className="text-muted">Buyer Email:</span>
              <strong>{purchase.buyerEmail}</strong>
            </div>
            <div className="flex-row pub-style-38">
              <span className="text-muted">Quantity:</span>
              <strong>{purchase.quantity} {purchase.expand?.bundle ? 'Season Pass' : 'ticket'}{purchase.quantity > 1 ? (purchase.expand?.bundle ? 'es' : 's') : ''}</strong>
            </div>
            <div className="flex-row pub-style-38">
              <span className="text-muted">Amount Paid:</span>
              <strong>${(purchase.amountPaidCents / 100).toFixed(2)}</strong>
            </div>
            {purchase.expand?.bundle ? (
              <div className="flex-col pub-style-60">
                <span className="text-muted text-xs">Season Ticket Pass</span>
                <strong>{purchase.expand.bundle.title}</strong>
                <p className="text-xs text-muted pub-style-6">
                  This pass grants Will Call admission to all performances included in this package.
                </p>
              </div>
            ) : purchase.expand?.event ? (
              <div className="flex-col pub-style-60">
                <span className="text-muted text-xs">Event Details</span>
                <strong>{purchase.expand.event.title}</strong>
                <span className="text-xs text-muted">
                  {new Date(purchase.expand.event.date).toLocaleString()}
                </span>
                {purchase.expand.event.eventGraphic && (
                  <img
                    src={pb.files.getURL(purchase.expand.event, purchase.expand.event.eventGraphic)}
                    alt={purchase.expand.event.title} className="pub-style-61"
                  />
                )}
              </div>
            ) : null}
            <p className="text-xs text-muted pub-style-62">
              A confirmation email has been sent. Your tickets will be held at Will Call on show day. Please bring a photo ID matching the buyer's name.
            </p>
          </div>
        ) : (
          <div className="flex-col pub-style-63">
            <p className="text-muted text-sm pub-style-6">
              We're finishing up enqueuing your confirmation email. You can safely navigate away. Your tickets are secured.
            </p>
          </div>
        )}

        <Button as={Link} to="/tickets" variant="primary" className="pub-style-64">
          Back to Events
        </Button>
      </AppCard>
    </div>
  );
}
