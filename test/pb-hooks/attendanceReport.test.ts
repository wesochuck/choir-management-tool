import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAttendanceReportBody } from '../../pocketbase/pb_hooks_src/email/attendanceReport';

test('renderAttendanceReportBody', () => {
  const data = {
    eventTitle: 'Concert',
    eventDate: '2026-05-22',
    attendanceRate: '85.5',
    presentCount: 17,
    totalCount: 20,
    mailingAddress: '123 Main St',
  };
  const html = renderAttendanceReportBody(data);
  assert.ok(html.includes('Concert'));
  assert.ok(html.includes('85.5%'));
  assert.ok(html.includes('17/20 present'));
});

test('renderAttendanceReportBody escapes HTML', () => {
  const data = {
    eventTitle: '<script>alert("x")</script>',
    eventDate: '2026-05-22',
    attendanceRate: '85.5',
    presentCount: 17,
    totalCount: 20,
    mailingAddress: '123 <b>Main</b> St',
  };
  const html = renderAttendanceReportBody(data);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert("x")</script>'));
});
