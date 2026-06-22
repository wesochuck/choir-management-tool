import { refundPaymentIntent } from '../stripeService';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';

declare const $app: PocketBaseApp;

interface AppWithTransaction {
  runInTransaction(callback: (txApp: PocketBaseApp) => void): void;
}

export function handleAdminRefundBundle(e: PocketBaseRequestEvent): unknown {
  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden' });
  }

  const body = e.requestInfo().body as Record<string, unknown>;
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
