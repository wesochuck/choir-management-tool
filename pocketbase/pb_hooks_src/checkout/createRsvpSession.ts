import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import { coercePocketBaseDate } from '../pocketbaseDate';
import { getOrCreatePatronProfile } from './checkoutHelpers';
import { enqueueCheckoutRsvpConfirmationEmail } from './emailHelpers';

declare const $app: PocketBaseApp;

declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

export function handleCreateRsvpSession(e: PocketBaseRequestEvent): unknown {
  const body = e.requestInfo().body as { [key: string]: unknown };
  const eventId = body.eventId as string;
  const quantity = body.quantity;
  const email = body.email as string;
  const name = body.name as string;
  const marketingOptIn = body.marketingOptIn === true;

  if (!eventId || !quantity || !email || !name) {
    return e.json(400, { error: 'Missing required fields' });
  }

  let event: PocketBaseRecord;
  try {
    event = $app.findRecordById('events', eventId);
  } catch {
    return e.json(404, { error: 'Event not found' });
  }

  if (event.get('isArchived')) {
    return e.json(400, { error: 'Event has been archived' });
  }

  if (!event.get('isTicketingEnabled') || !event.get('isFreeRSVP')) {
    return e.json(400, { error: 'Free RSVP is not enabled for this event' });
  }

  const maxPerRSVP =
    typeof event.get('maxPerRSVP') === 'number' ? (event.get('maxPerRSVP') as number) : 2;
  const qty = Number(quantity);

  if (isNaN(qty) || qty <= 0 || qty > maxPerRSVP) {
    return e.json(400, { error: `Invalid quantity. Maximum is ${maxPerRSVP}` });
  }

  const checkoutEventDate = coercePocketBaseDate(event.get('date'));

  if (!checkoutEventDate || checkoutEventDate < new Date()) {
    return e.json(400, { error: 'RSVP is closed for this event' });
  }

  // Derive sold count from paid ticketPurchases
  let soldCount = 0;
  try {
    const paidPurchases = $app.findRecordsByFilter(
      'ticketPurchases',
      "event = {:eventId} && status = 'paid'",
      '',
      10000,
      0,
      { eventId }
    );
    paidPurchases.forEach((p) => {
      const q = p.get('quantity');
      soldCount += typeof q === 'number' ? q : 0;
    });
  } catch (err: unknown) {
    console.log(
      'Error querying paid purchases: ' + (err instanceof Error ? err.message : String(err))
    );
  }

  const capacity = event.get('ticketCapacity');
  const capacityNum = typeof capacity === 'number' ? capacity : 0;
  if (capacityNum > 0 && soldCount + qty > capacityNum) {
    return e.json(400, { error: 'Requested quantity exceeds remaining event capacity' });
  }

  try {
    const profile = getOrCreatePatronProfile(email, name);
    const stripeSessionId = 'rsvp_' + $app.utils.randomString(16);
    const collection = $app.findCollectionByNameOrId('pbc_ticketPurchases_001');
    const record = new Record(collection, {
      event: eventId,
      profile: profile.id,
      buyerName: name,
      buyerEmail: email,
      quantity: qty,
      unitPriceCents: 0,
      feeCents: 0,
      amountPaidCents: 0,
      currency: 'usd',
      stripeSessionId: stripeSessionId,
      marketingOptIn,
      status: 'paid',
      fulfilledAt: new Date().toISOString(),
    });

    $app.save(record);

    enqueueCheckoutRsvpConfirmationEmail({
      purchase: record,
      event: event,
      stripeSessionId,
    });

    const meta = $app.settings()?.meta;
    const settingsAppUrl = meta?.appUrl || meta?.appURL || meta?.AppURL || '';
    const appUrl = process.env.APP_URL || settingsAppUrl || 'http://localhost:5173';
    const successUrl = `${appUrl}/tickets/order/success?session_id=${stripeSessionId}`;

    return e.json(200, { url: successUrl, sessionId: stripeSessionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return e.json(500, { error: 'Failed to process RSVP', details: message });
  }
}
