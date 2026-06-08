import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderManualAttendanceReportSubject,
  renderManualAttendanceReportTemplate,
} from '../../src/services/communicationService';
import { escapeHtml, sanitizeEmailSubject } from '../../src/lib/textSafety';

test('manual attendance report escapes absentee names in HTML body', () => {
  const html = renderManualAttendanceReportTemplate({
    template: '<ul>{absenteesList}</ul>',
    eventTitle: 'Concert',
    eventDate: '1/1/2026',
    attendanceRate: '90.0',
    presentCount: 9,
    totalCount: 10,
    absenteeNames: ['Jane <script>alert(1)</script>'],
  });

  assert.match(html, /Jane &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('manual attendance report escapes event title in HTML body', () => {
  const html = renderManualAttendanceReportTemplate({
    template: '<p>{eventTitle}</p>',
    eventTitle: 'Concert <img src=x>',
    eventDate: '1/1/2026',
    attendanceRate: '90.0',
    presentCount: 9,
    totalCount: 10,
    absenteeNames: [],
  });

  assert.match(html, /Concert &lt;img src=x&gt;/);
  assert.doesNotMatch(html, /<img/);
});

test('manual attendance report renders None when absentee list is empty', () => {
  const html = renderManualAttendanceReportTemplate({
    template: '<ul>{absenteesList}</ul>',
    eventTitle: 'Concert',
    eventDate: '1/1/2026',
    attendanceRate: '100.0',
    presentCount: 10,
    totalCount: 10,
    absenteeNames: [],
  });

  assert.match(html, /<li>None<\/li>/);
});

test('manual attendance report preserves dollar signs literally in body replacements', () => {
  const html = renderManualAttendanceReportTemplate({
    template: '<p>{eventTitle}</p><ul>{absenteesList}</ul>',
    eventTitle: 'Concert $& $1 $$',
    eventDate: '1/1/2026',
    attendanceRate: '90.0',
    presentCount: 9,
    totalCount: 10,
    absenteeNames: ['Singer $& $1 $$'],
  });

  assert.ok(html.includes('Concert $&amp; $1 $$'));
  assert.ok(html.includes('Singer $&amp; $1 $$'));
  assert.doesNotMatch(html, /{eventTitle}/);
  assert.doesNotMatch(html, /{absenteesList}/);
});

test('manual attendance report subject strips CRLF and preserves readable non-html text', () => {
  const subject = renderManualAttendanceReportSubject({
    template: 'Attendance: {eventTitle} ({eventDate})',
    eventTitle: 'Concert\r\nBCC: attacker@example.org <Finale>',
    eventDate: '1/1/2026',
  });

  assert.equal(subject, 'Attendance: Concert BCC: attacker@example.org <Finale> (1/1/2026)');
  assert.doesNotMatch(subject, /[\r\n]/);
  assert.match(subject, /<Finale>/);
});

test('manual attendance report subject preserves dollar signs literally', () => {
  const subject = renderManualAttendanceReportSubject({
    template: 'Attendance: {eventTitle}',
    eventTitle: 'Concert $& $1 $$',
    eventDate: '1/1/2026',
  });

  assert.equal(subject, 'Attendance: Concert $& $1 $$');
});

test('escapeHtml escapes html-significant characters', () => {
  assert.equal(
    escapeHtml(`<a href="x">Bob's</a>`),
    '&lt;a href=&quot;x&quot;&gt;Bob&#39;s&lt;/a&gt;',
  );
});

test('sanitizeEmailSubject removes CRLF', () => {
  assert.equal(
    sanitizeEmailSubject('Hello\r\nBCC: test@example.org'),
    'Hello BCC: test@example.org',
  );
});

test('renderManualAttendanceReportSubject replaces multiple instances of placeholders', () => {
  const result = renderManualAttendanceReportSubject({
    template: '{eventTitle} - {eventDate} | {eventTitle} ({eventDate})',
    eventTitle: 'Test Event',
    eventDate: '10/10/2025',
  });
  assert.equal(result, 'Test Event - 10/10/2025 | Test Event (10/10/2025)');
});
