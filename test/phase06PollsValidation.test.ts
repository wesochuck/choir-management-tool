import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveProjectPath } from './helpers.ts';

function readProjectFile(path: string): string {
  return fs.readFileSync(resolveProjectPath(path), 'utf8');
}

test('phase 06 POLL-01: migration defines polls and pollResponses collections with required fields', () => {
  const migration = readProjectFile('pocketbase/pb_migrations/1717600000_add_polls.js');
  assert.match(migration, /id:\s*"pbc_polls_001"/);
  assert.match(migration, /name:\s*"polls"/);
  assert.match(migration, /name:\s*"question"/);
  assert.match(migration, /name:\s*"eventId"/);
  assert.match(migration, /id:\s*"pbc_poll_responses_001"/);
  assert.match(migration, /name:\s*"pollResponses"/);
  assert.match(migration, /name:\s*"pollId"/);
  assert.match(migration, /name:\s*"profileId"/);
  assert.match(migration, /name:\s*"status"/);
  assert.match(migration, /CREATE UNIQUE INDEX `idx_poll_profile`/);
});

test('phase 06 POLL-02: backend poll hook exposes token and response endpoints', () => {
  const hook = readProjectFile('pocketbase/pb_hooks/poll.pb.js');
  assert.match(hook, /routerAdd\("POST",\s*"\/api\/generate-poll-tokens"/);
  assert.match(hook, /routerAdd\("POST",\s*"\/api\/poll-details"/);
  assert.match(hook, /routerAdd\("POST",\s*"\/api\/submit-poll-response"/);
  assert.match(hook, /parseSignedTokenLocal/);
  assert.match(hook, /Invalid signature/);
});

test('phase 06 POLL-03/POLL-04: public poll route and service calls are wired', () => {
  const appRoutes = readProjectFile('src/App.tsx');
  const pollService = readProjectFile('src/services/pollService.ts');
  const publicView = readProjectFile('src/views/PublicPollView.tsx');

  assert.match(appRoutes, /path="\/poll"/);
  assert.match(pollService, /\/api\/poll-details/);
  assert.match(pollService, /\/api\/submit-poll-response/);
  assert.match(publicView, /useSearchParams/);
  assert.match(publicView, /pollService\.getPollDetails\(token\)/);
  assert.match(publicView, /pollService\.submitResponse\(token,\s*val\)/);
});

test('phase 06 POLL-05: communication poll placeholder flow is integrated', () => {
  const communicationService = readProjectFile('src/services/communicationService.ts');
  const placeholderPanel = readProjectFile('src/components/admin/PlaceholderPanel.tsx');
  const communicationView = readProjectFile('src/views/admin/CommunicationView.tsx');
  const pollModal = readProjectFile('src/components/admin/PollSelectionModal.tsx');
  const previewUtils = readProjectFile('src/lib/communicationUtils.ts');

  assert.match(communicationService, /resolvePollPlaceholders/);
  assert.match(communicationService, /\/api\/generate-poll-tokens/);
  assert.match(communicationService, /encodeURIComponent\(token\)/);
  assert.match(placeholderPanel, /\{\{POLL_LINK:pollId\}\}/);
  assert.match(communicationView, /PollSelectionModal/);
  assert.match(communicationView, /setIsPollModalOpen\(true\)/);
  assert.match(pollModal, /Create & Insert Poll/);
  assert.match(previewUtils, /Answer our quick question/);
});

test('phase 06 POLL-06/POLL-07: admin and singer dashboards include active poll behaviors', () => {
  const appRoutes = readProjectFile('src/App.tsx');
  const adminDashboard = readProjectFile('src/views/admin/PollsDashboardView.tsx');
  const singerDashboard = readProjectFile('src/views/singer/DashboardView.tsx');
  const pollService = readProjectFile('src/services/pollService.ts');
  const relaxRules = readProjectFile('pocketbase/pb_migrations/1717610000_relax_poll_rules.js');

  assert.match(appRoutes, /path="\/admin\/polls"/);
  assert.match(adminDashboard, /Show Archived \(Past Events\)/);
  assert.match(adminDashboard, /View Names/);
  assert.match(adminDashboard, /new Date\(event\.date\)\s*>\s*now/);
  assert.match(adminDashboard, /volunteers/);
  assert.match(singerDashboard, /📊 Quick Polls/);
  assert.match(singerDashboard, /getActivePollsForSinger/);
  assert.match(singerDashboard, /submitResponseLoggedIn/);
  assert.match(pollService, /pb\.filter\('profileId = \{:profileId\}'/);
  assert.match(relaxRules, /polls\.listRule = "@request\.auth\.id != ''"/);
});

test('phase 06 POLL-08: poll timestamp repair migration is forward-only and backfills legacy rows', () => {
  const migrationsDir = resolveProjectPath('pocketbase/pb_migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  const originalMigrationIndex = files.findIndex(f => f.includes('_add_polls.js'));
  const repairMigrationIndex = files.findIndex(f => f.includes('_backfill_poll_autodates.js'));

  assert.ok(originalMigrationIndex !== -1, 'Original migration not found');
  assert.ok(repairMigrationIndex !== -1, 'Repair migration not found');
  assert.ok(repairMigrationIndex > originalMigrationIndex, 'Repair migration must execute after original poll migration');

  const migration = readProjectFile('pocketbase/pb_migrations/1717650000_backfill_poll_autodates.js');

  assert.match(migration, /new AutodateField\(\{[\s\S]*name,[\s\S]*onCreate,[\s\S]*onUpdate,[\s\S]*\}\)/);
  assert.match(migration, /const collectionNames = \["polls", "pollResponses"\]/);
  assert.match(migration, /record\.set\("created", fallbackTimestamp\)/);
  assert.match(migration, /record\.set\("updated", fallbackTimestamp\)/);
  assert.match(migration, /app\.saveNoValidate\(record\)/);
  assert.match(migration, /Forward-only data repair/);
});
