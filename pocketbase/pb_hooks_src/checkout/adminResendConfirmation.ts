import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import {
  enqueueTicketConfirmationEmail,
  enqueueBundleTicketConfirmationEmail,
} from './emailHelpers';

declare const $app: PocketBaseApp;

export function handleAdminResendTicketConfirmation(e: PocketBaseRequestEvent): unknown {
  const authRecord = e.auth;

  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden: Admins only' });
  }

  const body = e.requestInfo().body as Record<string, unknown>;
  const purchaseId = typeof body.purchaseId === 'string' ? body.purchaseId : '';
  const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';

  if (!purchaseId) {
    return e.json(400, { error: 'Missing purchaseId' });
  }

  if (recipientEmail && !recipientEmail.includes('@')) {
    return e.json(400, { error: 'Invalid recipient email' });
  }

  let purchase: PocketBaseRecord;
  try {
    purchase = $app.findRecordById('ticketPurchases', purchaseId);
  } catch {
    return e.json(404, { error: 'Ticket purchase not found' });
  }

  if (purchase.get('status') !== 'paid') {
    return e.json(400, { error: 'Only paid ticket purchases can be resent' });
  }

  const finalRecipientEmail = recipientEmail || String(purchase.get('buyerEmail') || '');
  if (!finalRecipientEmail) {
    return e.json(400, { error: 'No recipient email available' });
  }

  const finalRecipientName = String(purchase.get('buyerName') || 'Buyer');

  try {
    const bundleId = purchase.get('bundle');

    if (bundleId && typeof bundleId === 'string') {
      const bundle = $app.findRecordById('ticketBundles', bundleId);
      const bundleEventsVal = bundle.get('events');
      const bundleEventIds = Array.isArray(bundleEventsVal) ? (bundleEventsVal as string[]) : [];

      enqueueBundleTicketConfirmationEmail({
        purchase,
        bundle,
        bundleEventIds,
        recipientEmail: finalRecipientEmail,
        recipientName: finalRecipientName,
        resent: true,
      });
    } else {
      const eventId = String(purchase.get('event') || '');
      if (!eventId) {
        return e.json(400, { error: 'Ticket purchase is not linked to an event' });
      }

      const event = $app.findRecordById('events', eventId);

      enqueueTicketConfirmationEmail({
        purchase,
        event,
        recipientEmail: finalRecipientEmail,
        recipientName: finalRecipientName,
        resent: true,
      });
    }
  } catch (err: unknown) {
    return e.json(500, {
      error: 'Failed to enqueue ticket confirmation email',
      details: err instanceof Error ? err.message : String(err),
    });
  }

  return e.json(200, {
    success: true,
    recipientEmail: finalRecipientEmail,
  });
}
