import { formatInTimezone } from '../email/hookText';
import type { PocketBaseApp, PocketBaseRecord } from '../email/emailTypes';
import { generateSignedTicketToken } from '../hmacTokens';
import { coercePocketBaseDate } from '../pocketbaseDate';
import { getTimezoneSetting, getChoirNameSetting, getBaseUrl } from './checkoutHelpers';

declare const $app: PocketBaseApp;

declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

export function enqueueTicketConfirmationEmail(options: {
  purchase: PocketBaseRecord;
  event: PocketBaseRecord;
  recipientEmail?: string;
  recipientName?: string;
  stripeSessionId?: string;
  amountPaidCents?: number;
  resent?: boolean;
}): void {
  const timezone = getTimezoneSetting();
  const choirName = getChoirNameSetting();
  const baseUrl = getBaseUrl();

  const ticketToken = generateSignedTicketToken(options.purchase.id);
  const stripeSessionId =
    options.stripeSessionId || String(options.purchase.get('stripeSessionId') || '');
  const scanUrl = `${baseUrl}/admin/tickets/scan?token=${encodeURIComponent(ticketToken)}`;
  const successUrl = `${baseUrl}/tickets/order/success?session_id=${encodeURIComponent(stripeSessionId)}`;
  const qrSvgSrc = '';
  const finalRecipientEmail =
    options.recipientEmail || String(options.purchase.get('buyerEmail') || '');
  const finalRecipientName =
    options.recipientName || String(options.purchase.get('buyerName') || 'Buyer');

  const eventTitle = String(options.event.get('title') || '');
  const eventDateStr = formatInTimezone(
    coercePocketBaseDate(options.event.get('date')) ?? new Date(''),
    timezone,
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  );

  const template = $app.findFirstRecordByFilter(
    'messageTemplates',
    "title = 'Ticket Confirmation' && isSystemTemplate = true"
  );
  let content = String(template.get('content') || '');
  const rawSubject = String(template.get('subject') || '');
  const subject = rawSubject.replace(/{eventTitle}/g, eventTitle);

  content = content
    .replace(/{buyerName}/g, finalRecipientName)
    .replace(/{eventTitle}/g, eventTitle)
    .replace(/{eventDate}/g, eventDateStr)
    .replace(/{doorsOpenTime}/g, String(options.event.get('doorsOpenTime') || 'N/A'))
    .replace(/{quantity}/g, String(options.purchase.get('quantity') || 0))
    .replace(
      /{amountPaid}/g,
      (
        (options.amountPaidCents ?? Number(options.purchase.get('amountPaidCents') || 0)) / 100
      ).toFixed(2)
    )
    .replace(/{choirName}/g, choirName)
    .replace(/{successUrl}/g, successUrl);

  const emailQueueCollection = $app.findCollectionByNameOrId('emailQueue');
  const mailRecord = new Record(emailQueueCollection, {
    recipientId: 'buyer_' + stripeSessionId,
    recipientEmail: finalRecipientEmail,
    recipientName: finalRecipientName,
    subject: subject,
    rawContent: content,
    status: 'Pending',
    attempts: 0,
    filters: JSON.stringify({
      eventId: options.event.id,
      ticketToken,
      scanUrl,
      qrSvgSrc,
      successUrl,
      type: 'Automated Confirmation',
      resent: !!options.resent,
    }),
  });
  $app.save(mailRecord);
}

export function enqueueCheckoutRsvpConfirmationEmail(options: {
  purchase: PocketBaseRecord;
  event: PocketBaseRecord;
  recipientEmail?: string;
  recipientName?: string;
  stripeSessionId?: string;
  resent?: boolean;
}): void {
  const timezone = getTimezoneSetting();
  const choirName = getChoirNameSetting();
  const baseUrl = getBaseUrl();

  const ticketToken = generateSignedTicketToken(options.purchase.id);
  const stripeSessionId =
    options.stripeSessionId || String(options.purchase.get('stripeSessionId') || '');
  const scanUrl = `${baseUrl}/admin/tickets/scan?token=${encodeURIComponent(ticketToken)}`;
  const successUrl = `${baseUrl}/tickets/order/success?session_id=${encodeURIComponent(stripeSessionId)}`;
  const qrSvgSrc = '';
  const finalRecipientEmail =
    options.recipientEmail || String(options.purchase.get('buyerEmail') || '');
  const finalRecipientName =
    options.recipientName || String(options.purchase.get('buyerName') || 'Buyer');

  const eventTitle = String(options.event.get('title') || '');
  const eventDateStr = formatInTimezone(
    coercePocketBaseDate(options.event.get('date')) ?? new Date(''),
    timezone,
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  );

  const template = $app.findFirstRecordByFilter(
    'messageTemplates',
    "title = 'Free Ticket RSVP Confirmation' && isSystemTemplate = true"
  );
  let content = String(template.get('content') || '');
  const rawSubject = String(template.get('subject') || '');
  const subject = rawSubject.replace(/{eventTitle}/g, eventTitle);

  content = content
    .replace(/{buyerName}/g, finalRecipientName)
    .replace(/{eventTitle}/g, eventTitle)
    .replace(/{eventDate}/g, eventDateStr)
    .replace(/{doorsOpenTime}/g, String(options.event.get('doorsOpenTime') || 'N/A'))
    .replace(/{quantity}/g, String(options.purchase.get('quantity') || 0))
    .replace(/{choirName}/g, choirName)
    .replace(/{successUrl}/g, successUrl);

  const emailQueueCollection = $app.findCollectionByNameOrId('emailQueue');
  const mailRecord = new Record(emailQueueCollection, {
    recipientId: 'buyer_' + stripeSessionId,
    recipientEmail: finalRecipientEmail,
    recipientName: finalRecipientName,
    subject: subject,
    rawContent: content,
    status: 'Pending',
    attempts: 0,
    filters: JSON.stringify({
      eventId: options.event.id,
      ticketToken,
      scanUrl,
      qrSvgSrc,
      successUrl,
      type: 'Automated Confirmation',
      resent: !!options.resent,
    }),
  });
  $app.save(mailRecord);
}

