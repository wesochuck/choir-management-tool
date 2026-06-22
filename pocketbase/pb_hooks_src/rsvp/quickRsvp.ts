import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import { verifyEventRecipientToken, enqueueRsvpConfirmationEmail } from './rsvpHelpers';
import { validateSingerRsvpWindow } from '../rsvpValidation';
import { notifyAdminsOfDecline } from '../adminNotifications';

declare const $app: PocketBaseApp;
declare class Record implements PocketBaseRecord {
  id: string;
  constructor(collection: unknown, data?: { [key: string]: unknown });
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}
declare function routerAdd(
  method: string,
  path: string,
  handler: (e: PocketBaseRequestEvent) => unknown
): void;

routerAdd('POST', '/api/quick-rsvp', (e) => {
  // __SHARED_UTILS__

  const data = e.requestInfo().body as { [key: string]: unknown };
  const token = data.token;
  const rsvp = data.rsvp;
  const rsvpNote = typeof data.rsvpNote === 'string' ? data.rsvpNote.trim() : '';

  if (!token || !rsvp || typeof token !== 'string') {
    return e.json(400, {
      error: 'Missing RSVP details. Please use full RSVP link from your email.',
    });
  }

  if (rsvpNote.length > 1000) {
    return e.json(400, {
      error: 'Your note cannot exceed 1000 characters.',
      code: 'RSVP_NOTE_TOO_LONG',
    });
  }

  const verification = verifyEventRecipientToken(token);
  if (!verification.ok || !verification.data) {
    return e.json(verification.status || 400, { error: verification.error });
  }
  const parts = verification.data;

  let event: PocketBaseRecord;
  try {
    event = $app.findRecordById('events', parts.e);
  } catch {
    return e.json(404, { error: 'Event not found. RSVP link may be expired.' });
  }
  const windowValidation = validateSingerRsvpWindow(event);
  if (!windowValidation.ok) {
    return e.json(windowValidation.status, { error: windowValidation.error });
  }

  const normalizedRsvp = rsvp === 'No' ? 'No' : 'Yes';

  if (event.get('type') === 'Rehearsal' && normalizedRsvp === 'No' && !rsvpNote) {
    return e.json(400, {
      error: 'Please include a note explaining why you cannot attend this rehearsal.',
      code: 'RSVP_NOTE_REQUIRED',
    });
  }

  try {
    const matches =
      $app.findRecordsByFilter('eventRosters', 'event = {:e} && profile = {:p}', '', 2, 0, {
        e: parts.e,
        p: parts.p,
      }) || [];

    let roster = matches.length > 0 ? matches[0] : null;
    if (!roster) {
      const collection = $app.findCollectionByNameOrId('eventRosters');
      roster = new Record(collection);
      roster.set('event', parts.e);
      roster.set('profile', parts.p);
      roster.set('attendance', 'Pending');
      roster.set('folderReturned', false);
    }

    const oldRsvp = (roster.get('rsvp') as string) || 'Pending';
    const oldNote = ((roster.get('rsvpNote') as string) || '').trim();
    roster.set('rsvp', normalizedRsvp);

    if (normalizedRsvp === 'No') {
      roster.set('rsvpNote', rsvpNote);
    } else {
      roster.set('rsvpNote', '');
    }

    $app.save(roster);

    // Enqueue confirmation email if RSVP changed to Yes
    if (normalizedRsvp === 'Yes' && oldRsvp !== 'Yes') {
      try {
        const profile = $app.findRecordById('profiles', parts.p);
        enqueueRsvpConfirmationEmail(parts.e, profile);
      } catch (emailErr) {
        console.log('[RSVP Confirmation Error] Failed to enqueue automated email: ' + emailErr);
      }
    }

    // Notify admins if RSVP changed to No or decline reason changed for rehearsals
    const shouldNotifyAdmins =
      normalizedRsvp === 'No' &&
      (oldRsvp !== 'No' || (oldNote !== rsvpNote && event.get('type') === 'Rehearsal'));

    if (shouldNotifyAdmins) {
      try {
        const profile = $app.findRecordById('profiles', parts.p);
        notifyAdminsOfDecline($app, parts.e, profile, rsvpNote);
      } catch (declineErr) {
        console.log(
          '[RSVP Decline Hook Error] Failed to process quick-rsvp decline notice: ' + declineErr
        );
      }
    }
  } catch (err) {
    let errDetails: string;
    try {
      errDetails = JSON.stringify(err);
    } catch {
      errDetails = String(err);
    }
    console.log(
      '[RSVP Quick Error] Failed to update RSVP: ' + String(err) + ' | details=' + errDetails
    );
    return e.json(500, { error: 'Failed to update RSVP.' });
  }

  return e.json(200, { success: true });
});
