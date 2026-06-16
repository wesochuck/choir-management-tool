import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { queryKeys } from '../src/lib/queryKeys';

describe('queryKeys', () => {
  it('uses stable tuple keys for venues', () => {
    assert.deepEqual(queryKeys.venues.all, ['venues']);
    assert.deepEqual(queryKeys.venues.list(), ['venues', 'list']);
  });
});