export function enqueueBundleTicketConfirmationEmail(options: {
  purchase: PocketBaseRecord;
  bundle: PocketBaseRecord;
  bundleEventIds: string[];
  recipientEmail?: string;
  recipientName?: string;
  stripeSessionId?: string;
  amountPaidCents?: number;
  resent?: boolean;
}): void {
  const timezone = getTimezoneSetting();
  const choirName = getChoirNameSetting();
  const baseUrl = getBaseUrl();

  const ticketToken = generateSignedTicketToken(options.purchase.id);
  const stripeSessionId =
    options.stripeSessionId || String(options.purchase.get('stripeSessionId') || '');
  const scanUrl = `${baseUrl}/admin/tickets/scan?token=${encodeURIComponent(ticketToken)}`;
  const successUrl = `${baseUrl}/tickets/order/success?session_id=${encodeURIComponent(stripeSessionId)}`;
  const qrSvgSrc = '';
  const finalRecipientEmail =
    options.recipientEmail || String(options.purchase.get('buyerEmail') || '');
  const finalRecipientName =
    options.recipientName || String(options.purchase.get('buyerName') || 'Buyer');

  const eventDetailsParts: string[] = [];
  options.bundleEventIds.forEach((eventId) => {
    try {
      const ev = $app.findRecordById('events', eventId);
      const evTitle = String(ev.get('title') || '');
      const evDateStr = formatInTimezone(
        coercePocketBaseDate(ev.get('date')) ?? new Date(''),
        timezone,
        {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }
      );
      eventDetailsParts.push(`- ${evTitle} on ${evDateStr}`);
    } catch {
      // Ignore individual event loading errors.
    }
  });
  const eventDetailsStr = eventDetailsParts.join('\n');

  const template = $app.findFirstRecordByFilter(
    'messageTemplates',
    "title = 'Bundle Ticket Confirmation' && isSystemTemplate = true"
  );
  let content = String(template.get('content') || '');
  const rawSubject = String(template.get('subject') || '');
  const bundleTitle = String(options.bundle.get('title') || '');
  const subject = rawSubject.replace(/{bundleTitle}/g, bundleTitle);

  content = content
    .replace(/{buyerName}/g, finalRecipientName)
    .replace(/{bundleTitle}/g, bundleTitle)
    .replace(/{eventDetails}/g, eventDetailsStr)
    .replace(/{quantity}/g, String(options.purchase.get('quantity') || 0))
    .replace(
      /{amountPaid}/g,
      (
        (options.amountPaidCents ?? Number(options.purchase.get('amountPaidCents') || 0)) / 100
      ).toFixed(2)
    )
    .replace(/{choirName}/g, choirName)
    .replace(/{successUrl}/g, successUrl);

  const emailQueueCollection = $app.findCollectionByNameOrId('emailQueue');
  const mailRecord = new Record(emailQueueCollection, {
    recipientId: 'buyer_' + stripeSessionId,
    recipientEmail: finalRecipientEmail,
    recipientName: finalRecipientName,
    subject: subject,
    rawContent: content,
    status: 'Pending',
    attempts: 0,
    filters: JSON.stringify({
      bundleId: options.bundle.id,
      ticketToken,
      scanUrl,
      qrSvgSrc,
      successUrl,
      type: 'Automated Bundle Confirmation',
      resent: !!options.resent,
    }),
  });
  $app.save(mailRecord);
}
