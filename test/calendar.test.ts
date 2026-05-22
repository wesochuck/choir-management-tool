import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarUtils } from '../src/lib/calendar.ts';

test('createICS maps basic event properties correctly', () => {
  const event = {
    id: 'test1',
    type: 'Rehearsal',
    date: '2023-10-15T19:00:00.000Z',
    title: 'Weekly Rehearsal',
    details: 'Please bring your music.',
  };

  const opts = { dtstamp: new Date('2023-10-01T12:00:00.000Z') };

  const ics = calendarUtils.createICS(event, opts);

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /VERSION:2\.0/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /UID:event-test1@choir-management-tool/);
  assert.match(ics, /DTSTAMP:20231001T120000Z/);
  assert.match(ics, /DTSTART:20231015T190000Z/);
  assert.match(ics, /DTEND:20231015T210000Z/); // +2 hours default
  assert.match(ics, /SUMMARY:Weekly Rehearsal/);
  assert.match(ics, /DESCRIPTION:Please bring your music\./);
  assert.match(ics, /END:VEVENT/);
  assert.match(ics, /END:VCALENDAR/);
});

test('createICS falls back to type if title is not provided', () => {
  const event = {
    id: 'test2',
    type: 'Performance',
    date: '2023-11-20T20:00:00.000Z',
  };

  const ics = calendarUtils.createICS(event);
  assert.match(ics, /SUMMARY:Performance/);
});

test('createICS escapes special characters in text fields', () => {
  const event = {
    id: 'test3',
    type: 'Meeting',
    date: '2023-12-01T10:00:00.000Z',
    title: 'Board Meeting, Annual',
    details: 'Topics:\n1. Budget;\n2. "Next Steps" \\ Goals',
  };

  const ics = calendarUtils.createICS(event);

  // commas, semicolons, backslashes, and newlines should be escaped
  assert.match(ics, /SUMMARY:Board Meeting\\, Annual/);
  assert.match(ics, /DESCRIPTION:Topics:\\n1\. Budget\\;\\n2\. "Next Steps" \\\\ Goals/);
});

test('createICS resolves location correctly with full venue', () => {
  const event = {
    id: 'test4',
    type: 'Concert',
    date: '2023-12-15T19:30:00.000Z',
    location: 'Old Location',
    expand: {
      venue: {
        name: 'Symphony Hall',
        address: '123 Main St, Cityville',
      }
    }
  };

  const ics = calendarUtils.createICS(event);
  assert.match(ics, /LOCATION:Symphony Hall\\, 123 Main St\\, Cityville/);
});

test('createICS resolves location correctly with venue name only', () => {
  const event = {
    id: 'test5',
    type: 'Rehearsal',
    date: '2023-12-15T19:30:00.000Z',
    location: 'Old Location',
    expand: {
      venue: {
        name: 'Community Center',
      }
    }
  };

  const ics = calendarUtils.createICS(event);
  assert.match(ics, /LOCATION:Community Center/);
});

test('createICS resolves location correctly falling back to location string', () => {
  const event = {
    id: 'test6',
    type: 'Rehearsal',
    date: '2023-12-15T19:30:00.000Z',
    location: 'Church Basement',
  };

  const ics = calendarUtils.createICS(event);
  assert.match(ics, /LOCATION:Church Basement/);
});

test('createICS handles custom options correctly', () => {
  const event = {
    id: 'test7',
    type: 'Workshop',
    date: '2024-01-10T09:00:00.000Z', // 9:00 AM UTC
  };

  const opts = {
    durationHours: 4.5,
    prodId: '-//My Custom App//EN',
    uid: 'custom-uid-123',
    dtstamp: new Date('2024-01-01T00:00:00.000Z')
  };

  const ics = calendarUtils.createICS(event, opts);

  assert.match(ics, /PRODID:-\/\/My Custom App\/\/EN/);
  assert.match(ics, /UID:custom-uid-123/);
  assert.match(ics, /DTSTAMP:20240101T000000Z/);

  // 9:00 AM + 4.5 hours = 13:30 (1:30 PM UTC)
  assert.match(ics, /DTEND:20240110T133000Z/);
});
