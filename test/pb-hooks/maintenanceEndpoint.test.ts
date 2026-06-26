import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readGeneratedMain(): string {
  const mainPath = path.join(process.cwd(), 'pocketbase/pb_hooks/main.pb.js');
  return fs.readFileSync(mainPath, 'utf8');
}

test('generated main.pb.js contains maintenance GET route', () => {
  const content = readGeneratedMain();
  assert.ok(
    content.includes('routerAdd("GET", "/api/maintenance/run",'),
    'Expected routerAdd for maintenance endpoint'
  );
});

test('maintenance route references runMaintenance and isMaintenanceRequestAuthorized', () => {
  const content = readGeneratedMain();
  assert.ok(content.includes('runMaintenance('), 'Expected runMaintenance call in generated file');
  assert.ok(
    content.includes('isMaintenanceRequestAuthorized('),
    'Expected isMaintenanceRequestAuthorized call in generated file'
  );
});

test('no cronAdd calls remain in generated file', () => {
  const content = readGeneratedMain();
  assert.ok(!content.includes('cronAdd('), 'cronAdd calls should not exist in generated file');
});

test('maintenance bundle source is inlined', () => {
  const content = readGeneratedMain();
  assert.ok(
    content.includes('// --- Utility source: maintenance/maintenanceRunner.ts ---'),
    'Expected maintenance bundle source comment to be inlined'
  );
});

test('old cron registration names are absent', () => {
  const content = readGeneratedMain();
  const oldCronRegistrations = [
    'cronAdd("post_event_report"',
    'cronAdd("ticket_buyer_reminder"',
    'cronAdd("process_email_queue_job"',
    'cronAdd("expire_stale_pending_payments"',
  ];
  for (const cronReg of oldCronRegistrations) {
    assert.ok(
      !content.includes(cronReg),
      `Old cron registration ${cronReg} should not appear in generated file`
    );
  }
});
