import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  quoteCsvValue,
  buildEventRosterCsv,
  buildEventRosterExportFilename,
  type EventRosterExportSinger,
} from '../src/lib/eventRoster/exportCsv.ts';

describe('Event Roster CSV Export Utility', () => {
  it('quoteCsvValue() wraps values in quotes', () => {
    assert.equal(quoteCsvValue('hello'), '"hello"');
  });

  it('quoteCsvValue() escapes embedded quotes', () => {
    assert.equal(quoteCsvValue('hello "world"'), '"hello ""world"""');
  });

  it('quoteCsvValue() neutralizes formula-looking values beginning with =, +, -, or @', () => {
    assert.equal(quoteCsvValue('=SUM(A1)'), '"\'=SUM(A1)"');
    assert.equal(quoteCsvValue('+123'), '"\'+123"');
    assert.equal(quoteCsvValue('-abc'), '"\'-abc"');
    assert.equal(quoteCsvValue('@username'), '"\'@username"');
  });

  it('buildEventRosterCsv() includes the expected header', () => {
    const event = { title: 'Spring Concert' };
    const singers: EventRosterExportSinger[] = [];
    const csv = buildEventRosterCsv({
      event,
      singers,
      voiceParts: [],
      sections: [],
      sort: 'lastName',
    });
    assert.equal(csv, 'Name,Section,Voice Part,Event Title,RSVP Status');
  });

  it('buildEventRosterCsv() groups RSVP statuses in Yes, No, Pending order', () => {
    const event = { title: 'Spring Concert' };
    const singers = [
      { profile: { name: 'Bob' }, rsvp: 'No' },
      { profile: { name: 'Alice' }, rsvp: 'Yes' },
      { profile: { name: 'Charlie' }, rsvp: 'Pending' },
    ] as EventRosterExportSinger[];

    const csv = buildEventRosterCsv({
      event,
      singers,
      voiceParts: [],
      sections: [],
      sort: 'lastName',
    });

    const expected = [
      'Name,Section,Voice Part,Event Title,RSVP Status',
      '"Attending (Yes)",,,,',
      '"Alice","Unassigned","Not sure","Spring Concert","Yes"',
      '',
      '"Declined (No)",,,,',
      '"Bob","Unassigned","Not sure","Spring Concert","No"',
      '',
      '"No Response (Pending)",,,,',
      '"Charlie","Unassigned","Not sure","Spring Concert","Pending"',
    ].join('\n');

    assert.equal(csv, expected);
  });

  it('buildEventRosterCsv() inserts blank lines between non-empty groups', () => {
    const event = { title: 'Spring Concert' };
    const singers = [
      { profile: { name: 'Alice' }, rsvp: 'Yes' },
      { profile: { name: 'Charlie' }, rsvp: 'Pending' },
    ] as EventRosterExportSinger[];

    const csv = buildEventRosterCsv({
      event,
      singers,
      voiceParts: [],
      sections: [],
      sort: 'lastName',
    });

    const expected = [
      'Name,Section,Voice Part,Event Title,RSVP Status',
      '"Attending (Yes)",,,,',
      '"Alice","Unassigned","Not sure","Spring Concert","Yes"',
      '',
      '"No Response (Pending)",,,,',
      '"Charlie","Unassigned","Not sure","Spring Concert","Pending"',
    ].join('\n');

    assert.equal(csv, expected);
  });

  it('buildEventRosterCsv() includes Section Leaders when present', () => {
    const event = { title: 'Spring Concert' };
    const singers = [
      { profile: { name: 'Alice', isSectionLeader: true }, rsvp: 'Yes' },
      { profile: { name: 'Bob' }, rsvp: 'Yes' },
    ] as EventRosterExportSinger[];

    const csv = buildEventRosterCsv({
      event,
      singers,
      voiceParts: [],
      sections: [],
      sort: 'lastName',
    });

    const expected = [
      'Name,Section,Voice Part,Event Title,RSVP Status',
      '"Attending (Yes)",,,,',
      '"Alice","Unassigned","Not sure","Spring Concert","Yes"',
      '"Bob","Unassigned","Not sure","Spring Concert","Yes"',
      '',
      'Section Leaders',
      'Name,Section,Voice Part,Event Title,RSVP Status',
      '"Alice","Unassigned","Not sure","Spring Concert","Yes"',
    ].join('\n');

    assert.equal(csv, expected);
  });

  it('buildEventRosterCsv() sorts by last name', () => {
    const event = { title: 'Spring Concert' };
    const singers = [
      { profile: { name: 'John Doe' }, rsvp: 'Yes' },
      { profile: { name: 'Alice Smith' }, rsvp: 'Yes' },
    ] as EventRosterExportSinger[];

    const csv = buildEventRosterCsv({
      event,
      singers,
      voiceParts: [],
      sections: [],
      sort: 'lastName',
    });

    const expected = [
      'Name,Section,Voice Part,Event Title,RSVP Status',
      '"Attending (Yes)",,,,',
      '"John Doe","Unassigned","Not sure","Spring Concert","Yes"',
      '"Alice Smith","Unassigned","Not sure","Spring Concert","Yes"',
    ].join('\n');

    assert.equal(csv, expected);
  });

  it('buildEventRosterCsv() sorts by section order, then last name', () => {
    const event = { title: 'Spring Concert' };
    const voiceParts = [
      { label: 'Soprano 1', sectionCode: 'S' },
      { label: 'Alto 1', sectionCode: 'A' },
    ];
    const sections = [
      { code: 'S', name: 'Sopranos' },
      { code: 'A', name: 'Altos' },
    ];
    const singers = [
      { profile: { name: 'Alice Smith', voicePart: 'Alto 1' }, rsvp: 'Yes' },
      { profile: { name: 'John Doe', voicePart: 'Soprano 1' }, rsvp: 'Yes' },
    ] as EventRosterExportSinger[];

    const csv = buildEventRosterCsv({
      event,
      singers,
      voiceParts,
      sections,
      sort: 'section',
    });

    const expected = [
      'Name,Section,Voice Part,Event Title,RSVP Status',
      '"Attending (Yes)",,,,',
      '"John Doe","Sopranos","Soprano 1","Spring Concert","Yes"',
      '"Alice Smith","Altos","Alto 1","Spring Concert","Yes"',
    ].join('\n');

    assert.equal(csv, expected);
  });

  it('buildEventRosterExportFilename() sanitizes the event title', () => {
    const event1 = { title: 'Spring Concert 2026!' };
    const event2 = { type: 'rehearsal' };
    assert.equal(buildEventRosterExportFilename(event1), 'spring_concert_2026__rsvp_export.csv');
    assert.equal(buildEventRosterExportFilename(event2), 'rehearsal_rsvp_export.csv');
  });
});
