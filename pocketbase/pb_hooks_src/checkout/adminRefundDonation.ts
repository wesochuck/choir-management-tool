import { refundPaymentIntent } from '../stripeService';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';

declare const $app: PocketBaseApp;

export function handleAdminRefundDonation(e: PocketBaseRequestEvent): unknown {
  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden' });
  }

  const body = e.requestInfo().body as Record<string, unknown>;
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
