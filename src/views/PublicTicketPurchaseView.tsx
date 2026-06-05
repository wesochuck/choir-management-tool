import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import type { Event } from '../services/eventService';
import { ticketService } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { sanitizeHtml } from '../lib/textSafety';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchChoirTimezone, formatInTimezone } from '../lib/timezone';

export default function PublicTicketPurchaseView() {
  useDocumentTitle('Purchase Tickets');
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
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
        if (!eventId) return;
        const [res, tz] = await Promise.all([
          pb.collection('events').getOne<Event>(eventId),
          fetchChoirTimezone().catch(() => 'America/New_York')
        ]);
        setEvent(res);
        setTimezone(tz);
      } catch {
        setError('Event not found.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw' }}>
        <p className="text-muted">Loading details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
        <AppCard style={{ width: '100%', maxWidth: 'min(480px, calc(100vw - 32px))', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error || 'Event not found.'}</p>
          <Link to="/tickets" className="btn btn-ghost" style={{ textDecoration: 'none' }}>Back to Events</Link>
        </AppCard>
      </div>
    );
  }

  const nowFormatted = formatInTimezone(new Date(), timezone, {});
  const eventFormatted = formatInTimezone(new Date(event.date), timezone, {});
  const nowStr = nowFormatted.split(",")[0];
  const eventDateStr = eventFormatted.split(",")[0];

  const isShowDay = nowStr === eventDateStr;
  const unitPrice = isShowDay ? (event.dayOfPriceCents || 0) : (event.advancePriceCents || 0);

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
      const session = await ticketService.createCheckoutSession(event.id, quantity, email.trim(), name.trim());
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

  return (
    <div className="flex-col" style={{ minHeight: '100vh', justifyContent: 'flex-start', alignItems: 'center', width: '100vw', padding: 'var(--space-md)' }}>
      <AppCard style={{ width: '100%', maxWidth: 'min(720px, calc(100vw - 32px))' }}>
        <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
          <Link to="/tickets" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>← Back to Events</Link>
          <h1 className="text-display" style={{ margin: 0 }}>Buy Tickets</h1>
        </div>

        <div className="card flex-responsive" style={{ padding: 'var(--space-md)', gap: 'var(--space-md)', backgroundColor: 'var(--primary-light)' }}>
          {event.eventGraphic && (
            <img
              src={pb.files.getURL(event, event.eventGraphic)}
              alt={event.title}
              style={{ width: '100%', maxWidth: '240px', maxHeight: '160px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
            />
          )}
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
            <h3 style={{ margin: 0, color: 'var(--primary-deep)' }}>{event.title}</h3>
            <p className="text-body" style={{ margin: 0 }}>
              Date: <strong>{formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong>
            </p>
            {event.doorsOpenTime && (
              <p className="text-muted text-sm" style={{ margin: 0 }}>
                Doors Open: <strong>{event.doorsOpenTime}</strong>
              </p>
            )}
          </div>
        </div>

        {event.publicDetails && (
          <div className="flex-col" style={{ gap: 'var(--space-xs)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-md)' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Event Details</span>
            <div 
              className="text-body"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.publicDetails) }}
            />
          </div>
        )}

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
            <label className="text-label">Ticket Quantity</label>
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
              <span>Ticket Price ({quantity} x ${(unitPrice / 100).toFixed(2)})</span>
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

          <label className="flex-row" style={{ alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={e => setMarketingOptIn(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span className="text-sm">Opt-in to future choir announcements and performance notices.</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', height: '48px', fontWeight: 600 }}
          >
            {submitting ? "Opening secure Stripe Checkout…" : "Go to Stripe Payment"}
          </button>
        </form>
      </AppCard>
    </div>
  );
}
