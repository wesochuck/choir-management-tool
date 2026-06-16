import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { ticketService } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { PublicBrandingWrapper } from '../components/common/PublicBrandingWrapper';
import { sanitizeHtml } from '../lib/textSafety';
import { useDocumentTitle, useChoirSettings } from '../hooks/useDocumentTitle';
import { usePublicEvent } from '../hooks/usePublicEvent';
import { formatInTimezone } from '../lib/timezone';
import { Button, Input } from '../components/ui';

export default function PublicTicketPurchaseView() {
  useDocumentTitle('Purchase Tickets');
  const { choirName, timezone } = useChoirSettings();
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading, isError } = usePublicEvent(eventId);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <p className="text-text-muted">Loading details...</p>
      </div>
    );
  }

  if (isError || !event || !event.isTicketingEnabled || event.isArchived) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center p-4">
        <AppCard className="w-full max-w-[480px] text-center">
          <p className="m-0 text-danger-text">
            {(isError || !event) ? 'Event not found.' : 'Ticket sales are closed for this event.'}
          </p>
          <Button as={Link} to="/tickets" variant="outline" className="no-underline">Back to Events</Button>
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
      setFormError("Email addresses must match.");
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const session = await ticketService.createCheckoutSession(event.id, quantity, email.trim(), name.trim());
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('Stripe Checkout URL not returned');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg || 'Stripe redirection failed.');
      setSubmitting(false);
    }
  };

  return (
    <PublicBrandingWrapper>
      <AppCard className="w-full max-w-[720px]">
        <div className="flex flex-col gap-2">
          <Button as={Link} to="/tickets" variant="outline" size="small" className="self-start">← Back to Events</Button>
          <div className="flex flex-col gap-0.5">
            {choirName && <span className="text-xs font-bold tracking-wider text-text-muted uppercase">{choirName}</span>}
            <h1 className="text-display m-0">Buy Tickets</h1>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-primary-light p-4 shadow-sm transition-all duration-200 hover:shadow-md md:flex-row">
          {event.eventGraphic && (
            <img
              src={pb.files.getURL(event, event.eventGraphic)}
              alt={event.title} className="max-h-40 w-full max-w-[240px] rounded-sm object-cover"
            />
          )}
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="m-0 text-primary-deep">{event.title}</h3>
            <p className="text-body m-0">
              Date: <strong>{formatInTimezone(event.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong>
            </p>
            {event.expand?.venue?.name && (
              <p className="text-body m-0">
                Location:{' '}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.expand.venue.address || event.expand.venue.name || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-text transition-colors hover:text-primary-deep"
                >
                  📍 {event.expand.venue.name}
                  {event.expand.venue.address && (
                    <span className="text-sm font-normal text-text-muted"> ({event.expand.venue.address})</span>
                  )}
                </a>
              </p>
            )}
            {event.doorsOpenTime && (
              <p className="m-0 text-sm text-text-muted">
                Doors Open: <strong>{event.doorsOpenTime}</strong>
              </p>
            )}
          </div>
        </div>

        {event.publicDetails && (
          <div className="flex flex-col gap-1 border-b border-border pb-4">
            <span className="text-xs font-bold text-text-muted uppercase">Event Details</span>
            <div 
              className="text-body"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.publicDetails) }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {formError && <p className="m-0 text-danger-text">{formError}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-label">Your Name (for Will Call)</label>
            <Input
              type="text"
              required
              
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Email Address</label>
              <Input
                type="email"
                required
                
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Confirm Email</label>
              <Input
                type="email"
                required
                
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Ticket Quantity</label>
            <Input
              type="number"
              min="1"
              max="10"
              required
              
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Math.min(10, Number(e.target.value))))}
            />
          </div>

          <div className="flex w-full flex-col gap-1 rounded-xl border border-border bg-neutral-100 p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <h4 className="m-0 text-primary-deep">Pricing Summary</h4>
            <div className="flex flex-row justify-between text-sm">
              <span>{isShowDay ? 'Day-Of' : 'Advance'} Price ({quantity} x ${(unitPrice / 100).toFixed(2)})</span>
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
            <Input
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

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full font-semibold"
            variant="primary"
          >
            {submitting ? "Opening Secure Checkout…" : "Proceed to Payment"}
          </Button>
        </form>
      </AppCard>
    </PublicBrandingWrapper>
  );
}
