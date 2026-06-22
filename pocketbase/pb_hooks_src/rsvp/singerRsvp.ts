import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import { enqueueRsvpConfirmationEmail } from './rsvpHelpers';
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

routerAdd('POST', '/api/singer/rsvp', (e) => {
  // __SHARED_UTILS__

  const authRecord = e.auth;
  if (!authRecord) {
    return e.json(401, { error: 'Unauthorized' });
  }

  const data = e.requestInfo().body as { [key: string]: unknown };
  if (typeof data.eventId !== 'string' || typeof data.rsvp !== 'string') {
    return e.json(400, { error: 'Missing eventId or rsvp' });
  }
  const eventId: string = data.eventId;
  const rsvp: string = data.rsvp;
  const rsvpNote = typeof data.rsvpNote === 'string' ? data.rsvpNote.trim() : '';

  if (rsvpNote.length > 1000) {
    return e.json(400, {
      error: 'Your note cannot exceed 1000 characters.',
      code: 'RSVP_NOTE_TOO_LONG',
    });
  }

  if (rsvp !== 'Yes' && rsvp !== 'No' && rsvp !== 'Pending') {
    return e.json(400, { error: 'Invalid rsvp status' });
  }

  let profile: PocketBaseRecord;
  try {
    profile = $app.findFirstRecordByFilter('profiles', 'user = {:userId}', {
      userId: authRecord.id,
    });
  } catch {
    return e.json(404, { error: 'Profile not found' });
  }

  let event: PocketBaseRecord;
  try {
    event = $app.findRecordById('events', eventId);
  } catch {
    return e.json(404, { error: 'Event not found' });
  }
  const windowValidation = validateSingerRsvpWindow(event);
  if (!windowValidation.ok) {
    return e.json(windowValidation.status, { error: windowValidation.error });
  }

  if (event.get('type') === 'Rehearsal' && rsvp === 'No' && !rsvpNote) {
    return e.json(400, {
      error: 'Please include a note explaining why you cannot attend this rehearsal.',
      code: 'RSVP_NOTE_REQUIRED',
    });
  }

  try {
    const matches =
      $app.findRecordsByFilter('eventRosters', 'event = {:e} && profile = {:p}', '', 2, 0, {
        e: eventId,
        p: profile.id,
      }) || [];

    let roster = matches.length > 0 ? matches[0] : null;

    if (rsvp === 'Pending') {
      if (roster) {
        const hasOtherData =
          roster.get('attendance') !== 'Pending' ||
          Boolean(((roster.get('folderNumber') as string) || '').trim()) ||
          roster.get('folderReturned') ||
          Boolean(((roster.get('seatId') as string) || '').trim());

        if (!hasOtherData) {
          $app.delete(roster);
          return e.json(200, {
            id: '',
            event: eventId,
            profile: profile.id,
            rsvp: 'Pending',
            attendance: 'Pending',
            folderReturned: false,
          });
        } else {
          roster.set('rsvp', 'Pending');
          roster.set('rsvpNote', '');
          $app.save(roster);
        }
      } else {
        return e.json(200, {
          id: '',
          event: eventId,
          profile: profile.id,
          rsvp: 'Pending',
          attendance: 'Pending',
          folderReturned: false,
        });
      }
    } else {
      const oldRsvp = roster ? (roster.get('rsvp') as string) || 'Pending' : 'Pending';
      const oldNote = roster ? ((roster.get('rsvpNote') as string) || '').trim() : '';
      if (!roster) {
        const collection = $app.findCollectionByNameOrId('eventRosters');
        roster = new Record(collection);
        roster.set('event', eventId);
        roster.set('profile', profile.id);
        roster.set('attendance', 'Pending');
        roster.set('folderReturned', false);
      }

      roster.set('rsvp', rsvp);
      if (rsvp === 'No') {
        roster.set('rsvpNote', rsvpNote);
      } else {
        roster.set('rsvpNote', '');
      }

      $app.save(roster);

      // Enqueue confirmation email if RSVP changed to Yes
      if (rsvp === 'Yes' && oldRsvp !== 'Yes') {
        try {
          enqueueRsvpConfirmationEmail(eventId, profile);
        } catch (emailErr) {
          console.log('[RSVP Confirmation Error] Failed to enqueue automated email: ' + emailErr);
        }
      }

      // Notify admins if RSVP changed to No or decline reason changed for rehearsals
      const shouldNotifyAdmins =
        rsvp === 'No' &&
        (oldRsvp !== 'No' || (oldNote !== rsvpNote && event.get('type') === 'Rehearsal'));

      if (shouldNotifyAdmins) {
        try {
          notifyAdminsOfDecline($app, eventId, profile, rsvpNote);
        } catch (declineErr) {
          console.log(
            '[RSVP Decline Hook Error] Failed to process singer/rsvp decline notice: ' + declineErr
          );
        }
      }
    }

    return e.json(200, {
      id: roster.id,
      event: roster.get('event'),
      profile: roster.get('profile'),
      rsvp: roster.get('rsvp'),
      rsvpNote: roster.get('rsvpNote') || '',
      attendance: roster.get('attendance'),
      folderReturned: !!roster.get('folderReturned'),
      seatId: roster.get('seatId') || '',
      folderNumber: roster.get('folderNumber') || '',
    });
  } catch (err) {
    console.log('[Singer RSVP Error] Failed to update RSVP: ' + err);
    return e.json(500, { error: 'Failed to update RSVP' });
  }
});
