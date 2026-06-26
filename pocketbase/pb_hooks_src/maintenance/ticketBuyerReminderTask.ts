import type { PocketBaseApp } from '../email/emailTypes';
import type { MaintenanceState, MaintenanceTaskResult } from './maintenanceTypes';
import { formatInTimezone } from '../email/hookText';
import { coercePocketBaseDate } from '../pocketbaseDate';
import { parseJsonField } from '../email/hookJson';
import { generateSignedTicketToken } from '../hmacTokens';

declare const Record: new (
  collection: unknown,
  data?: unknown
) => { id: string; set(field: string, value: unknown): void; get(field: string): unknown };

export function runTicketBuyerReminderTask(
  app: PocketBaseApp,
  state: MaintenanceState,
  now: Date
): MaintenanceTaskResult {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const events = app.findRecordsByFilter(
    'events',
    "type = 'Performance' && date >= {:now} && date <= {:tomorrow} && isArchived != true && isTicketingEnabled = true",
    'date',
    100,
    0,
    { now, tomorrow }
  );

  if (!events || events.length === 0) {
    return {
      task: 'ticketBuyerReminder',
      status: 'ran',
      processed: 0,
      queued: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };
  }

  let template;
  try {
    template = app.findFirstRecordByFilter(
      'messageTemplates',
      "title = 'Ticket Concert Reminder' && isSystemTemplate = true"
    );
  } catch (e) {
    console.log('[Reminder Cron] Ticket Concert Reminder template not found');
    return {
      task: 'ticketBuyerReminder',
      status: 'ran',
      processed: events.length,
      queued: 0,
      updated: 0,
      skipped: events.length,
      errors: 0,
    };
  }

  let timezone = 'America/New_York';
  try {
    const tzSetting = app.findFirstRecordByFilter('appSettings', "key = 'timezone'");
    const tzP = parseJsonField(tzSetting.get('value'));
    if (tzP && tzP.timezone) timezone = tzP.timezone;
  } catch (e) {}

  let choirName = 'Choir Management Tool';
  try {
    const choirRecord = app.findFirstRecordByFilter(
      'appSettings',
      "key = 'choir_name' || key = 'choirName'"
    );
    const parsed = parseJsonField(choirRecord.get('value'));
    const val =
      parsed.name || parsed.choirName || parsed.value || (typeof parsed === 'string' ? parsed : '');
    if (val) choirName = val;
  } catch (e) {}

  let baseUrl = 'http://localhost:5173';
  try {
    const commRecord = app.findFirstRecordByFilter('appSettings', "key = 'communications'");
    const comms = parseJsonField(commRecord.get('value'));
    if (comms && comms.frontendUrl) baseUrl = comms.frontendUrl;
  } catch (e) {}
  if (baseUrl === 'http://localhost:5173' || !baseUrl || baseUrl.indexOf('localhost') !== -1) {
    const meta = app.settings()?.meta;
    const url = meta?.appUrl || meta?.appURL || '';
    if (url) baseUrl = url;
  }
  baseUrl = baseUrl.trim().replace(/[\/]+$/g, '');

  let processed = 0;
  let queued = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  events.forEach((event) => {
    processed++;
    const purchases = app.findRecordsByFilter(
      'ticketPurchases',
      "event = {:eventId} && status = 'paid' && reminderSent != true",
      '',
      1000,
      0,
      { eventId: event.id }
    );

    if (!purchases || purchases.length === 0) {
      skipped++;
      return;
    }

    const eventTitle = event.get('title') || '';
    const eventDateStr = formatInTimezone(
      coercePocketBaseDate(event.get('date')) ?? new Date(''),
      timezone,
      { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    );
    const doorsOpenTime = event.get('doorsOpenTime') || 'N/A';

    purchases.forEach((purchase) => {
      const buyerName = purchase.get('buyerName') || 'Music Lover';
      const quantity = purchase.get('quantity') || 0;

      let content = template.get('content') || '';
      content = content
        .replace(/{buyerName}/g, buyerName)
        .replace(/{eventTitle}/g, eventTitle)
        .replace(/{eventDate}/g, eventDateStr)
        .replace(/{doorsOpenTime}/g, doorsOpenTime)
        .replace(/{quantity}/g, String(quantity))
        .replace(/{choirName}/g, choirName);

      const subject = (template.get('subject') || 'Concert Reminder').replace(
        /{eventTitle}/g,
        eventTitle
      );

      const stripeSessionId = purchase.get('stripeSessionId') || '';
      const ticketToken = generateSignedTicketToken(purchase.id);
      const scanUrl = baseUrl + '/admin/tickets/scan?token=' + encodeURIComponent(ticketToken);
      const successUrl =
        baseUrl + '/tickets/order/success?session_id=' + encodeURIComponent(stripeSessionId);
      const qrSvgSrc = '';

      try {
        const queueCollection = app.findCollectionByNameOrId('emailQueue');
        const mailRecord = new Record(queueCollection, {
          recipientId: 'buyer_' + purchase.id,
          recipientEmail: purchase.get('buyerEmail'),
          recipientName: buyerName,
          subject: subject,
          rawContent: content,
          status: 'Pending',
          attempts: 0,
          filters: JSON.stringify({
            eventId: event.id,
            type: 'Ticket Buyer Reminder',
            ticketToken: ticketToken,
            scanUrl: scanUrl,
            qrSvgSrc: qrSvgSrc,
            successUrl: successUrl,
          }),
        });
        app.save(mailRecord);
        queued++;

        purchase.set('reminderSent', true);
        app.save(purchase);
        updated++;
      } catch (e) {
        console.log(
          '[Reminder Cron] Failed to enqueue email for purchase ' + purchase.id + ': ' + e
        );
        errors++;
      }
    });

    try {
      const messageCollection = app.findCollectionByNameOrId('messages');
      const msgRecord = new Record(messageCollection, {
        subject: 'Ticket Buyer Reminders Sent: ' + eventTitle,
        content: 'Sent reminders for ' + eventTitle,
        type: 'Email',
        status: 'Sent',
        recipients: [],
        filters: { eventId: event.id, type: 'Ticket Buyer Reminder' },
      });
      app.save(msgRecord);
    } catch (e) {
      console.log('[Reminder Cron] Failed to log message for event ' + event.id + ': ' + e);
      errors++;
    }
  });

  return {
    task: 'ticketBuyerReminder',
    status: errors > 0 ? 'failed' : 'ran',
    processed,
    queued,
    updated,
    skipped,
    errors,
  };
}
