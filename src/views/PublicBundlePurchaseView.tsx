import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ticketService } from '../services/ticketService';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle, useChoirSettings } from '../hooks/useDocumentTitle';
import { usePublicBundle } from '../hooks/usePublicBundle';
import { PublicBrandingWrapper } from '../components/common/PublicBrandingWrapper';
import { Button, Input } from '../components/ui';
import { formatInTimezone } from '../lib/timezone';
import { sanitizeHtml } from '../lib/textSafety';

export default function PublicBundlePurchaseView() {
  useDocumentTitle('Purchase Season Tickets');
  const { choirName, timezone } = useChoirSettings();
  const { bundleId } = useParams<{ bundleId: string }>();
  const { data: bundle, isLoading, isError } = usePublicBundle(bundleId);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [formError, setFormError] = useState('');

  const createBundleSessionMutation = useMutation({
    mutationFn: (data: { bundleId: string; quantity: number; email: string; name: string }) =>
      ticketService.createBundleCheckoutSession(data.bundleId, data.quantity, data.email, data.name),
    onSuccess: (result) => {
      if (result.url) {
        window.location.assign(result.url);
      } else {
        setFormError('Stripe Checkout URL not returned');
      }
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Stripe redirection failed.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <p className="text-text-muted">Loading details...</p>
      </div>
    );
  }

  if (isError || !bundle || !bundle.isActive) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center p-4">
        <AppCard className="w-full max-w-[480px] text-center">
          <p className="text-danger-text m-0">
            {isError
              ? 'Season Ticket Bundle not found.'
              : 'This season ticket bundle is not currently active for purchase.'}
          </p>
          <Button as={Link} to="/tickets" variant="outline" className="no-underline">
            Back to Concerts
          </Button>
        </AppCard>
      </div>
    );
  }

  const saleEndDate = new Date(bundle.saleEndDate.replace(' ', 'T'));
  if (new Date() > saleEndDate) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center p-4">
        <AppCard className="w-full max-w-[480px] text-center">
          <p className="text-danger-text m-0">
            The sale period for this season ticket bundle has ended.
          </p>
          <Button as={Link} to="/tickets" variant="outline" className="no-underline">
            Back to Concerts
          </Button>
        </AppCard>
      </div>
    );
  }

  const unitPrice = bundle.priceCents || 0;
  const totalTicketsCents = unitPrice * quantity;
  const feeCents = totalTicketsCents > 0 ? Math.round(totalTicketsCents * 0.029) + 30 : 0;
  const totalCents = totalTicketsCents + feeCents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() !== confirmEmail.trim()) {
      setFormError('Email addresses must match.');
      return;
    }
    setFormError('');
    await createBundleSessionMutation.mutateAsync({
      bundleId: bundle.id,
      quantity,
      email: email.trim(),
      name: name.trim(),
    });
  };

  const includedEvents = bundle.expand?.events || [];

  return (
    <PublicBrandingWrapper>
      <AppCard className="w-full max-w-[720px]">
        <div className="flex flex-col gap-2">
          <Button as={Link} to="/tickets" variant="outline" size="small" className="self-start">
            ← Back to Tickets
          </Button>
          <div className="flex flex-col gap-0.5">
            {choirName && (
              <span className="text-text-muted text-xs font-bold tracking-wider uppercase">
                {choirName}
              </span>
            )}
            <h1 className="text-display m-0">Buy Season Tickets</h1>
          </div>
        </div>

        <div className="border-border bg-primary-light flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md md:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="text-primary-deep m-0">{bundle.title}</h3>
            <p className="text-body m-0">
              Full Season Access to all performances listed below for one discounted rate.
            </p>
          </div>
        </div>

        <div className="border-border flex flex-col gap-1 border-b pb-4">
          <span className="text-text-muted text-xs font-bold uppercase">Included Performances</span>
          <div className="mt-1 flex flex-col gap-2">
            {includedEvents.map((event) => (
              <div
                key={event.id}
                className="border-border bg-surface rounded-sm border p-2 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <strong className="text-text block">{event.title}</strong>
                <span className="text-text-muted text-xs">
                  {formatInTimezone(event.date, timezone, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            {includedEvents.length === 0 && (
              <p className="text-text-muted m-0 text-sm">
                No concerts currently scheduled in this bundle.
              </p>
            )}
          </div>
        </div>

        {bundle.publicDetails && (
          <div className="border-border flex flex-col gap-1 border-b pb-4">
            <span className="text-text-muted text-xs font-bold uppercase">
              Bundle Details & Instructions
            </span>
            <div
              className="text-body"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(bundle.publicDetails) }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {formError && <p className="text-danger-text m-0">{formError}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-label">Your Name (for Will Call)</label>
            <Input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Email Address</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Confirm Email</label>
              <Input
                type="email"
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Pass Quantity</label>
            <Input
              type="number"
              min="1"
              max="10"
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value))))}
            />
          </div>

          <div className="border-border flex w-full flex-col gap-1 rounded-xl border bg-neutral-100 p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <h4 className="text-primary-deep m-0">Pricing Summary</h4>
            <div className="flex flex-row justify-between text-sm">
              <span>
                Season Ticket Pass ({quantity} x ${(unitPrice / 100).toFixed(2)})
              </span>
              <span>${((unitPrice * quantity) / 100).toFixed(2)}</span>
            </div>
            {feeCents > 0 && (
              <div className="flex flex-row justify-between text-sm">
                <span>Processing Fee</span>
                <span>${(feeCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="border-border mt-1 flex flex-row justify-between border-t pt-1 font-bold">
              <span>Total Cost</span>
              <span>${(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="border-border mt-1 flex flex-row items-start gap-4 rounded-lg border bg-neutral-100 p-4">
            <Input
              id="marketingOptIn"
              type="checkbox"
              className="accent-primary size-[18px] cursor-pointer"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
            />
            <label
              htmlFor="marketingOptIn"
              className="flex flex-1 cursor-pointer flex-col gap-0.5 select-none"
            >
              <span className="text-text text-sm leading-tight font-semibold">
                Email me future choir performance announcements.
              </span>
              <span className="text-text-muted text-xs leading-tight">
                No weekly emails. Unsubscribe anytime.
              </span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={createBundleSessionMutation.isPending}
            className="h-12 w-full font-semibold"
            variant="primary"
          >
            {createBundleSessionMutation.isPending ? 'Opening Secure Checkout…' : 'Proceed to Payment'}
          </Button>
        </form>
      </AppCard>
    </PublicBrandingWrapper>
  );
}
