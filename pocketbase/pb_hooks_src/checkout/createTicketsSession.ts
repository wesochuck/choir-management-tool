import { parseJsonField } from '../email/hookJson';
import { formatInTimezone } from '../email/hookText';
import { createCheckoutSession } from '../stripeService';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import { coercePocketBaseDate } from '../pocketbaseDate';
import {
  getChoirNameSetting,
  getBaseUrl,
  getOrCreatePatronProfile,
  calculateStripeFee,
} from './checkoutHelpers';

declare const $app: PocketBaseApp;

declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

export function handleCreateTicketsSession(e: PocketBaseRequestEvent): unknown {
  const body = e.requestInfo().body as { [key: string]: unknown };
  const eventId = body.eventId as string;
  const quantity = body.quantity;
  const email = body.email as string;
  const name = body.name as string;
  const marketingOptIn = body.marketingOptIn === true;

  if (!eventId || !quantity || !email || !name) {
    return e.json(400, { error: 'Missing required fields' });
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0 || qty > 10) {
    return e.json(400, { error: 'Invalid ticket quantity' });
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

  if (!event.get('isTicketingEnabled')) {
    return e.json(400, { error: 'Ticketing is not enabled for this event' });
  }

  const checkoutEventDate = coercePocketBaseDate(event.get('date'));

  if (!checkoutEventDate || checkoutEventDate < new Date()) {
    return e.json(400, { error: 'Ticket sales are closed for this event' });
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
    return e.json(400, { error: 'Requested quantity exceeds remaining ticket capacity' });
  }

  // Select price based on day-of rules in event timezone
  let timezone = 'America/New_York';
  try {
    const settingsRecord = $app.findFirstRecordByFilter('appSettings', "key = 'timezone'");
    const val = settingsRecord.get('value');
    const parsed = parseJsonField<{ timezone?: string }>(val);
    if (parsed && parsed.timezone) {
      timezone = parsed.timezone;
    }
  } catch {
    // use default timezone
  }

  const nowFormatted = formatInTimezone(new Date(), timezone, {});
  const checkoutEventDateForFormatting = coercePocketBaseDate(event.get('date'));
  const eventFormatted = formatInTimezone(
    checkoutEventDateForFormatting ?? new Date(''),
    timezone,
    {}
  );
  const nowStr = nowFormatted.split(',')[0];
  const eventDateStr = eventFormatted.split(',')[0];

  const isShowDay = nowStr === eventDateStr;
  const advancePriceCents = event.get('advancePriceCents');
  const dayOfPriceCents = event.get('dayOfPriceCents');

  const unitPriceCents = isShowDay
    ? typeof dayOfPriceCents === 'number'
      ? dayOfPriceCents
      : 0
    : typeof advancePriceCents === 'number'
      ? advancePriceCents
      : 0;

  if (unitPriceCents < 0) {
    return e.json(400, { error: 'Invalid ticket price configuration' });
  }

  // Calculate net Stripe fees using central setting
  const totalTicketsCents = unitPriceCents * qty;
  const feeCents = calculateStripeFee(totalTicketsCents);

  const appUrl = getBaseUrl();
  const successUrl = `${appUrl}/tickets/order/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/tickets/${eventId}`;

  const lineItems = [
    {
      price_data: {
        currency: 'usd',
        product_data: { name: `Ticket: ${String(event.get('title') || 'Event')}` },
        unit_amount: unitPriceCents,
      },
      quantity: qty,
    },
  ];

  if (feeCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Processing Fee' },
        unit_amount: feeCents,
      },
      quantity: 1,
    });
  }

  const metadata: { [key: string]: string } = {
    paymentType: 'ticket',
    eventId,
    quantity: String(qty),
    unitPriceCents: String(unitPriceCents),
    feeCents: String(feeCents),
    buyerName: name,
    buyerEmail: email,
    marketingOptIn: marketingOptIn ? 'true' : 'false',
  };

  try {
    const session = createCheckoutSession(lineItems, metadata, email, successUrl, cancelUrl);

    // Pre-save pending record
    const profile = getOrCreatePatronProfile(email, name);
    const collection = $app.findCollectionByNameOrId('pbc_ticketPurchases_001');
    const record = new Record(collection, {
      event: eventId,
      profile: profile.id,
      buyerName: name,
      buyerEmail: email,
      quantity: qty,
      unitPriceCents: unitPriceCents,
      feeCents: feeCents,
      amountPaidCents: totalTicketsCents + feeCents,
      currency: 'usd',
      stripeSessionId: session.id,
      marketingOptIn,
      status: 'pending',
    });
    $app.save(record);

    return e.json(200, { url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return e.json(500, { error: 'Failed to create Stripe Checkout session', details: message });
  }
}
