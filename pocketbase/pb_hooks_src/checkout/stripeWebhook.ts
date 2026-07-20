import { parseJsonField } from '../email/hookJson';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import {
  enqueueTicketConfirmationEmail,
  enqueueBundleTicketConfirmationEmail,
} from './emailHelpers';
import { getOrCreatePatronProfile } from './checkoutHelpers';
import { notifyOfFinancialEvent } from './financialNotifications';
import { expirePendingPaymentRecord } from './expiration';
export { expirePendingPaymentRecord, expireStalePendingRecords } from './expiration';
export type { ExpireResult, ExpireStaleSummary } from './expiration';

declare const $app: PocketBaseApp;
declare const $security: {
  hs256(payload: string, secret: string): string;
  equal(a: string, b: string): boolean;
  randomString(length: number): string;
};

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

declare function readerToString(reader: unknown, maxBytes?: number): string;

export function isStripePaymentModuleEnabled(
  app: PocketBaseApp,
  moduleId: 'ticketSales' | 'donations' | 'roster'
): boolean {
  try {
    const setting = app.findFirstRecordByFilter('appSettings', "key = 'module_state'");
    const parsed = parseJsonField<{ enabled?: unknown }>(setting.get('value'));
    return Array.isArray(parsed?.enabled) && parsed.enabled.includes(moduleId);
  } catch {
    return false;
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

    if (
      (paymentType === 'ticket' || paymentType === 'bundle') &&
      !isStripePaymentModuleEnabled($app, 'ticketSales')
    ) {
      return e.json(404, { error: 'Not Found: Module ticketSales is disabled' });
    }
    if (paymentType === 'donation' && !isStripePaymentModuleEnabled($app, 'donations')) {
      return e.json(404, { error: 'Not Found: Module donations is disabled' });
    }
    if (paymentType === 'dues' && !isStripePaymentModuleEnabled($app, 'roster')) {
      return e.json(404, { error: 'Not Found: Module roster is disabled' });
    }

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
        if (record.get('status') === 'refunded') {
          console.log(
            '[Stripe Webhook] completed: ignoring event for refunded ticket sessionId=' +
              stripeSessionId
          );
          return e.json(200, {
            success: true,
            message: 'Refunded record not overwritten',
          });
        }
        // pending or expired -> paid. Clear any prior expiredAt
        // so the row fully returns to "not expired" state.
        record.set('status', 'paid');
        record.set('stripePaymentIntentId', session.payment_intent || '');
        record.set('stripeCustomerId', session.customer || '');
        record.set('fulfilledAt', new Date().toISOString());
        record.set('expiredAt', '');
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
        enqueueTicketConfirmationEmail({
          purchase: record,
          event: targetEvent,
          stripeSessionId,
          amountPaidCents: session.amount_total || 0,
          resent: false,
        });
      } catch (mailErr: unknown) {
        console.log(
          'Failed to enqueue confirmation email: ' +
            (mailErr instanceof Error ? mailErr.message : String(mailErr))
        );
      }

      // Send financial alert for ticket sale
      try {
        notifyOfFinancialEvent($app, 'Sale', {
          buyerName: record.get('buyerName') as string,
          buyerEmail: record.get('buyerEmail') as string,
          targetName: (targetEvent.get('title') || 'Event') as string,
          quantity: quantity,
          amountPaid: (session.amount_total || 0) / 100,
        });
      } catch (alertErr: unknown) {
        console.log('Failed to send ticket sale financial alert: ' + alertErr);
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
        if (record.get('status') === 'refunded') {
          console.log(
            '[Stripe Webhook] completed: ignoring event for refunded bundle sessionId=' +
              stripeSessionId
          );
          return e.json(200, {
            success: true,
            message: 'Refunded record not overwritten',
          });
        }
        // pending or expired -> paid. Clear any prior expiredAt.
        record.set('status', 'paid');
        record.set('stripePaymentIntentId', session.payment_intent || '');
        record.set('stripeCustomerId', session.customer || '');
        record.set('fulfilledAt', new Date().toISOString());
        record.set('expiredAt', '');
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
        enqueueBundleTicketConfirmationEmail({
          purchase: record,
          bundle: targetBundle,
          bundleEventIds,
          stripeSessionId,
          amountPaidCents: session.amount_total || 0,
          resent: false,
        });
      } catch (mailErr: unknown) {
        console.log(
          'Failed to enqueue bundle confirmation email: ' +
            (mailErr instanceof Error ? mailErr.message : String(mailErr))
        );
      }

      // Send financial alert for bundle sale
      try {
        notifyOfFinancialEvent($app, 'Sale', {
          buyerName: record.get('buyerName') as string,
          buyerEmail: record.get('buyerEmail') as string,
          targetName: (targetBundle.get('title') || 'Bundle') as string,
          quantity: quantity,
          amountPaid: (session.amount_total || 0) / 100,
        });
      } catch (alertErr: unknown) {
        console.log('Failed to send bundle sale financial alert: ' + alertErr);
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
      const marketingOptIn = metadata.marketingOptIn === 'true';

      try {
        record = $app.findFirstRecordByFilter('donations', 'stripeSessionId = {:stripeSessionId}', {
          stripeSessionId,
        });
        if (record.get('status') === 'paid') {
          return e.json(200, { success: true, message: 'Duplicate donation ignored' });
        }
        if (record.get('status') === 'refunded') {
          console.log(
            '[Stripe Webhook] completed: ignoring event for refunded donation sessionId=' +
              stripeSessionId
          );
          return e.json(200, {
            success: true,
            message: 'Refunded record not overwritten',
          });
        }
        // pending or expired -> paid. Clear any prior expiredAt.
        record.set('status', 'paid');
        record.set('stripePaymentIntentId', session.payment_intent || '');
        record.set('expiredAt', '');
        record.set('marketingOptIn', marketingOptIn);
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
          marketingOptIn,
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

      // Send financial alert for donation
      try {
        let tributeSection = '';
        if (tributeType === 'memory' && tributeName) {
          tributeSection = `This donation was made in memory of ${tributeName}.`;
        } else if (tributeType === 'honor' && tributeName) {
          tributeSection = `This donation was made in honor of ${tributeName}.`;
        }

        notifyOfFinancialEvent($app, 'Donation', {
          donorName,
          donorEmail,
          amountPaid: amountPaidCents / 100,
          tributeSection,
        });
      } catch (alertErr: unknown) {
        console.log('Failed to send donation financial alert: ' + alertErr);
      }
    } else if (paymentType === 'dues') {
      const profileId = metadata.profileId;
      const seasonId = metadata.seasonId;
      const stripeSessionId = session.id || '';

      if (profileId && seasonId && stripeSessionId) {
        try {
          let duesRecord: PocketBaseRecord;
          try {
            duesRecord = $app.findFirstRecordByFilter(
              'seasonalDues',
              'profile = {:profileId} && season = {:seasonId}',
              { profileId, seasonId }
            );
            duesRecord.set('paid', true);
            duesRecord.set('stripeSessionId', stripeSessionId);
            duesRecord.set('amountPaidCents', Number(metadata.amountPaidCents || 0));
            duesRecord.set('feeCents', Number(metadata.feeCents || 0));
          } catch {
            const duesColl = $app.findCollectionByNameOrId('pbc_seasonalDues_001');
            duesRecord = new Record(duesColl, {
              profile: profileId,
              season: seasonId,
              paid: true,
              stripeSessionId: stripeSessionId,
              amountPaidCents: Number(metadata.amountPaidCents || 0),
              feeCents: Number(metadata.feeCents || 0),
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
  } else if (eventObj.type === 'checkout.session.expired') {
    const session = eventObj.data && eventObj.data.object;
    if (!session) {
      console.log('[Stripe Webhook] expired: missing session object');
      return e.json(200, { success: true, message: 'No session' });
    }
    const stripeSessionId = session.id || '';
    if (!stripeSessionId) {
      console.log('[Stripe Webhook] expired: missing session id');
      return e.json(200, { success: true, message: 'No session id' });
    }
    const paymentType = (session.metadata && session.metadata.paymentType) || '';
    if (
      (paymentType === 'ticket' || paymentType === 'bundle') &&
      !isStripePaymentModuleEnabled($app, 'ticketSales')
    ) {
      return e.json(404, { error: 'Not Found: Module ticketSales is disabled' });
    }
    if (paymentType === 'donation' && !isStripePaymentModuleEnabled($app, 'donations')) {
      return e.json(404, { error: 'Not Found: Module donations is disabled' });
    }
    if (paymentType !== 'ticket' && paymentType !== 'bundle' && paymentType !== 'donation') {
      console.log('[Stripe Webhook] expired: unsupported paymentType=' + paymentType);
      return e.json(200, { success: true, message: 'Unsupported paymentType' });
    }
    const collectionName = paymentType === 'donation' ? 'donations' : 'ticketPurchases';
    const result = expirePendingPaymentRecord($app, collectionName, stripeSessionId, 'webhook');
    console.log(
      '[Stripe Webhook] expired: ' +
        result +
        ' collection=' +
        collectionName +
        ' sessionId=' +
        stripeSessionId
    );
    return e.json(200, { success: true, message: result });
  } else if (eventObj.type === 'charge.refunded') {
    const charge = eventObj.data?.object;
    const paymentIntentId = charge?.payment_intent;
    if (paymentIntentId) {
      // 1. Process ticketPurchases refunds
      if (isStripePaymentModuleEnabled($app, 'ticketSales')) {
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
            let alreadyRefunded = true;
            const txApp = $app as unknown as AppWithTransaction;
            txApp.runInTransaction((tx) => {
              purchases.forEach((p) => {
                if (p.get('status') !== 'refunded') {
                  alreadyRefunded = false;
                  p.set('status', 'refunded');
                  tx.save(p);
                }
              });
            });

            // Only send alert if this is the first time we process this refund
            if (!alreadyRefunded) {
              const first = purchases[0];
              let targetName = 'Tickets';
              if (first.get('bundle')) {
                try {
                  const bundleRecord = $app.findRecordById(
                    'ticketBundles',
                    first.get('bundle') as string
                  );
                  targetName = (bundleRecord.get('title') || 'Ticket Bundle') as string;
                } catch {}
              } else if (first.get('event')) {
                try {
                  const eventRecord = $app.findRecordById('events', first.get('event') as string);
                  targetName = (eventRecord.get('title') || 'Tickets') as string;
                } catch {}
              }

              const totalAmount =
                purchases.reduce((sum, p) => sum + (Number(p.get('amountPaidCents')) || 0), 0) /
                100;

              notifyOfFinancialEvent($app, 'Refund', {
                buyerName: first.get('buyerName') as string,
                buyerEmail: first.get('buyerEmail') as string,
                amountRefunded: totalAmount,
                targetName: targetName,
              });
            }
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

      // 2. Process donations refunds
      if (isStripePaymentModuleEnabled($app, 'donations')) {
        try {
          const donations = $app.findRecordsByFilter(
            'donations',
            'stripePaymentIntentId = {:paymentIntentId}',
            '',
            1000,
            0,
            { paymentIntentId }
          );
          if (donations && donations.length > 0) {
            let alreadyRefunded = true;
            const txApp = $app as unknown as AppWithTransaction;
            txApp.runInTransaction((tx) => {
              donations.forEach((d) => {
                if (d.get('status') !== 'refunded') {
                  alreadyRefunded = false;
                  d.set('status', 'refunded');
                  tx.save(d);
                }
              });
            });

            if (!alreadyRefunded) {
              donations.forEach((d) => {
                notifyOfFinancialEvent($app, 'Refund', {
                  buyerName: d.get('donorName') as string,
                  buyerEmail: d.get('donorEmail') as string,
                  amountRefunded: (Number(d.get('amountPaidCents')) || 0) / 100,
                  targetName: 'Donation',
                });
              });
            }
          }
        } catch (err: unknown) {
          console.log(
            'Refunded donation records not found or error for Payment Intent ID: ' +
              paymentIntentId +
              '. Error: ' +
              (err instanceof Error ? err.message : String(err))
          );
        }
      }
    }
  }

  return e.json(200, { success: true });
}
