import { createCheckoutSession } from '../stripeService';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import { coercePocketBaseDate } from '../pocketbaseDate';
import { getOrCreatePatronProfile } from './checkoutHelpers';

declare const $app: PocketBaseApp;

declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

export function handleCreateBundleSession(e: PocketBaseRequestEvent): unknown {
  const body = e.requestInfo().body as { [key: string]: unknown };
  const bundleId = body.bundleId as string;
  const quantity = body.quantity;
  const email = body.email as string;
  const name = body.name as string;
  const marketingOptIn = body.marketingOptIn === true;

  if (!bundleId || !quantity || !email || !name) {
    return e.json(400, { error: 'Missing required fields' });
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0 || qty > 10) {
    return e.json(400, { error: 'Invalid ticket bundle quantity' });
  }

  let bundle: PocketBaseRecord;
  try {
    bundle = $app.findRecordById('ticketBundles', bundleId);
  } catch {
    return e.json(404, { error: 'Bundle not found' });
  }

  if (!bundle.get('isActive')) {
    return e.json(400, { error: 'This bundle is not currently active for purchase' });
  }

  const saleEndDate = coercePocketBaseDate(bundle.get('saleEndDate'));
  if (saleEndDate && new Date() > saleEndDate) {
    return e.json(400, { error: 'The sale period for this bundle has ended' });
  }

  const bundleEventsVal = bundle.get('events');
  const bundleEventIds = Array.isArray(bundleEventsVal) ? (bundleEventsVal as string[]) : [];
  if (bundleEventIds.length === 0) {
    return e.json(400, { error: 'This bundle does not contain any events' });
  }

  // 1. Check bundle capacity
  let bundleSoldCount = 0;
  const firstEventId = bundleEventIds[0];
  try {
    const bundlePurchases = $app.findRecordsByFilter(
      'ticketPurchases',
      "bundle = {:bundleId} && event = {:eventId} && status = 'paid'",
      '',
      10000,
      0,
      { bundleId, eventId: firstEventId }
    );
    bundlePurchases.forEach((p) => {
      const q = p.get('quantity');
      bundleSoldCount += typeof q === 'number' ? q : 0;
    });
  } catch (err: unknown) {
    console.log(
      'Error querying bundle sales: ' + (err instanceof Error ? err.message : String(err))
    );
  }

  const bundleCapacity = Number(bundle.get('capacity') || 0);
  if (bundleCapacity > 0 && bundleSoldCount + qty > bundleCapacity) {
    return e.json(400, { error: 'Requested quantity exceeds remaining bundle capacity' });
  }

  // 2. Check individual event capacities
  for (const eventId of bundleEventIds) {
    let event: PocketBaseRecord;
    try {
      event = $app.findRecordById('events', eventId);
    } catch {
      return e.json(404, { error: `Included event ${eventId} not found` });
    }

    if (event.get('isArchived')) {
      return e.json(400, { error: `Included event "${event.get('title')}" is archived` });
    }

    let eventSoldCount = 0;
    try {
      const eventPurchases = $app.findRecordsByFilter(
        'ticketPurchases',
        "event = {:eventId} && status = 'paid'",
        '',
        10000,
        0,
        { eventId }
      );
      eventPurchases.forEach((p) => {
        const q = p.get('quantity');
        eventSoldCount += typeof q === 'number' ? q : 0;
      });
    } catch (err: unknown) {
      console.log(
        `Error querying event ${eventId} sales: ` +
          (err instanceof Error ? err.message : String(err))
      );
    }

    const eventCapacity = Number(event.get('ticketCapacity') || 0);
    if (eventCapacity > 0 && eventSoldCount + qty > eventCapacity) {
      return e.json(400, {
        error: `Requested quantity exceeds remaining capacity for event "${event.get('title')}"`,
      });
    }
  }

  const priceCents = Number(bundle.get('priceCents') || 0);
  const totalTicketsCents = priceCents * qty;
  const feeCents = totalTicketsCents > 0 ? Math.round(totalTicketsCents * 0.029) + 30 : 0;

  const meta = $app.settings()?.meta;
  const settingsAppUrl = meta?.appUrl || meta?.appURL || meta?.AppURL || '';
  const appUrl = process.env.APP_URL || settingsAppUrl || 'http://localhost:5173';
  const successUrl = `${appUrl}/tickets/order/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/tickets`;

  const lineItems = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Season Ticket Bundle: ${String(bundle.get('title') || 'Season Pass')}`,
        },
        unit_amount: priceCents,
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
    paymentType: 'bundle',
    bundleId,
    quantity: String(qty),
    unitPriceCents: String(priceCents),
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
      bundle: bundleId,
      profile: profile.id,
      buyerName: name,
      buyerEmail: email,
      quantity: qty,
      unitPriceCents: bundle.get('priceCents'),
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
