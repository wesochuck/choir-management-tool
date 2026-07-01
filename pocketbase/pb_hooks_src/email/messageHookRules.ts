import { parseJsonField } from './hookJson';
import type { EmailRecipient, PocketBaseRecord, PocketBaseApp } from './emailTypes';

declare class Collection {}
declare class Record implements PocketBaseRecord {
  id: string;
  get(field: string): unknown;
  set(field: string, value: unknown): void;
  constructor(collection: Collection | undefined, data: { [key: string]: unknown });
}

/**
 * Normalize a phone number to 10 digits by stripping all non-digits
 * and taking the last 10 characters.
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
export function shouldQueueMessage(
  record: PocketBaseRecord | null | undefined,
  oldStatus?: string
): boolean {
  if (!record) return false;

  const status = (record.get('status') as string) || 'Sent';
  if (status !== 'Sent') return false;

  const type = record.get('type') as string;
  if (type !== 'Email' && type !== 'SMS' && type !== 'Both') return false;

  // If update, check status transition to prevent duplicate enqueues
  if (oldStatus !== undefined) {
    return oldStatus !== 'Sent';
  }

  return true;
}

/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
export function enqueueBulkMessage(app: PocketBaseApp, record: PocketBaseRecord): void {
  const queueCollection = app.findCollectionByNameOrId('emailQueue') as Collection;
  const recipients = parseJsonField<EmailRecipient[]>(record.get('recipients')) || [];
  const subject = (record.get('subject') as string) || '';
  const content = (record.get('content') as string) || '';
  const filters = parseJsonField<unknown>(record.get('filters')) || {};
  const type = record.get('type') as string;
  const isSms = type === 'SMS';
  const isBoth = type === 'Both';
  const performerLabel = (() => {
    try {
      const r = app.findFirstRecordByFilter('appSettings', "key = 'performer_label'");
      const v = r?.get('value');
      return typeof v === 'string' && v.trim() ? v.trim() : 'Performer';
    } catch {
      return 'Performer';
    }
  })();

  console.log(
    '[DEBUG] enqueueBulkMessage: type=' +
      type +
      ' recipients.length=' +
      recipients.length +
      ' isSms=' +
      isSms +
      ' isBoth=' +
      isBoth +
      ' rawRecipients=' +
      JSON.stringify(record.get('recipients')).slice(0, 200)
  );

  let smsCount = 0;
  let emailCount = 0;

  recipients.forEach((recipient) => {
    // Create SMS queue entries for phone recipients (SMS-only or Both)
    if (isSms || isBoth) {
      const phone = normalizePhone(recipient.phone || '');
      console.log('[DEBUG] recipient phone=' + (recipient.phone || '') + ' normalized=' + phone);
      if (phone.length === 10) {
        const smsContent = content.length > 160 ? content.slice(0, 159) + '…' : content;

        const smsFilters = {
          ...(typeof filters === 'object' && filters !== null ? filters : {}),
          channel: 'sms',
        };

        const smsRecord = new Record(queueCollection, {
          messageRef: record.id,
          recipientId: recipient.id,
          recipientEmail: phone,
          recipientName: recipient.name || performerLabel,
          subject: '',
          rawContent: smsContent,
          status: 'Pending',
          attempts: 0,
          filters: JSON.stringify(smsFilters),
        });

        app.save(smsRecord);
        smsCount++;
      }
    }

    // Create email queue entries for email recipients (Email-only or Both)
    if (!isSms && recipient.email) {
      const emailRecord = new Record(queueCollection, {
        messageRef: record.id,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        recipientName: recipient.name || performerLabel,
        subject: subject,
        rawContent: content,
        status: 'Pending',
        attempts: 0,
        filters: JSON.stringify(filters),
      });

      app.save(emailRecord);
      emailCount++;
    }
  });

  console.log(
    '[DEBUG] enqueueBulkMessage: created smsCount=' + smsCount + ' emailCount=' + emailCount
  );
}
