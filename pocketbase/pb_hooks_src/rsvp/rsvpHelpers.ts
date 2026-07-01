import type { PocketBaseApp, PocketBaseRecord } from '../email/emailTypes';
import { parseJsonField } from '../email/hookJson';
import { getHmacSecret, parseSignedToken, getEventRecipientPayload } from '../hmacTokens';
import { processEmailQueue } from '../email/queueProcessor';

declare const $app: PocketBaseApp;
declare const $security: {
  hs256(data: string, secret: string): string;
  equal(a: string, b: string): boolean;
};

declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

export interface VerifiedTokenResult {
  ok: boolean;
  status?: number;
  error?: string;
  data?: { [key: string]: string };
}

export function verifyEventRecipientToken(token: string): VerifiedTokenResult {
  const parts = parseSignedToken(token, ['e', 'p', 's']);
  if (!parts) {
    return {
      ok: false,
      status: 400,
      error: 'This RSVP link is invalid. Please request a new RSVP link.',
    };
  }

  let secret: string;
  try {
    secret = getHmacSecret();
    if (!secret) throw new Error('Missing secret');
  } catch {
    return { ok: false, status: 500, error: 'HMAC_SECRET not configured' };
  }

  const payload = getEventRecipientPayload(parts.e, parts.p);
  const expectedSignature = $security.hs256(payload, secret);

  if (!$security.equal(parts.s, expectedSignature)) {
    console.log('[RSVP Debug] Signature mismatch for event=' + parts.e + ', profile=' + parts.p);
    console.log('[RSVP Debug] Expected: ' + expectedSignature + ', Received: ' + parts.s);
    return {
      ok: false,
      status: 401,
      error: 'This RSVP link is invalid or expired. Please request a new RSVP link.',
    };
  }

  return { ok: true, data: parts };
}

export function verifyUnsubscribeToken(token: string): VerifiedTokenResult {
  const parts = parseSignedToken(token, ['p', 's']);
  if (!parts) {
    return { ok: false, status: 400, error: 'Invalid token format' };
  }

  let secret: string;
  try {
    secret = getHmacSecret();
    if (!secret) throw new Error('Missing secret');
  } catch {
    return { ok: false, status: 500, error: 'HMAC_SECRET not configured' };
  }

  const payload = `p=${parts.p}`;
  const expectedSignature = $security.hs256(payload, secret);

  if (!$security.equal(parts.s, expectedSignature)) {
    return { ok: false, status: 401, error: 'Invalid signature' };
  }

  return { ok: true, data: parts };
}

export function buildVenueMap(): { [key: string]: PocketBaseRecord } {
  const venueMap: { [key: string]: PocketBaseRecord } = {};
  try {
    const allVenues = $app.findRecordsByFilter('venues', '1 = 1', '', 200);
    if (allVenues) {
      allVenues.forEach((v) => {
        venueMap[v.id] = v;
      });
    }
  } catch (venueFetchErr) {
    console.log('[RSVP Error] Failed to fetch venues: ' + venueFetchErr);
  }
  return venueMap;
}

export function enqueueRsvpConfirmationEmail(eventId: string, profile: PocketBaseRecord): void {
  try {
    let recipientEmail = '';
    const userId = profile.get('user') as string;
    if (userId) {
      try {
        const userRec = $app.findRecordById('users', userId);
        recipientEmail = (userRec.get('email') as string) || '';
      } catch (err) {
        console.log(
          '[RSVP Confirmation Error] Failed to resolve email for profile ' + profile.id + ': ' + err
        );
      }
    }

    if (recipientEmail && !profile.get('doNotEmail')) {
      const template = $app.findFirstRecordByFilter(
        'messageTemplates',
        "title = 'RSVP Confirmation' && isSystemTemplate = true"
      );
      const queueCollection = $app.findCollectionByNameOrId('emailQueue');

      const queueRecord = new Record(queueCollection, {
        recipientId: profile.id,
        recipientEmail: recipientEmail,
        recipientName: profile.get('name') || ((() => {
          try { const r = $app.findFirstRecordByFilter('appSettings', "key = 'performer_label'"); const v = r?.get('value'); return typeof v === 'string' && v.trim() ? v.trim() : 'Performer'; } catch { return 'Performer'; }
        })()),
        subject: template.get('subject') || '',
        rawContent: template.get('content') || '',
        status: 'Pending',
        attempts: 0,
        filters: JSON.stringify({
          eventId: eventId,
          type: 'Automated Confirmation',
        }),
      });

      $app.save(queueRecord);
      processEmailQueue($app);
    }
  } catch (emailErr) {
    console.log('[RSVP Confirmation Error] Failed to enqueue automated email: ' + emailErr);
  }
}
