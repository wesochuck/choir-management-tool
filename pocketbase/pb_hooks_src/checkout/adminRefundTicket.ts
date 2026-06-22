import { refundPaymentIntent } from '../stripeService';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';

declare const $app: PocketBaseApp;

export function handleAdminRefundTicket(e: PocketBaseRequestEvent): unknown {
  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden' });
  }

  const body = e.requestInfo().body as Record<string, unknown>;
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
