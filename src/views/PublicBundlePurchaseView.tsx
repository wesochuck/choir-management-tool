import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { ticketService, type TicketBundle } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle, useChoirName } from '../hooks/useDocumentTitle';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';
import { sanitizeHtml } from '../lib/textSafety';

export default function PublicBundlePurchaseView() {
  useDocumentTitle('Purchase Season Tickets');
  const { choirName } = useChoirName();
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
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <p className="text-text-muted">Loading details...</p>
      </div>
    );
  }

  if (error || !bundle || !bundle.isActive) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center p-4">
        <AppCard className="w-full max-w-[480px] text-center">
          <p className="m-0 text-danger-text">
            {error || 'This season ticket bundle is not currently active for purchase.'}
          </p>
          <Link to="/tickets" className="btn btn-ghost no-underline">Back to Concerts</Link>
        </AppCard>
      </div>
    );
  }

  const saleEndDate = new Date(bundle.saleEndDate.replace(' ', 'T'));
  if (new Date() > saleEndDate) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center p-4">
        <AppCard className="w-full max-w-[480px] text-center">
          <p className="m-0 text-danger-text">
            The sale period for this season ticket bundle has ended.
          </p>
          <Link to="/tickets" className="btn btn-ghost no-underline">Back to Concerts</Link>
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
    <div className="flex min-h-screen w-screen flex-col items-center justify-start p-4">
      <AppCard className="w-full max-w-[720px]">
        <div className="flex flex-col gap-2">
          <Link to="/tickets" className="btn btn-ghost btn-sm self-start">← Back to Tickets</Link>
          <div className="flex flex-col gap-0.5">
            {choirName && <span className="text-xs font-bold tracking-wider text-text-muted uppercase">{choirName}</span>}
            <h1 className="text-display m-0">Buy Season Tickets</h1>
          </div>
        </div>

        <div className="card flex flex-col gap-4 bg-primary-light p-4 md:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="m-0 text-primary-deep">{bundle.title}</h3>
            <p className="text-body m-0">
              Full Season Access to all performances listed below for one discounted rate.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-b border-border pb-4">
          <span className="text-xs font-bold text-text-muted uppercase">Included Performances</span>
          <div className="mt-1 flex flex-col gap-2">
            {includedEvents.map(event => (
              <div key={event.id} className="card rounded-sm border border-border p-2">
                <strong className="block text-text">{event.title}</strong>
                <span className="text-xs text-text-muted">
                  {formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {includedEvents.length === 0 && (
              <p className="m-0 text-sm text-text-muted">No concerts currently scheduled in this bundle.</p>
            )}
          </div>
        </div>

        {bundle.publicDetails && (
          <div className="flex flex-col gap-1 border-b border-border pb-4">
            <span className="text-xs font-bold text-text-muted uppercase">Bundle Details & Instructions</span>
            <div 
              className="text-body"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(bundle.publicDetails) }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && <p className="m-0 text-danger-text">{error}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-label">Your Name (for Will Call)</label>
            <input
              type="text"
              required
              className="card h-10 px-3"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Email Address</label>
              <input
                type="email"
                required
                className="card h-10 px-3"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Confirm Email</label>
              <input
                type="email"
                required
                className="card h-10 px-3"
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Pass Quantity</label>
            <input
              type="number"
              min="1"
              max="10"
              required
              className="card h-10 px-3"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Math.min(10, Number(e.target.value))))}
            />
          </div>

          <div className="card flex w-full flex-col gap-1 bg-neutral-100 p-4">
            <h4 className="m-0 text-primary-deep">Pricing Summary</h4>
            <div className="flex flex-row justify-between text-sm">
              <span>Season Ticket Pass ({quantity} x ${(unitPrice / 100).toFixed(2)})</span>
              <span>${((unitPrice * quantity) / 100).toFixed(2)}</span>
            </div>
            {feeCents > 0 && (
              <div className="flex flex-row justify-between text-sm">
                <span>Processing Fee</span>
                <span>${(feeCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="mt-1 flex flex-row justify-between border-t border-border pt-1 font-bold">
              <span>Total Cost</span>
              <span>${(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-1 flex flex-row items-start gap-4 rounded-lg border border-border bg-neutral-100 p-4">
            <input
              id="marketingOptIn"
              type="checkbox"
              className="size-[18px] cursor-pointer accent-primary"
              checked={marketingOptIn}
              onChange={e => setMarketingOptIn(e.target.checked)}
            />
            <label htmlFor="marketingOptIn" className="flex flex-1 cursor-pointer flex-col gap-0.5 select-none">
              <span className="text-sm leading-tight font-semibold text-text">
                Email me future choir performance announcements.
              </span>
              <span className="text-xs leading-tight text-text-muted">
                No weekly emails. Unsubscribe anytime.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-lg h-12 w-full font-semibold"
          >
            {submitting ? "Opening Secure Checkout…" : "Proceed to Payment"}
          </button>
        </form>
      </AppCard>
    </div>
  );
}
