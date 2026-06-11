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
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <AppCard className="w-full max-w-[480px] items-center text-center">
          <h2 className="m-0">Verifying Order...</h2>
          <Spinner size="medium" />
          <p className="text-sm text-text-muted">Please wait while we confirm your transaction.</p>
          <div className="size-10 animate-spin rounded-full border-4 border-border border-t-primary" />
        </AppCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center p-4">
      <AppCard className="w-full max-w-[480px] items-center gap-4 text-center">
        <div className="text-6xl text-success-text">✓</div>
        <h1 className="text-display m-0">Thank You!</h1>
        <p className="m-0 text-text-muted">
          Your purchase has been successfully processed.
        </p>

        {purchase ? (
          <div className="card flex w-full flex-col gap-1 bg-neutral-100 p-4 text-left">
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
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1">
                <span className="text-xs text-text-muted">Season Ticket Pass</span>
                <strong>{purchase.expand.bundle.title}</strong>
                <p className="m-0 text-xs text-text-muted">
                  This pass grants Will Call admission to all performances included in this package.
                </p>
              </div>
            ) : purchase.expand?.event ? (
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1">
                <span className="text-xs text-text-muted">Event Details</span>
                <strong>{purchase.expand.event.title}</strong>
                <span className="text-xs text-text-muted">
                  {new Date(purchase.expand.event.date).toLocaleString()}
                </span>
                {purchase.expand.event.eventGraphic && (
                  <img
                    src={pb.files.getURL(purchase.expand.event, purchase.expand.event.eventGraphic)}
                    alt={purchase.expand.event.title} className="mt-1 max-h-30 w-full rounded-sm object-cover"
                  />
                )}
              </div>
            ) : null}
            <p className="m-0 border-t border-border pt-1 text-center text-xs text-text-muted">
              A confirmation email has been sent. Your tickets will be held at Will Call on show day. Please bring a photo ID matching the buyer's name.
            </p>
          </div>
        ) : (
          <div className="w-full rounded-lg bg-neutral-100 p-4">
            <p className="m-0 text-sm text-text-muted">
              We're finishing up enqueuing your confirmation email. You can safely navigate away. Your tickets are secured.
            </p>
          </div>
        )}

        <Button as={Link} to="/tickets" variant="primary" className="w-full no-underline">
          Back to Events
        </Button>
      </AppCard>
    </div>
  );
}
