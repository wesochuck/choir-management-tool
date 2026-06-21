import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { queryKeys } from '../src/lib/queryKeys';

describe('queryKeys', () => {
  it('uses stable tuple keys for venues', () => {
    assert.deepEqual(queryKeys.venues.all, ['venues']);
    assert.deepEqual(queryKeys.venues.list(), ['venues', 'list']);
  });

  it('uses stable tuple keys for voiceParts', () => {
    assert.deepEqual(queryKeys.voiceParts.all, ['voiceParts']);
    assert.deepEqual(queryKeys.voiceParts.list(), ['voiceParts', 'list']);
  });

  it('uses stable tuple keys for dues by season', () => {
    assert.deepEqual(queryKeys.dues.all, ['dues']);
    assert.deepEqual(queryKeys.dues.bySeason('fall2026'), ['dues', 'fall2026']);
  });

  it('uses stable tuple keys for events', () => {
    assert.deepEqual(queryKeys.events.all, ['events']);
    assert.deepEqual(queryKeys.events.list(), ['events', 'list']);
  });

  it('uses stable tuple keys for profiles', () => {
    assert.deepEqual(queryKeys.profiles.all, ['profiles']);
    assert.deepEqual(queryKeys.profiles.list(), ['profiles', 'list']);
  });

  it('uses stable tuple keys for myEvents', () => {
    assert.deepEqual(queryKeys.myEvents.all, ['myEvents']);
    assert.deepEqual(queryKeys.myEvents.list(), ['myEvents', 'list']);
  });

  it('uses stable tuple keys for singerRsvps by singerId', () => {
    assert.deepEqual(queryKeys.singerRsvps.all, ['singerRsvps']);
    assert.deepEqual(queryKeys.singerRsvps.bySingerId('singer1'), ['singerRsvps', 'singer1']);
  });

  it('uses stable tuple keys for resources', () => {
    assert.deepEqual(queryKeys.resources.all, ['resources']);
    assert.deepEqual(queryKeys.resources.list(), ['resources', 'list']);
  });

  it('uses stable tuple keys for ticketing', () => {
    assert.deepEqual(queryKeys.ticketing.all, ['ticketing']);
    assert.deepEqual(queryKeys.ticketing.main('evt1'), ['ticketing', 'main', 'evt1']);
    assert.deepEqual(queryKeys.ticketing.events(), ['ticketing', 'events']);
    assert.deepEqual(queryKeys.ticketing.missingEvents(['evt2', 'evt3']), [
      'ticketing',
      'events',
      'missing',
      'evt2',
      'evt3',
    ]);
    assert.deepEqual(queryKeys.ticketing.purchasesByEvent('evt1'), [
      'ticketing',
      'purchases',
      'event',
      'evt1',
    ]);
    assert.deepEqual(queryKeys.ticketing.allPurchases(), ['ticketing', 'purchases', 'all']);
    assert.deepEqual(queryKeys.ticketing.bundles(), ['ticketing', 'bundles']);
    assert.deepEqual(queryKeys.ticketing.timezone(), ['ticketing', 'timezone']);
    assert.deepEqual(queryKeys.ticketing.logoUrl, ['ticketing', 'logoUrl']);
  });
});
