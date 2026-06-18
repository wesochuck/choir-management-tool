import { parseJsonField } from './email/hookJson';
import { formatInTimezone } from './email/hookText';
import { createCheckoutSession, refundPaymentIntent } from './stripeService';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from './email/emailTypes';
import { generateSignedTicketToken } from './hmacTokens';
import { renderQrSvg } from './email/qrHelper';

declare const $app: PocketBaseApp & {
  findAuthRecordByEmail(collectionName: string, email: string): PocketBaseRecord;
};
declare const $security: {
  hs256(payload: string, secret: string): string;
  equal(a: string, b: string): boolean;
  randomString(length: number): string;
};

declare function readerToString(reader: unknown, maxBytes?: number): string;

declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

interface AppWithTransaction {
  runInTransaction(callback: (txApp: PocketBaseApp) => void): void;
}

interface GoHttpRequest {
  header: {
    get(key: string): string;
  };
  body: unknown;
}

interface TicketingRequestEvent extends PocketBaseRequestEvent {
  request: GoHttpRequest;
}

/**
 * Finds or creates a Patron profile for a given email and name.
 */
function getOrCreatePatronProfile(email: string, name: string): PocketBaseRecord {
  try {
    // Try finding by user email first
    return $app.findFirstRecordByFilter('profiles', 'user.email = {:email}', { email });
  } catch {
    // Try finding by name as a fallback
    try {
      return $app.findFirstRecordByFilter('profiles', 'name = {:name}', { name });
    } catch {
      // No profile found, create a new Patron profile.
      // We create a user account so they can be linked to this email in the future.
      let userId: string;
      try {
        const user = $app.findAuthRecordByEmail('users', email);
        userId = user.id;
      } catch {
        const usersCollection = $app.findCollectionByNameOrId('users');
        const password = $security.randomString(32);
        const newUser = new Record(usersCollection, {
          email: email,
          password: password,
          passwordConfirm: password,
          role: 'singer', // Patrons are singers with no voice part
          name: name || email,
        });
        $app.save(newUser);
        userId = newUser.id;
      }

      const profilesCollection = $app.findCollectionByNameOrId('profiles');
      const newProfile = new Record(profilesCollection, {
        user: userId,
        name: name || email,
        globalStatus: 'Active',
        voicePart: '',
      });
      $app.save(newProfile);
      return newProfile;
    }
  }
}

