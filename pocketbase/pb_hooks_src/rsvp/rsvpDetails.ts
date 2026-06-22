import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import { verifyEventRecipientToken, buildVenueMap } from './rsvpHelpers';
import { getRsvpWindowInfo } from '../rsvpValidation';

declare const $app: PocketBaseApp;
declare function routerAdd(
  method: string,
  path: string,
  handler: (e: PocketBaseRequestEvent) => unknown
): void;

routerAdd('POST', '/api/rsvp-details', (e) => {
  // __SHARED_UTILS__

  const data = e.requestInfo().body as { [key: string]: unknown };
  const token = data.token;

  if (!token || typeof token !== 'string') {
    return e.json(400, {
      error: 'Missing RSVP token. Please open full RSVP link from your email.',
    });
  }

  const verification = verifyEventRecipientToken(token);
  if (!verification.ok || !verification.data) {
    return e.json(verification.status || 400, { error: verification.error });
  }
  const parts = verification.data;

  try {
    const venueMap = buildVenueMap();

    const event = $app.findRecordById('events', parts.e);
    const rsvpWindow = getRsvpWindowInfo(event);

    let venueName = '';
    let venueAddress = '';
    try {
      const venueId = event.get('venue');
      if (venueId && typeof venueId === 'string') {
        const venue = venueMap[venueId] || $app.findRecordById('venues', venueId);
        venueName = (venue.get('name') as string) || '';
        venueAddress = (venue.get('address') as string) || '';
      }
    } catch (venueErr) {
      console.log('[RSVP Details] Failed to resolve event venue: ' + venueErr);
    }

    const profile = $app.findRecordById('profiles', parts.p);
    const rehearsals: unknown[] = [];

    if (event.get('type') === 'Performance') {
      try {
        const list = $app.findRecordsByFilter(
          'events',
          'parentPerformanceId = {:eventId}',
          'date',
          100,
          0,
          { eventId: parts.e }
        );
        list.forEach((reh) => {
          let rVenueName = '';
          try {
            const rVenueId = reh.get('venue');
            if (rVenueId && typeof rVenueId === 'string') {
              const rVenue = venueMap[rVenueId] || $app.findRecordById('venues', rVenueId);
              rVenueName = (rVenue.get('name') as string) || '';
            }
          } catch (e) {
            console.log(
              '[RSVP Details] Failed to resolve rehearsal venue for rehearsal ' + reh.id + ': ' + e
            );
          }
          rehearsals.push({
            id: reh.id,
            title: reh.get('title') || '',
            type: reh.get('type') || '',
            date: reh.get('date') || '',
            details: reh.get('details') || '',
            expand: {
              venue: {
                name: rVenueName,
              },
            },
          });
        });
      } catch (rehErr) {
        console.log(
          '[RSVP Details] Failed to fetch rehearsals for performance ' + parts.e + ': ' + rehErr
        );
      }
    }

    let currentRsvp = 'Pending';
    let currentRsvpNote = '';
    try {
      const roster = $app.findFirstRecordByFilter(
        'eventRosters',
        'event = {:e} && profile = {:p}',
        { e: parts.e, p: parts.p }
      );
      currentRsvp = (roster.get('rsvp') as string) || 'Pending';
      currentRsvpNote = (roster.get('rsvpNote') as string) || '';
    } catch (rosterErr) {
      console.log(
        '[RSVP Details] No existing roster found for event ' +
          parts.e +
          ' and profile ' +
          parts.p +
          ': ' +
          rosterErr
      );
    }

    return e.json(200, {
      event: {
        id: event.id,
        title: event.get('title') || '',
        type: event.get('type') || '',
        date: event.get('date') || '',
        details: event.get('details') || '',
        location: event.get('location') || '',
        isOpenForRSVP: !!event.get('isOpenForRSVP'),
        expand: {
          venue: {
            name: venueName,
            address: venueAddress,
          },
        },
      },
      profile: {
        id: profile.id,
        name: profile.get('name') || '',
        voicePart: profile.get('voicePart') || '',
      },
      currentRsvp,
      currentRsvpNote,
      rehearsals,
      rsvpWindow,
    });
  } catch (err) {
    console.log('[RSVP Details Error] Failed to fetch details: ' + err);
    return e.json(404, {
      error:
        'We could not find this RSVP record. Link may be expired. Please request a new RSVP link.',
    });
  }
});
