import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { ticketService, type TicketBundle } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';

export default function PublicBundlePurchaseView() {
  useDocumentTitle('Purchase Season Tickets');
  const { bundleId } = useParams<{ bundleId: string }>();
  const [bundle, setBundle] = useState<TicketBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timezone, setTimezone] = useState('America/New_York');

  useEffect(() => {
    async function loadData() {
      try {
        if (!bundleId) return;
        const [res, tz] = await Promise.all([
          pb.collection('ticketBundles').getOne<TicketBundle>(bundleId, { expand: 'events' }),
          fetchChoirTimezone().catch(() => 'America/New_York')
        ]);
        setBundle(res);
        setTimezone(tz);
      } catch {
        setError('Season Ticket Bundle not found.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bundleId]);

  if (loading) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw' }}>
        <p className="text-muted">Loading details...</p>
      </div>
    );
  }

  if (error || !bundle || !bundle.isActive) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
        <AppCard style={{ width: '100%', maxWidth: 'min(480px, calc(100vw - 32px))', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-danger-text)', margin: 0 }}>
            {error || 'This season ticket bundle is not currently active for purchase.'}
          </p>
          <Link to="/tickets" className="btn btn-ghost" style={{ textDecoration: 'none' }}>Back to Concerts</Link>
        </AppCard>
      </div>
    );
  }

  const saleEndDate = new Date(bundle.saleEndDate.replace(' ', 'T'));
  if (new Date() > saleEndDate) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
        <AppCard style={{ width: '100%', maxWidth: 'min(480px, calc(100vw - 32px))', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-danger-text)', margin: 0 }}>
            The sale period for this season ticket bundle has ended.
          </p>
          <Link to="/tickets" className="btn btn-ghost" style={{ textDecoration: 'none' }}>Back to Concerts</Link>
        </AppCard>
      </div>
    );
  }

  const unitPrice = bundle.priceCents || 0;
  const totalTicketsCents = unitPrice * quantity;
  const feeCents = totalTicketsCents > 0 ? (Math.round(totalTicketsCents * 0.029) + 30) : 0;
  const totalCents = totalTicketsCents + feeCents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() !== confirmEmail.trim()) {
      setError("Email addresses must match.");
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const session = await ticketService.createBundleCheckoutSession(bundle.id, quantity, email.trim(), name.trim());
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('Stripe Checkout URL not returned');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Stripe redirection failed.');
      setSubmitting(false);
    }
  };

  const includedEvents = bundle.expand?.events || [];

  return (
    <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'flex-start', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
      <AppCard style={{ width: '100%', maxWidth: 'min(720px, calc(100vw - 32px))' }}>
        <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
          <Link to="/tickets" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>← Back to Tickets</Link>
          <h1 className="text-display" style={{ margin: 0 }}>Buy Season Tickets</h1>
        </div>

        <div className="card flex-responsive" style={{ padding: 'var(--space-md)', gap: 'var(--space-md)', backgroundColor: 'var(--primary-light)' }}>
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
            <h3 style={{ margin: 0, color: 'var(--primary-deep)' }}>{bundle.title}</h3>
            <p className="text-body" style={{ margin: 0 }}>
              Full Season Access to all performances listed below for one discounted rate.
            </p>
          </div>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-md)' }}>
          <span className="text-xs text-muted" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Included Performances</span>
          <div className="flex-col" style={{ gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            {includedEvents.map(event => (
              <div key={event.id} className="card" style={{ padding: 'var(--space-sm)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <strong style={{ display: 'block', color: 'var(--text)' }}>{event.title}</strong>
                <span className="text-xs text-muted">
                  {formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {includedEvents.length === 0 && (
              <p className="text-muted text-sm" style={{ margin: 0 }}>No concerts currently scheduled in this bundle.</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-lg)' }}>
          {error && <p style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error}</p>}

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Your Name (for Will Call)</label>
            <input
              type="text"
              required
              className="card"
              style={{ padding: '0 12px', height: '40px' }}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Email Address</label>
              <input
                type="email"
                required
                className="card"
                style={{ padding: '0 12px', height: '40px' }}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Confirm Email</label>
              <input
                type="email"
                required
                className="card"
                style={{ padding: '0 12px', height: '40px' }}
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Pass Quantity</label>
            <input
              type="number"
              min="1"
              max="10"
              required
              className="card"
              style={{ padding: '0 12px', height: '40px' }}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Math.min(10, Number(e.target.value))))}
            />
          </div>

          <div className="card flex-col" style={{ padding: 'var(--space-md)', gap: 'var(--space-xs)', backgroundColor: 'var(--neutral-bg)' }}>
            <h4 style={{ margin: 0, color: 'var(--primary-deep)' }}>Pricing Summary</h4>
            <div className="flex-row" style={{ justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Season Ticket Pass ({quantity} x ${(unitPrice / 100).toFixed(2)})</span>
              <span>${((unitPrice * quantity) / 100).toFixed(2)}</span>
            </div>
            {feeCents > 0 && (
              <div className="flex-row" style={{ justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Processing Fee</span>
                <span>${(feeCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex-row" style={{ justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
              <span>Total Cost</span>
              <span>${(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex-row" style={{ 
            padding: 'var(--space-md)', 
            gap: 'var(--space-md)', 
            alignItems: 'flex-start', 
            backgroundColor: 'var(--neutral-bg)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)',
            marginTop: 'var(--space-xs)'
          }}>
            <input
              id="marketingOptIn"
              type="checkbox"
              checked={marketingOptIn}
              onChange={e => setMarketingOptIn(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px', minHeight: 'auto', accentColor: 'var(--primary)' }}
            />
            <label htmlFor="marketingOptIn" className="flex-col" style={{ gap: '2px', cursor: 'pointer', userSelect: 'none', flex: 1 }}>
              <span className="text-sm" style={{ fontWeight: 600, color: 'var(--text)', lineHeight: '1.3' }}>
                Email me future choir performance announcements.
              </span>
              <span className="text-xs text-muted" style={{ lineHeight: '1.3' }}>
                No weekly emails. Unsubscribe anytime.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', height: '48px', fontWeight: 600 }}
          >
            {submitting ? "Opening Secure Checkout…" : "Proceed to Payment"}
          </button>
        </form>
      </AppCard>
    </div>
  );
}
