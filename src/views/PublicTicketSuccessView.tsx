import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ticketService, type TicketPurchase } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { pb } from '../lib/pocketbase';

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
      <div className="flex flex-col min-h-screen justify-center items-center w-screen">
        <AppCard className="w-full max-w-[480px] text-center items-center">
          <h2 className="m-0">Verifying Order...</h2>
          <Spinner size="medium" />
          <p className="text-text-muted text-sm">Please wait while we confirm your transaction.</p>
          <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin" />
        </AppCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen justify-center items-center w-screen p-4">
      <AppCard className="w-full max-w-[480px] text-center items-center gap-4">
        <div className="text-6xl text-success-text">✓</div>
        <h1 className="text-display m-0">Thank You!</h1>
        <p className="text-text-muted m-0">
          Your purchase has been successfully processed.
        </p>

        {purchase ? (
          <div className="card w-full p-4 flex flex-col gap-1 bg-neutral-bg text-left">
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Order ID:</span>
              <strong>{purchase.id}</strong>
            </div>
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Will Call Name:</span>
              <strong>{purchase.buyerName}</strong>
            </div>
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Buyer Email:</span>
              <strong>{purchase.buyerEmail}</strong>
            </div>
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Quantity:</span>
              <strong>{purchase.quantity} {purchase.expand?.bundle ? 'Season Pass' : 'ticket'}{purchase.quantity > 1 ? (purchase.expand?.bundle ? 'es' : 's') : ''}</strong>
            </div>
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Amount Paid:</span>
              <strong>${(purchase.amountPaidCents / 100).toFixed(2)}</strong>
            </div>
            {purchase.expand?.bundle ? (
              <div className="border-t border-border pt-1 mt-1 flex flex-col gap-1">
                <span className="text-text-muted text-xs">Season Ticket Pass</span>
                <strong>{purchase.expand.bundle.title}</strong>
                <p className="text-xs text-text-muted m-0">
                  This pass grants Will Call admission to all performances included in this package.
                </p>
              </div>
            ) : purchase.expand?.event ? (
              <div className="border-t border-border pt-1 mt-1 flex flex-col gap-1">
                <span className="text-text-muted text-xs">Event Details</span>
                <strong>{purchase.expand.event.title}</strong>
                <span className="text-xs text-text-muted">
                  {new Date(purchase.expand.event.date).toLocaleString()}
                </span>
                {purchase.expand.event.eventGraphic && (
                  <img
                    src={pb.files.getURL(purchase.expand.event, purchase.expand.event.eventGraphic)}
                    alt={purchase.expand.event.title} className="w-full max-h-30 object-cover rounded-sm mt-1"
                  />
                )}
              </div>
            ) : null}
            <p className="text-xs text-text-muted border-t border-border pt-1 m-0 text-center">
              A confirmation email has been sent. Your tickets will be held at Will Call on show day. Please bring a photo ID matching the buyer's name.
            </p>
          </div>
        ) : (
          <div className="w-full p-4 bg-neutral-bg rounded-lg">
            <p className="text-text-muted text-sm m-0">
              We're finishing up enqueuing your confirmation email. You can safely navigate away. Your tickets are secured.
            </p>
          </div>
        )}

        <Button as={Link} to="/tickets" variant="primary" className="no-underline w-full">
          Back to Events
        </Button>
      </AppCard>
    </div>
  );
}
