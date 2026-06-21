import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { ticketService } from '../services/ticketService';
import type { Event } from '../services/eventService';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Spinner } from '../components/ui/Spinner/Spinner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatTime12h } from '../lib/dateUtils';
import { pb } from '../lib/pocketbase';
import { PublicBrandingWrapper } from '../components/common/PublicBrandingWrapper';
import { queryKeys } from '../lib/queryKeys';
import { getTicketConfirmationPageSettings } from '../services/settingsService';

export default function PublicTicketSuccessView() {
  useDocumentTitle('Order Confirmation');
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';

  const purchaseQuery = useQuery({
    queryKey: queryKeys.tickets.verify(sessionId),
    queryFn: () => ticketService.pollForPurchaseRecord(sessionId),
    enabled: !!sessionId,
    refetchInterval: (query) => (query.state.data ? false : 3000),
  });

  const purchase = purchaseQuery.data ?? null;
  const loading = !!sessionId && purchaseQuery.isPending;

  const scanContextQuery = useQuery({
    queryKey: queryKeys.tickets.scanContext(sessionId, purchase?.id ?? ''),
    queryFn: () => ticketService.getScanContext(sessionId, purchase!.id),
    enabled: !!purchase?.id,
  });

  const confirmationSettingsQuery = useQuery({
    queryKey: queryKeys.ticketing.confirmationPage(),
    queryFn: getTicketConfirmationPageSettings,
    staleTime: 5 * 60_000,
  });

  const confirmationSettings = confirmationSettingsQuery.data;

  const [qrDataUri, setQrDataUri] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function buildQr() {
      const scanUrl = scanContextQuery.data?.scanUrl;

      if (!scanUrl) {
        setQrDataUri(null);
        setQrError(null);
        return;
      }

      try {
        setQrError(null);

        const dataUri = await QRCode.toDataURL(scanUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });

        if (!cancelled) {
          setQrDataUri(dataUri);
        }
      } catch {
        if (!cancelled) {
          setQrDataUri(null);
          setQrError('We could not generate your QR code.');
        }
      }
    }

    void buildQr();

    return () => {
      cancelled = true;
    };
  }, [scanContextQuery.data?.scanUrl]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <AppCard className="w-full max-w-[480px] items-center text-center">
          <h2 className="m-0">Verifying Order...</h2>
          <Spinner size="medium" />
          <p className="text-text-muted text-sm">Please wait while we confirm your transaction.</p>
          <div className="border-border border-t-primary size-10 animate-spin rounded-full border-4" />
        </AppCard>
      </div>
    );
  }

  return (
    <PublicBrandingWrapper showLogo={false}>
      <AppCard className="w-full max-w-[480px] items-center gap-4 text-center">
        <div className="text-success-text text-6xl">✓</div>
        <h1 className="text-display m-0">Thank You!</h1>
        <p className="text-text-muted m-0">
          {confirmationSettings?.successMessage ?? 'Your purchase has been successfully processed.'}
        </p>

        {purchase ? (
          <div className="border-border flex w-full flex-col gap-1 rounded-xl border bg-neutral-100 p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md">
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
              <strong>
                {purchase.quantity} {purchase.expand?.bundle ? 'Season Pass' : 'ticket'}
                {purchase.quantity > 1 ? (purchase.expand?.bundle ? 'es' : 's') : ''}
              </strong>
            </div>
            <div className="flex flex-row justify-between text-sm">
              <span className="text-text-muted">Amount Paid:</span>
              <strong>${(purchase.amountPaidCents / 100).toFixed(2)}</strong>
            </div>
            {purchase.expand?.bundle ? (
              <div className="border-border mt-1 flex flex-col gap-1 border-t pt-1">
                <span className="text-text-muted text-xs">Season Ticket Pass</span>
                <strong>{purchase.expand.bundle.title}</strong>
                <p className="text-text-muted m-0 text-xs">
                  This pass grants Will Call admission to all performances included in this package.
                </p>
              </div>
            ) : purchase.expand?.event ? (
              <EventDetails event={purchase.expand.event} />
            ) : null}
            <p className="border-border text-text-muted m-0 border-t pt-1 text-center text-xs">
              {confirmationSettings?.willCallInstructions ??
                'A confirmation email has been sent with a link back to this page. Your tickets will be held at Will Call on show day. Please bring a photo ID matching the buyer\u2019s name.'}
            </p>
          </div>
        ) : (
          <div className="w-full rounded-lg bg-neutral-100 p-4">
            <p className="text-text-muted m-0 text-sm">
              {confirmationSettings?.pendingMessage ??
                'We could not load the full ticket details yet. Your purchase may still be processing. Please refresh this page in a moment, or contact the box office if this continues.'}
            </p>
            <Button
              onClick={() => purchaseQuery.refetch()}
              variant="secondary"
              size="small"
              className="mt-3"
            >
              Check Again
            </Button>
          </div>
        )}

        {scanContextQuery.data && (
          <div className="border-border flex w-full flex-col items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-text-muted m-0 text-sm font-bold uppercase">Your Ticket QR</h3>

            {qrDataUri ? (
              <img
                src={qrDataUri}
                alt="Your ticket QR code"
                className="max-w-[240px] rounded-lg border border-slate-200 bg-white p-2"
              />
            ) : (
              <div className="text-text-muted rounded-lg border border-slate-200 bg-white p-4 text-sm">
                {qrError ?? 'Generating QR code...'}
              </div>
            )}

            <p className="text-text-muted m-0 text-center text-xs">
              {confirmationSettings?.qrInstructions ??
                'Print or screenshot this entire page and bring it with you. We also sent a confirmation email with a link back to this page.'}
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

function EventDetails({ event }: { event: Event }) {
  const venue = event.expand?.venue;
  const eventDate = new Date(event.date);

  return (
    <div className="border-border mt-1 flex flex-col gap-3 border-t pt-3">
      <span className="text-text-muted text-xs font-semibold tracking-wide uppercase">
        Event Details
      </span>

      <div>
        <strong className="block text-base">{event.title}</strong>
        <span className="text-text-muted block text-sm">
          {eventDate.toLocaleString([], {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </div>

      {event.doorsOpenTime && (
        <div className="rounded-lg bg-white p-3 text-sm">
          <span className="text-text-muted block text-xs font-semibold tracking-wide uppercase">
            Doors Open
          </span>
          <strong>{formatTime12h(event.doorsOpenTime)}</strong>
        </div>
      )}

      {venue && (
        <div className="rounded-lg bg-white p-3 text-sm">
          <span className="text-text-muted block text-xs font-semibold tracking-wide uppercase">
            Venue
          </span>
          <strong>{venue.name}</strong>
          {venue.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-deep mt-1 block underline"
            >
              {venue.address}
            </a>
          )}
        </div>
      )}

      {event.eventGraphic && (
        <img
          src={pb.files.getURL(event, event.eventGraphic)}
          alt={event.title}
          className="max-h-30 w-full rounded-sm object-cover"
        />
      )}
    </div>
  );
}
