import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { ticketService, type TicketBundle } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle, useChoirName } from '../hooks/useDocumentTitle';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';
import { sanitizeHtml } from '../lib/textSafety';
import './PublicForms.css';

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
      <div className="flex-col pub-style-1">
        <p className="text-muted">Loading details...</p>
      </div>
    );
  }

  if (error || !bundle || !bundle.isActive) {
    return (
      <div className="flex-col pub-style-2">
        <AppCard className="pub-style-28">
          <p className="pub-style-27">
            {error || 'This season ticket bundle is not currently active for purchase.'}
          </p>
          <Link to="/tickets" className="btn btn-ghost pub-style-29">Back to Concerts</Link>
        </AppCard>
      </div>
    );
  }

  const saleEndDate = new Date(bundle.saleEndDate.replace(' ', 'T'));
  if (new Date() > saleEndDate) {
    return (
      <div className="flex-col pub-style-2">
        <AppCard className="pub-style-28">
          <p className="pub-style-27">
            The sale period for this season ticket bundle has ended.
          </p>
          <Link to="/tickets" className="btn btn-ghost pub-style-29">Back to Concerts</Link>
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
    <div className="flex-col pub-style-30">
      <AppCard className="pub-style-3">
        <div className="flex-col pub-style-4">
          <Link to="/tickets" className="btn btn-ghost btn-sm pub-style-5">← Back to Tickets</Link>
          <div className="flex-col pub-style-31">
            {choirName && <span className="text-xs text-muted pub-style-32">{choirName}</span>}
            <h1 className="text-display pub-style-6">Buy Season Tickets</h1>
          </div>
        </div>

        <div className="card flex-responsive pub-style-33">
          <div className="flex-col pub-style-24">
            <h3 className="pub-style-18">{bundle.title}</h3>
            <p className="text-body pub-style-6">
              Full Season Access to all performances listed below for one discounted rate.
            </p>
          </div>
        </div>

        <div className="flex-col pub-style-35">
          <span className="text-xs text-muted pub-style-20">Included Performances</span>
          <div className="flex-col pub-style-65">
            {includedEvents.map(event => (
              <div key={event.id} className="card pub-style-66">
                <strong className="pub-style-67">{event.title}</strong>
                <span className="text-xs text-muted">
                  {formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {includedEvents.length === 0 && (
              <p className="text-muted text-sm pub-style-6">No concerts currently scheduled in this bundle.</p>
            )}
          </div>
        </div>

        {bundle.publicDetails && (
          <div className="flex-col pub-style-35">
            <span className="text-xs text-muted pub-style-20">Bundle Details & Instructions</span>
            <div 
              className="text-body"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(bundle.publicDetails) }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-col pub-style-22">
          {error && <p className="pub-style-27">{error}</p>}

          <div className="flex-col pub-style-19">
            <label className="text-label">Your Name (for Will Call)</label>
            <input
              type="text"
              required
              className="card pub-style-36"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex-responsive pub-style-23">
            <div className="flex-col pub-style-24">
              <label className="text-label">Email Address</label>
              <input
                type="email"
                required
                className="card pub-style-36"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="flex-col pub-style-24">
              <label className="text-label">Confirm Email</label>
              <input
                type="email"
                required
                className="card pub-style-36"
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-col pub-style-19">
            <label className="text-label">Pass Quantity</label>
            <input
              type="number"
              min="1"
              max="10"
              required
              className="card pub-style-36"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Math.min(10, Number(e.target.value))))}
            />
          </div>

          <div className="card flex-col pub-style-37">
            <h4 className="pub-style-18">Pricing Summary</h4>
            <div className="flex-row pub-style-38">
              <span>Season Ticket Pass ({quantity} x ${(unitPrice / 100).toFixed(2)})</span>
              <span>${((unitPrice * quantity) / 100).toFixed(2)}</span>
            </div>
            {feeCents > 0 && (
              <div className="flex-row pub-style-38">
                <span>Processing Fee</span>
                <span>${(feeCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex-row pub-style-39">
              <span>Total Cost</span>
              <span>${(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex-row pub-style-40">
            <input
              id="marketingOptIn"
              type="checkbox"
              className="pub-checkbox-marketing"
              checked={marketingOptIn}
              onChange={e => setMarketingOptIn(e.target.checked)}
            />
            <label htmlFor="marketingOptIn" className="flex-col pub-style-41">
              <span className="text-sm pub-style-42">
                Email me future choir performance announcements.
              </span>
              <span className="text-xs text-muted pub-style-43">
                No weekly emails. Unsubscribe anytime.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-lg pub-style-44"
          >
            {submitting ? "Opening Secure Checkout…" : "Proceed to Payment"}
          </button>
        </form>
      </AppCard>
    </div>
  );
}
