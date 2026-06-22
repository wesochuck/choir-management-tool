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

routerAdd('POST', '/api/admin/bulk-upsert-attendance', (e) => {
  // __SHARED_UTILS__

  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden: Admins only' });
  }

  const data = e.requestInfo().body as { [key: string]: unknown };
  const eventId = data.eventId;
  const updates = data.updates;

  if (!eventId) {
    return e.json(400, { error: 'Missing eventId' });
  }
  if (!Array.isArray(updates)) {
    return e.json(400, { error: 'updates must be an array' });
  }

  const allowedAttendance: { [key: string]: boolean } = {
    Present: true,
    Absent: true,
    Pending: true,
  };

  const shouldPromotePendingRsvpToYes = (attendance: string, rsvp: string) => {
    return attendance === 'Present' && (!rsvp || rsvp === 'Pending');
  };

  for (let i = 0; i < updates.length; i++) {
    const update = (updates[i] || {}) as { profileId?: string; attendance?: string };
    if (!update.profileId) {
      return e.json(400, { error: 'Each update requires profileId' });
    }
    if (!update.attendance || !allowedAttendance[update.attendance]) {
      return e.json(400, { error: 'Invalid attendance value' });
    }
  }

  try {
    const rosterCollection = $app.findCollectionByNameOrId('eventRosters');
    const existingRosters =
      $app.findRecordsByFilter('eventRosters', 'event = {:eventId}', '', 1000, 0, {
        eventId: eventId,
      }) || [];

    const rosterMap: { [key: string]: PocketBaseRecord } = {};
    existingRosters.forEach((roster) => {
      const profileVal = roster.get('profile');
      if (typeof profileVal === 'string') {
        rosterMap[profileVal] = roster;
      }
    });

    const changedRosters: PocketBaseRecord[] = [];
    const txApp = $app as unknown as AppWithTransaction;
    txApp.runInTransaction((tx) => {
      (updates as { profileId: string; attendance: string }[]).forEach((update) => {
        const existingRoster = rosterMap[update.profileId];
        if (existingRoster) {
          const currentAttendance = existingRoster.get('attendance') as string;
          const currentRsvp = existingRoster.get('rsvp') as string;
          let changed = false;

          if (currentAttendance !== update.attendance) {
            existingRoster.set('attendance', update.attendance);
            changed = true;
          }

          // Match the single attendance update behavior: marking a pending singer Present
          // also makes them attending so RSVP-driven seating views include them.
          if (shouldPromotePendingRsvpToYes(update.attendance, currentRsvp)) {
            existingRoster.set('rsvp', 'Yes');
            changed = true;
          }

          if (changed) {
            tx.save(existingRoster);
          }

          changedRosters.push(existingRoster);
        } else {
          const roster = new Record(rosterCollection);
          roster.set('event', eventId);
          roster.set('profile', update.profileId);
          roster.set('rsvp', update.attendance === 'Present' ? 'Yes' : 'Pending');
          roster.set('attendance', update.attendance);
          roster.set('folderReturned', false);
          tx.save(roster);
          changedRosters.push(roster);
        }
      });
    });

    const payload = changedRosters.map((roster) => ({
      id: roster.id,
      event: roster.get('event'),
      profile: roster.get('profile'),
      attendance: roster.get('attendance'),
      rsvp: roster.get('rsvp'),
      folderNumber: roster.get('folderNumber') || '',
      folderReturned: !!roster.get('folderReturned'),
      seatId: roster.get('seatId') || '',
    }));

    return e.json(200, { rosters: payload });
  } catch (err) {
    console.log('[Bulk Attendance Hook Error]: ' + String(err));
    return e.json(500, { error: 'Failed to bulk upsert attendance: ' + String(err) });
  }
});
