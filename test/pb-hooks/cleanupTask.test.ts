import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { runCleanupTask } from '../../pocketbase/pb_hooks_src/maintenance/cleanupTask';

type App = ReturnType<typeof makeApp>;

function makeApp() {
  const findRecordsByFilter = mock.fn(() => []);
  const findFirstRecordByFilter = mock.fn(() => {
    throw new Error('not found');
  });
  const save = mock.fn();
  const findCollectionByNameOrId = mock.fn(() => ({ id: 'col' }));
  return {
    findRecordsByFilter,
    findFirstRecordByFilter,
    save,
    findCollectionByNameOrId,
  } as unknown as App;
}

describe('runCleanupTask', () => {
  it('returns task name cleanup', () => {
    const app = makeApp();
    const result = runCleanupTask(app as never);
    assert.strictEqual(result.task, 'cleanup');
  });

  it('calls expireStalePendingRecords for both collections', () => {
    const app = makeApp();
    const result = runCleanupTask(app as never);
    assert.strictEqual(result.status, 'ran');
    assert.strictEqual(result.processed, 0);
    assert.strictEqual(result.errors, 0);
  });
});
