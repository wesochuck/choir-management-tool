import { parseJsonField } from '../email/hookJson';
import { createCheckoutSession } from '../stripeService';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import { getOrCreatePatronProfile } from './checkoutHelpers';

declare const $app: PocketBaseApp;

declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

export function handleCreateDonationSession(e: PocketBaseRequestEvent): unknown {
  const body = e.requestInfo().body as { [key: string]: unknown };
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
