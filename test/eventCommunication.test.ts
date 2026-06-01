import test from 'node:test';
import assert from 'node:assert/strict';
import type { Event } from '../src/services/eventService';
import type { Venue } from '../src/services/venueService';
import type { CommunicationSettings } from '../src/services/settingsService';
import {
  getEventVenueName,
  buildEventReminderDraft,
} from '../src/views/admin/events/eventCommunication';

const mockVenues = [
  { id: 'venue-1', name: 'St. Jude Cathedral', address: '123 Main St', details: '', mapsUrl: '', created: '', updated: '' },
  { id: 'venue-2', name: 'Grace Hall', address: '456 Elm St', details: '', mapsUrl: '', created: '', updated: '' },
] as unknown as Venue[];

const mockCommunicationSettings = {
  reminderSubjectTemplate: 'Reminder: {eventTitle} at {eventLocation}',
  reminderBodyTemplate: 'Hello {singerName}, join us for {eventType} on {eventDate} at {eventLocation}. Details: {eventDetails}. RSVP: {rsvpLinks}. Player: {playerLink}',
  rsvpConfirmationSubjectTemplate: '',
  rsvpConfirmationBodyTemplate: '',
  auditionConfirmationSubjectTemplate: '',
  auditionConfirmationBodyTemplate: '',
  created: '',
  updated: '',
} as unknown as CommunicationSettings;

test('getEventVenueName() returns venue name when event has a matching venue', () => {
  const event = { venue: 'venue-1' } as Event;
  const name = getEventVenueName(event, mockVenues);
  assert.equal(name, 'St. Jude Cathedral');
});

test('getEventVenueName() returns TBD when event has no venue', () => {
  const event = { venue: '' } as Event;
  const name = getEventVenueName(event, mockVenues);
  assert.equal(name, 'TBD');
});

test('getEventVenueName() returns TBD when venue id is missing', () => {
  const event = { venue: 'venue-nonexistent' } as Event;
  const name = getEventVenueName(event, mockVenues);
  assert.equal(name, 'TBD');
});

test('buildEventReminderDraft() preserves placeholders', () => {
  const event = {
    id: 'event-123',
    title: 'Spring Concert',
    type: 'Performance',
    date: '2026-06-15T18:00:00Z',
    venue: 'venue-1',
    details: 'Wear formal black.',
  } as Event;

  const draft = buildEventReminderDraft({
    event,
    venues: mockVenues,
    timezone: 'America/New_York',
    communicationSettings: mockCommunicationSettings,
  });

  assert.equal(draft.initialEventId, 'event-123');
  assert.equal(draft.initialSubject, 'Reminder: Spring Concert at St. Jude Cathedral');
  
  // Body template check for specific literal placeholder formats
  assert.ok(draft.initialContent.includes('{singerName}'));
  assert.ok(draft.initialContent.includes('{{RSVP_LINKS}}'));
  assert.ok(draft.initialContent.includes('{{PLAYER_LINK}}'));
  assert.ok(draft.initialContent.includes('St. Jude Cathedral'));
  assert.ok(draft.initialContent.includes('Wear formal black.'));
});

test('buildEventReminderDraft() uses event title fallback to event type', () => {
  const event = {
    id: 'event-123',
    title: '',
    type: 'Rehearsal',
    date: '2026-06-15T18:00:00Z',
    venue: 'venue-2',
    details: '',
  } as Event;

  const draft = buildEventReminderDraft({
    event,
    venues: mockVenues,
    timezone: 'America/New_York',
    communicationSettings: mockCommunicationSettings,
  });

  assert.equal(draft.initialSubject, 'Reminder: Rehearsal at Grace Hall');
});

test('buildEventReminderDraft() preserves event titles containing $& or $1', () => {
  const event = {
    id: 'event-123',
    title: 'Fundraiser: $50 & Dinner',
    type: 'Performance',
    date: '2026-06-15T18:00:00Z',
    venue: 'venue-1',
    details: 'Literal $& and $1 in details',
  } as Event;

  const draft = buildEventReminderDraft({
    event,
    venues: mockVenues,
    timezone: 'America/New_York',
    communicationSettings: mockCommunicationSettings,
  });

  assert.equal(draft.initialSubject, 'Reminder: Fundraiser: $50 & Dinner at St. Jude Cathedral');
  assert.ok(draft.initialContent.includes('Literal $& and $1 in details'));
});
