import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';

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

interface AppWithTransaction {
  runInTransaction(callback: (txApp: PocketBaseApp) => void): void;
}

routerAdd('POST', '/api/admin/bulk-update-rsvps', (e) => {
  // __SHARED_UTILS__

  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden: Admins only' });
  }

  const data = e.requestInfo().body as { [key: string]: unknown };
  const eventId = data.eventId;
  const updates = data.updates;

  if (!eventId || !updates || !Array.isArray(updates)) {
    return e.json(400, { error: 'Missing eventId or updates array' });
  }

  try {
    const rosterCollection = $app.findCollectionByNameOrId('eventRosters');
    const existingRosters =
      $app.findRecordsByFilter('eventRosters', 'event = {:eventId}', '', 1000, 0, {
        eventId: eventId,
      }) || [];

    const rosterMap: { [key: string]: PocketBaseRecord } = {};
    existingRosters.forEach((r) => {
      const profileVal = r.get('profile');
      if (typeof profileVal === 'string') {
        rosterMap[profileVal] = r;
      }
    });

    const txApp = $app as unknown as AppWithTransaction;
    txApp.runInTransaction((tx) => {
      (updates as { profileId: string; rsvp: string }[]).forEach((u) => {
        const existing = rosterMap[u.profileId];
        if (existing) {
          if (u.rsvp === 'Pending') {
            const attendance = existing.get('attendance') || 'Pending';
            const folderNumber = ((existing.get('folderNumber') as string) || '').trim();
            const folderReturned = existing.get('folderReturned');
            const seatId = ((existing.get('seatId') as string) || '').trim();

            const hasOtherData =
              attendance !== 'Pending' || folderNumber !== '' || folderReturned || seatId !== '';
            if (!hasOtherData) {
              tx.delete(existing);
            } else if (existing.get('rsvp') !== 'Pending') {
              existing.set('rsvp', 'Pending');
              existing.set('rsvpNote', '');
              tx.save(existing);
            }
          } else if (existing.get('rsvp') !== u.rsvp) {
            existing.set('rsvp', u.rsvp);
            if (u.rsvp !== 'No') {
              existing.set('rsvpNote', '');
            }
            tx.save(existing);
          }
        } else {
          if (u.rsvp !== 'Pending') {
            const roster = new Record(rosterCollection);
            roster.set('event', eventId);
            roster.set('profile', u.profileId);
            roster.set('rsvp', u.rsvp);
            roster.set('attendance', 'Pending');
            roster.set('folderReturned', false);
            tx.save(roster);
          }
        }
      });
    });

    return e.json(200, { success: true });
  } catch (err) {
    console.log('[Bulk RSVP Hook Error]: ' + String(err));
    return e.json(500, { error: 'Failed to bulk update RSVPs: ' + String(err) });
  }
});
