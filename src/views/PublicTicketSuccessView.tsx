import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ticketService, type TicketPurchase, type ScanContext } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { pb } from '../lib/pocketbase';
import { PublicBrandingWrapper } from '../components/common/PublicBrandingWrapper';

export default function PublicTicketSuccessView() {
  useDocumentTitle('Order Confirmation');
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<TicketPurchase | null>(null);
  const [scanContext, setScanContext] = useState<ScanContext | null>(null);

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

  useEffect(() => {
    async function fetchScanContext() {
      if (!purchase || !sessionId) return;
      try {
        const ctx = await ticketService.getScanContext(sessionId, purchase.id);
        setScanContext(ctx);
      } catch {
        // scan context unavailable — non-critical
      }
    }
    fetchScanContext();
  }, [purchase, sessionId]);

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
    <PublicBrandingWrapper showLogo={false}>
      <AppCard className="w-full max-w-[480px] items-center gap-4 text-center">
        <div className="text-6xl text-success-text">✓</div>
        <h1 className="text-display m-0">Thank You!</h1>
        <p className="m-0 text-text-muted">
          Your purchase has been successfully processed.
        </p>

        {purchase ? (
          <div className="flex w-full flex-col gap-1 rounded-xl border border-border bg-neutral-100 p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md">
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

        {scanContext && (
          <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
            <h3 className="m-0 text-sm font-bold uppercase text-text-muted">Your Ticket QR</h3>
            <img
              src={scanContext.qrDataUri}
              alt="Your ticket QR code"
              className="max-w-[240px] rounded-lg border border-slate-200 bg-white p-2"
            />
            <p className="m-0 text-center text-xs text-text-muted">
              Screenshot this — you'll need it at the door.
            </p>
          </div>
        )}

        <Button as={Link} to="/tickets" variant="primary" className="w-full no-underline">
          Back to Events
        </Button>
      </AppCard>
    </PublicBrandingWrapper>
  );
}