export async function handleCreateTicketsSession(e: PocketBaseRequestEvent): Promise<unknown> {
  const body = e.requestInfo().body;
  const eventId = body.eventId as string;
  const quantity = body.quantity;
  const email = body.email as string;
  const name = body.name as string;

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

  const checkoutEventDateRaw = event.get('date');
  const checkoutEventDate =
    typeof checkoutEventDateRaw === 'string' ? new Date(checkoutEventDateRaw) : null;

  if (
    !checkoutEventDate ||
    Number.isNaN(checkoutEventDate.getTime()) ||
    checkoutEventDate < new Date()
  ) {
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
  const eventDateRaw = event.get('date');
  const eventFormatted = formatInTimezone(
    new Date(typeof eventDateRaw === 'string' ? eventDateRaw : ''),
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

  // Calculate net Stripe fees: 2.9% on total tickets price + 30 cents flat fee once per transaction
  const totalTicketsCents = unitPriceCents * qty;
  const feeCents = totalTicketsCents > 0 ? Math.round(totalTicketsCents * 0.029) + 30 : 0;

  const meta = $app.settings()?.meta;
  const settingsAppUrl = meta?.appUrl || meta?.appURL || meta?.AppURL || '';
  const appUrl = process.env.APP_URL || settingsAppUrl || 'http://localhost:5173';
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
      status: 'pending',
    });
    $app.save(record);

    return e.json(200, { url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return e.json(500, { error: 'Failed to create Stripe Checkout session', details: message });
  }
}

export function handleCreateBundleSession(e: PocketBaseRequestEvent): unknown {
  const body = e.requestInfo().body;
  const bundleId = body.bundleId as string;
  const quantity = body.quantity;
  const email = body.email as string;
  const name = body.name as string;

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

  const saleEndDateStr = bundle.get('saleEndDate') as string;
  if (saleEndDateStr) {
    const saleEndDate = new Date(saleEndDateStr.replace(' ', 'T'));
    if (new Date() > saleEndDate) {
      return e.json(400, { error: 'The sale period for this bundle has ended' });
    }
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
      status: 'pending',
    });
    $app.save(record);

    return e.json(200, { url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return e.json(500, { error: 'Failed to create Stripe Checkout session', details: message });
  }
}

export function handleCreateDonationSession(e: PocketBaseRequestEvent): unknown {
  const body = e.requestInfo().body;
  const amountCents = Number(body.amountCents || 0);
  const name = body.name as string;
  const email = body.email as string;
  const tributeType = (body.tributeType as string) || 'none';
  const tributeName = (body.tributeName as string) || '';
  const isAnonymous = !!body.isAnonymous;

  if (!amountCents || !name || !email) {
    return e.json(400, { error: 'Missing required fields' });
  }

  if (amountCents < 500) {
    return e.json(400, { error: 'Donation amount must be at least $5.00' });
  }

  let choirName = 'Choir Management Tool';
  try {
    const choirRecord = $app.findFirstRecordByFilter('appSettings', "key = 'choir_name'");
    const val = parseJsonField<string>(choirRecord.get('value'));
    if (val) choirName = val;
  } catch {
    // default
  }

  const meta = $app.settings()?.meta;
  const settingsAppUrl = meta?.appUrl || meta?.appURL || meta?.AppURL || '';
  const appUrl = process.env.APP_URL || settingsAppUrl || 'http://localhost:5173';
  const successUrl = `${appUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/donate`;

  const lineItems = [
    {
      price_data: {
        currency: 'usd',
        product_data: { name: `Donation to ${choirName}` },
        unit_amount: amountCents,
      },
      quantity: 1,
    },
  ];

  const metadata: { [key: string]: string } = {
    paymentType: 'donation',
    amountPaidCents: String(amountCents),
    donorName: name,
    donorEmail: email,
    tributeType,
    tributeName,
    isAnonymous: String(isAnonymous),
  };

  try {
    const session = createCheckoutSession(lineItems, metadata, email, successUrl, cancelUrl);

    // Pre-save pending record
    const profile = getOrCreatePatronProfile(email, name);
    const collection = $app.findCollectionByNameOrId('pbc_donations_001');
    const record = new Record(collection, {
      amountPaidCents: amountCents,
      donorName: name,
      donorEmail: email,
      profile: profile.id,
      tributeType: tributeType,
      tributeName: tributeName,
      isAnonymous: isAnonymous,
      status: 'pending',
      stripeSessionId: session.id,
    });
    $app.save(record);

    return e.json(200, { url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return e.json(500, { error: 'Failed to create Stripe Checkout session', details: message });
  }
}

export async function handleStripeWebhook(e: TicketingRequestEvent): Promise<unknown> {
  let rawBody: string;
  try {
    rawBody = readerToString(e.request.body);
  } catch {
    return e.json(400, { error: 'Failed to read request body' });
  }

  const sig = e.request.header.get('Stripe-Signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!sig || !webhookSecret) {
    return e.json(400, { error: 'Missing signature or webhook config' });
  }

  // Parse Stripe-Signature components: t=123,v1=abc
  let timestamp = '';
  let signature = '';
  sig.split(',').forEach((part: string) => {
    const pair = part.split('=');
    if (pair.length === 2) {
      const k = pair[0].trim();
      const v = pair[1].trim();
      if (k === 't') timestamp = v;
      if (k === 'v1') signature = v;
    }
  });

  if (!timestamp || !signature) {
    return e.json(400, { error: 'Invalid signature format' });
  }

  // Validate replay attacks
  const nowSecs = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSecs - Number(timestamp)) > 300) {
    return e.json(400, { error: 'Expired timestamp' });
  }

  // Compute local signature
  const signedPayload = timestamp + '.' + rawBody;
  const localSig = $security.hs256(signedPayload, webhookSecret);

  if (!$security.equal(localSig, signature)) {
    return e.json(400, { error: 'Signature verification failed' });
  }

  let eventObj: {
    type?: string;
    data?: {
      object?: {
        id?: string;
        payment_intent?: string;
        customer?: string;
        currency?: string;
        amount_total?: number;
        metadata?: { [key: string]: string };
      };
    };
  };

  try {
    eventObj = JSON.parse(rawBody);
  } catch {
    return e.json(400, { error: 'Invalid JSON body' });
  }

  if (eventObj.type === 'checkout.session.completed') {
    const session = eventObj.data?.object;
    if (!session) {
      return e.json(400, { error: 'Missing session object' });
    }

    const metadata = session.metadata || {};
    const paymentType = metadata.paymentType;

    if (paymentType === 'ticket') {
      const eventId = metadata.eventId;
      const stripeSessionId = session.id || '';
      const quantity = Number(metadata.quantity || 0);

      if (!eventId || !stripeSessionId || isNaN(quantity) || quantity <= 0) {
        return e.json(400, { error: 'Invalid session metadata' });
      }

      // Idempotency & Reconciliation: Check if record exists
      let record: PocketBaseRecord;
      try {
        record = $app.findFirstRecordByFilter(
          'ticketPurchases',
          'stripeSessionId = {:stripeSessionId}',
          { stripeSessionId }
        );
        if (record.get('status') === 'paid') {
          return e.json(200, { success: true, message: 'Duplicate event ignored' });
        }
        // Update existing pending record
        record.set('status', 'paid');
        record.set('stripePaymentIntentId', session.payment_intent || '');
        record.set('stripeCustomerId', session.customer || '');
        record.set('fulfilledAt', new Date().toISOString());
      } catch {
        // Record not found, fallback to creation (existing logic)
        const profile = getOrCreatePatronProfile(
          metadata.buyerEmail || '',
          metadata.buyerName || ''
        );
        const collection = $app.findCollectionByNameOrId('pbc_ticketPurchases_001');
        record = new Record(collection, {
          event: eventId,
          profile: profile.id,
          buyerName: metadata.buyerName || '',
          buyerEmail: metadata.buyerEmail || '',
          quantity: quantity,
          unitPriceCents: Number(metadata.unitPriceCents || 0),
          feeCents: Number(metadata.feeCents || 0),
          amountPaidCents: session.amount_total || 0,
          currency: session.currency || 'usd',
          stripeSessionId: stripeSessionId,
          stripePaymentIntentId: session.payment_intent || '',
          stripeCustomerId: session.customer || '',
          status: 'paid',
          marketingOptIn: metadata.marketingOptIn === 'true',
          fulfilledAt: new Date().toISOString(),
        });
      }

      $app.save(record);

      // Look up event for email
      let targetEvent: PocketBaseRecord;
      try {
        targetEvent = $app.findRecordById('events', eventId);
      } catch {
        return e.json(400, { error: 'Event not found during webhook processing' });
      }

      // Enqueue Ticket Confirmation email
      try {
        const template = $app.findFirstRecordByFilter(
          'messageTemplates',
          "title = 'Ticket Confirmation' && isSystemTemplate = true"
        );
        let content = (template.get('content') as string) || '';
        const rawSubject = (template.get('subject') as string) || '';

        let timezone = 'America/New_York';
        try {
          const tzSetting = $app.findFirstRecordByFilter('appSettings', "key = 'timezone'");
          const valueStr = tzSetting.get('value');
          const tzP = parseJsonField<{ timezone?: string }>(valueStr);
          if (tzP?.timezone) {
            timezone = tzP.timezone;
          }
        } catch {
          // default
        }

        let choirName = 'Choir Management Tool';
        try {
          const choirRecord = $app.findFirstRecordByFilter('appSettings', "key = 'choir_name'");
          const val = parseJsonField<string>(choirRecord.get('value'));
          if (val) choirName = val;
        } catch {
          // default
        }

        const eventTitle = (targetEvent.get('title') as string) || '';
        const eventDateRaw = (targetEvent.get('date') as string) || '';
        const eventDateStr = formatInTimezone(eventDateRaw, timezone, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });

        const subject = rawSubject.replace(/{eventTitle}/g, eventTitle);

        content = content
          .replace(/{buyerName}/g, metadata.buyerName || '')
          .replace(/{eventTitle}/g, eventTitle)
          .replace(/{eventDate}/g, eventDateStr)
          .replace(/{doorsOpenTime}/g, String(targetEvent.get('doorsOpenTime') || 'N/A'))
          .replace(/{quantity}/g, String(quantity))
          .replace(/{amountPaid}/g, (Number(session.amount_total || 0) / 100).toFixed(2))
          .replace(/{choirName}/g, choirName);

        const ticketToken = generateSignedTicketToken($app, record.id);
        const meta = $app.settings()?.meta;
        const settingsAppUrl = meta?.appUrl || meta?.appURL || meta?.AppURL || '';
        const baseUrl = process.env.APP_URL || settingsAppUrl || 'http://localhost:5173';
        const scanUrl = `${baseUrl}/admin/tickets/scan?token=${encodeURIComponent(ticketToken)}`;
        const successUrl = `${baseUrl}/tickets/order/success?session_id=${encodeURIComponent(stripeSessionId)}`;
        const qrSvg = await renderQrSvg(scanUrl);
        const qrSvgSrc = `data:image/svg+xml,${encodeURIComponent(qrSvg)}`;

        const emailQueueCollection = $app.findCollectionByNameOrId('emailQueue');
        const mailRecord = new Record(emailQueueCollection, {
          recipientId: 'buyer_' + stripeSessionId,
          recipientEmail: metadata.buyerEmail || '',
          recipientName: metadata.buyerName || 'Buyer',
          subject: subject,
          rawContent: content,
          status: 'Pending',
          attempts: 0,
          filters: JSON.stringify({
            eventId: eventId,
            ticketToken: ticketToken,
            qrSvgSrc: qrSvgSrc,
            successUrl: successUrl,
            type: 'Automated Confirmation',
          }),
        });

        $app.save(mailRecord);
      } catch (mailErr: unknown) {
        console.log(
          'Failed to enqueue confirmation email: ' +
            (mailErr instanceof Error ? mailErr.message : String(mailErr))
        );
      }
    } else if (paymentType === 'bundle') {
      const bundleId = metadata.bundleId;
      const stripeSessionId = session.id || '';
      const quantity = Number(metadata.quantity || 0);

      if (!bundleId || !stripeSessionId || isNaN(quantity) || quantity <= 0) {
        return e.json(400, { error: 'Invalid session metadata' });
      }

      // Idempotency & Reconciliation: Check if record exists
      let record: PocketBaseRecord;
      try {
        record = $app.findFirstRecordByFilter(
          'ticketPurchases',
          'stripeSessionId = {:stripeSessionId}',
          { stripeSessionId }
        );
        if (record.get('status') === 'paid') {
          return e.json(200, { success: true, message: 'Duplicate bundle purchase ignored' });
        }
        // Update existing pending record
        record.set('status', 'paid');
        record.set('stripePaymentIntentId', session.payment_intent || '');
        record.set('stripeCustomerId', session.customer || '');
        record.set('fulfilledAt', new Date().toISOString());
      } catch {
        // Record not found, fallback to creation (existing logic)
        const profile = getOrCreatePatronProfile(
          metadata.buyerEmail || '',
          metadata.buyerName || ''
        );
        const collection = $app.findCollectionByNameOrId('pbc_ticketPurchases_001');
        record = new Record(collection, {
          bundle: bundleId,
          profile: profile.id,
          buyerName: metadata.buyerName || '',
          buyerEmail: metadata.buyerEmail || '',
          quantity: quantity,
          unitPriceCents: Number(metadata.unitPriceCents || 0),
          feeCents: Number(metadata.feeCents || 0),
          amountPaidCents: session.amount_total || 0,
          currency: session.currency || 'usd',
          stripeSessionId: stripeSessionId,
          stripePaymentIntentId: session.payment_intent || '',
          stripeCustomerId: session.customer || '',
          status: 'paid',
          marketingOptIn: metadata.marketingOptIn === 'true',
          fulfilledAt: new Date().toISOString(),
        });
      }

      $app.save(record);

      // Look up bundle for email
      let targetBundle: PocketBaseRecord;
      let bundleEventIds: string[];
      try {
        targetBundle = $app.findRecordById('ticketBundles', bundleId);
        const bundleEventsVal = targetBundle.get('events');
        bundleEventIds = Array.isArray(bundleEventsVal) ? (bundleEventsVal as string[]) : [];
      } catch {
        return e.json(400, { error: 'Bundle not found during webhook processing' });
      }

      // Enqueue Consolidated Ticket Confirmation email
      try {
        const template = $app.findFirstRecordByFilter(
          'messageTemplates',
          "title = 'Bundle Ticket Confirmation' && isSystemTemplate = true"
        );
        let content = (template.get('content') as string) || '';
        const rawSubject = (template.get('subject') as string) || '';

        let timezone = 'America/New_York';
        try {
          const tzSetting = $app.findFirstRecordByFilter('appSettings', "key = 'timezone'");
          const valueStr = tzSetting.get('value');
          const tzP = parseJsonField<{ timezone?: string }>(valueStr);
          if (tzP?.timezone) {
            timezone = tzP.timezone;
          }
        } catch {
          // Use default America/New_York timezone
        }

        let choirName = 'Choir Management Tool';
        try {
          const choirRecord = $app.findFirstRecordByFilter('appSettings', "key = 'choir_name'");
          const val = parseJsonField<string>(choirRecord.get('value'));
          if (val) choirName = val;
        } catch {
          // Use default choir name
        }

        const eventDetailsParts: string[] = [];
        bundleEventIds.forEach((eventId) => {
          try {
            const ev = $app.findRecordById('events', eventId);
            const evTitle = (ev.get('title') as string) || '';
            const evDate = (ev.get('date') as string) || '';
            const evDateStr = formatInTimezone(evDate, timezone, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
            eventDetailsParts.push(`- ${evTitle} on ${evDateStr}`);
          } catch {
            // Ignore individual event loading error
          }
        });
        const eventDetailsStr = eventDetailsParts.join('\n');

        const bundleTitle = (targetBundle.get('title') as string) || '';
        const subject = rawSubject.replace(/{bundleTitle}/g, bundleTitle);

        content = content
          .replace(/{buyerName}/g, metadata.buyerName || '')
          .replace(/{bundleTitle}/g, bundleTitle)
          .replace(/{eventDetails}/g, eventDetailsStr)
          .replace(/{quantity}/g, String(quantity))
          .replace(/{amountPaid}/g, (Number(session.amount_total || 0) / 100).toFixed(2))
          .replace(/{choirName}/g, choirName);

        const ticketToken = generateSignedTicketToken($app, record.id);
        const meta = $app.settings()?.meta;
        const settingsAppUrl = meta?.appUrl || meta?.appURL || meta?.AppURL || '';
        const baseUrl = process.env.APP_URL || settingsAppUrl || 'http://localhost:5173';
        const scanUrl = `${baseUrl}/admin/tickets/scan?token=${encodeURIComponent(ticketToken)}`;
        const successUrl = `${baseUrl}/tickets/order/success?session_id=${encodeURIComponent(stripeSessionId)}`;
        const qrSvg = await renderQrSvg(scanUrl);
        const qrSvgSrc = `data:image/svg+xml,${encodeURIComponent(qrSvg)}`;

        const emailQueueCollection = $app.findCollectionByNameOrId('emailQueue');
        const mailRecord = new Record(emailQueueCollection, {
          recipientId: 'buyer_' + stripeSessionId,
          recipientEmail: metadata.buyerEmail || '',
          recipientName: metadata.buyerName || 'Buyer',
          subject: subject,
          rawContent: content,
          status: 'Pending',
          attempts: 0,
          filters: JSON.stringify({
            bundleId: bundleId,
            ticketToken: ticketToken,
            qrSvgSrc: qrSvgSrc,
            successUrl: successUrl,
            type: 'Automated Confirmation',
          }),
        });

        $app.save(mailRecord);
      } catch (mailErr: unknown) {
        console.log(
          'Failed to enqueue bundle confirmation email: ' +
            (mailErr instanceof Error ? mailErr.message : String(mailErr))
        );
      }
    } else if (paymentType === 'donation') {
      const stripeSessionId = session.id || '';
      if (!stripeSessionId) {
        return e.json(400, { error: 'Missing session ID' });
      }

      // Idempotency & Reconciliation: Check if record exists
      let record: PocketBaseRecord;
      const amountPaidCents = Number(metadata.amountPaidCents || session.amount_total || 0);
      const donorName = metadata.donorName || '';
      const donorEmail = metadata.donorEmail || '';
      const tributeType = metadata.tributeType || 'none';
      const tributeName = metadata.tributeName || '';
      const isAnonymous = metadata.isAnonymous === 'true';

      try {
        record = $app.findFirstRecordByFilter('donations', 'stripeSessionId = {:stripeSessionId}', {
          stripeSessionId,
        });
        if (record.get('status') === 'paid') {
          return e.json(200, { success: true, message: 'Duplicate donation ignored' });
        }
        // Update existing pending record
        record.set('status', 'paid');
        record.set('stripePaymentIntentId', session.payment_intent || '');
      } catch {
        // Record not found, fallback to creation (existing logic)
        const profile = getOrCreatePatronProfile(donorEmail, donorName);
        const collection = $app.findCollectionByNameOrId('pbc_donations_001');
        record = new Record(collection, {
          amountPaidCents,
          donorName,
          donorEmail,
          profile: profile.id,
          tributeType,
          tributeName,
          isAnonymous,
          status: 'paid',
          stripeSessionId,
          stripePaymentIntentId: session.payment_intent || '',
        });
      }

      $app.save(record);

      // Enqueue Donation Receipt
      try {
        const template = $app.findFirstRecordByFilter(
          'messageTemplates',
          "title = 'Donation Receipt' && isSystemTemplate = true"
        );
        let content = (template.get('content') as string) || '';
        const subject = (template.get('subject') as string) || '';

        let choirName = 'Choir Management Tool';
        try {
          const choirRecord = $app.findFirstRecordByFilter('appSettings', "key = 'choir_name'");
          const val = parseJsonField<string>(choirRecord.get('value'));
          if (val) choirName = val;
        } catch {
          // default
        }

        let tributeSection = '';
        if (tributeType === 'memory' && tributeName) {
          tributeSection = `This donation was made in memory of ${tributeName}.`;
        } else if (tributeType === 'honor' && tributeName) {
          tributeSection = `This donation was made in honor of ${tributeName}.`;
        }

        content = content
          .replace(/{donorName}/g, donorName)
          .replace(/{amountPaid}/g, (amountPaidCents / 100).toFixed(2))
          .replace(/{choirName}/g, choirName)
          .replace(/{tributeSection}/g, tributeSection);

        const emailQueueCollection = $app.findCollectionByNameOrId('emailQueue');
        const mailRecord = new Record(emailQueueCollection, {
          recipientId: 'donor_' + stripeSessionId,
          recipientEmail: donorEmail,
          recipientName: donorName || 'Donor',
          subject: subject.replace(/{choirName}/g, choirName),
          rawContent: content,
          status: 'Pending',
          attempts: 0,
          filters: JSON.stringify({ type: 'Donation Receipt' }),
        });

        $app.save(mailRecord);
      } catch (mailErr: unknown) {
        console.log(
          'Failed to enqueue donation receipt: ' +
            (mailErr instanceof Error ? mailErr.message : String(mailErr))
        );
      }
    } else if (paymentType === 'dues') {
      const profileId = metadata.profileId;
      const season = metadata.season;

      if (profileId && season) {
        try {
          let duesRecord: PocketBaseRecord;
          try {
            duesRecord = $app.findFirstRecordByFilter(
              'seasonalDues',
              'profile = {:profileId} && season = {:season}',
              { profileId, season }
            );
            duesRecord.set('paid', true);
          } catch {
            const duesColl = $app.findCollectionByNameOrId('pbc_seasonalDues_001');
            duesRecord = new Record(duesColl, {
              profile: profileId,
              season: season,
              paid: true,
            });
          }
          $app.save(duesRecord);
        } catch (err: unknown) {
          console.log(
            'Failed to fulfill dues payment: ' + (err instanceof Error ? err.message : String(err))
          );
        }
      }
    }
  } else if (eventObj.type === 'charge.refunded') {
    const charge = eventObj.data?.object;
    const paymentIntentId = charge?.payment_intent;
    if (paymentIntentId) {
      try {
        const purchases = $app.findRecordsByFilter(
          'ticketPurchases',
          'stripePaymentIntentId = {:paymentIntentId}',
          '',
          1000,
          0,
          { paymentIntentId }
        );
        if (purchases && purchases.length > 0) {
          const txApp = $app as unknown as AppWithTransaction;
          txApp.runInTransaction((tx) => {
            purchases.forEach((p) => {
              p.set('status', 'refunded');
              tx.save(p);
            });
          });
        }
      } catch (err: unknown) {
        console.log(
          'Refunded purchase records not found or error for Payment Intent ID: ' +
            paymentIntentId +
            '. Error: ' +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }
  }

  return e.json(200, { success: true });
}

export function handleAdminRefundTicket(e: PocketBaseRequestEvent): unknown {
  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden' });
  }

  const body = e.requestInfo().body;
  const purchaseId = body.purchaseId as string;
  if (!purchaseId) {
    return e.json(400, { error: 'Missing purchaseId' });
  }

  let purchase: PocketBaseRecord;
  try {
    purchase = $app.findRecordById('ticketPurchases', purchaseId);
  } catch {
    return e.json(404, { error: 'Purchase record not found' });
  }

  const pi = purchase.get('stripePaymentIntentId') as string;
  if (!pi) {
    return e.json(400, { error: 'Stripe payment intent missing on record' });
  }

  try {
    refundPaymentIntent(pi);
    purchase.set('status', 'refunded');
    $app.save(purchase);
    return e.json(200, { success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return e.json(500, { error: 'Failed to issue Stripe refund', details: message });
  }
}

export function handleAdminRefundBundle(e: PocketBaseRequestEvent): unknown {
  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden' });
  }

  const body = e.requestInfo().body;
  const paymentIntentId = body.paymentIntentId as string;
  if (!paymentIntentId) {
    return e.json(400, { error: 'Missing paymentIntentId' });
  }

  let purchases: PocketBaseRecord[];
  try {
    purchases = $app.findRecordsByFilter(
      'ticketPurchases',
      'stripePaymentIntentId = {:paymentIntentId}',
      '',
      1000,
      0,
      { paymentIntentId }
    );
  } catch {
    return e.json(404, { error: 'No purchases found for the payment intent' });
  }

  if (purchases.length === 0) {
    return e.json(404, { error: 'No purchase records found' });
  }

  try {
    refundPaymentIntent(paymentIntentId);
    const txApp = $app as unknown as AppWithTransaction;
    txApp.runInTransaction((tx) => {
      purchases.forEach((p) => {
        p.set('status', 'refunded');
        tx.save(p);
      });
    });
    return e.json(200, { success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return e.json(500, { error: 'Failed to issue Stripe refund', details: message });
  }
}

export function handleAdminRefundDonation(e: PocketBaseRequestEvent): unknown {
  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden' });
  }

  const body = e.requestInfo().body;
  const donationId = body.donationId as string;
  if (!donationId) {
    return e.json(400, { error: 'Missing donationId' });
  }

  let donation: PocketBaseRecord;
  try {
    donation = $app.findRecordById('donations', donationId);
  } catch {
    return e.json(404, { error: 'Donation record not found' });
  }

  const pi = donation.get('stripePaymentIntentId') as string;
  if (!pi) {
    return e.json(400, { error: 'Stripe payment intent missing on record' });
  }

  try {
    refundPaymentIntent(pi);
    donation.set('status', 'refunded');
    $app.save(donation);
    return e.json(200, { success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return e.json(500, { error: 'Failed to issue Stripe refund', details: message });
  }
}
