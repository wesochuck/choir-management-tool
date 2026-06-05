import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ticketService, type TicketPurchase } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
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
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw' }}>
        <AppCard style={{ width: '100%', maxWidth: 'min(480px, calc(100vw - 32px))', textAlign: 'center', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Verifying Order...</h2>
          <p className="text-muted text-sm">Please wait while we confirm your transaction.</p>
          <div className="flex-col" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </AppCard>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
      <AppCard style={{ width: '100%', maxWidth: 'min(480px, calc(100vw - 32px))', textAlign: 'center', alignItems: 'center', gap: 'var(--space-md)' }}>
        <div style={{ fontSize: '4rem', color: 'var(--color-success-text)' }}>✓</div>
        <h1 className="text-display" style={{ margin: 0 }}>Thank You!</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Your purchase has been successfully processed.
        </p>

        {purchase ? (
          <div className="card flex-col" style={{ width: '100%', padding: 'var(--space-md)', gap: 'var(--space-xs)', backgroundColor: 'var(--neutral-bg)', textAlign: 'left' }}>
            <div className="flex-row" style={{ justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span className="text-muted">Order ID:</span>
              <strong>{purchase.id}</strong>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span className="text-muted">Will Call Name:</span>
              <strong>{purchase.buyerName}</strong>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span className="text-muted">Buyer Email:</span>
              <strong>{purchase.buyerEmail}</strong>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span className="text-muted">Quantity:</span>
              <strong>{purchase.quantity} ticket{purchase.quantity > 1 ? 's' : ''}</strong>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span className="text-muted">Amount Paid:</span>
              <strong>${(purchase.amountPaidCents / 100).toFixed(2)}</strong>
            </div>
            {purchase.expand?.event && (
              <div className="flex-col" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xs)', marginTop: 'var(--space-xs)', gap: '4px' }}>
                <span className="text-muted text-xs">Event Details</span>
                <strong>{purchase.expand.event.title}</strong>
                <span className="text-xs text-muted">
                  {new Date(purchase.expand.event.date).toLocaleString()}
                </span>
                {purchase.expand.event.eventGraphic && (
                  <img
                    src={pb.files.getURL(purchase.expand.event, purchase.expand.event.eventGraphic)}
                    alt={purchase.expand.event.title}
                    style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginTop: '4px' }}
                  />
                )}
              </div>
            )}
            <p className="text-xs text-muted" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xs)', marginTop: 'var(--space-xs)', margin: 0, textAlign: 'center' }}>
              A confirmation email has been sent. Your tickets will be held at Will Call on show day. Please bring a photo ID matching the buyer's name.
            </p>
          </div>
        ) : (
          <div className="flex-col" style={{ width: '100%', padding: 'var(--space-md)', backgroundColor: 'var(--neutral-bg)', borderRadius: 'var(--radius-md)' }}>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              We're finishing up enqueuing your confirmation email. You can safely navigate away. Your tickets are secured.
            </p>
          </div>
        )}

        <Link to="/tickets" className="btn btn-primary" style={{ textDecoration: 'none', width: '100%' }}>
          Back to Events
        </Link>
      </AppCard>
    </div>
  );
}
