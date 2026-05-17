import test from 'node:test';
import assert from 'node:assert/strict';

import { eventService } from '../src/services/eventService.ts';

test('eventService.bulkCreateRehearsals throws on invalid day of week', async () => {
  const dummyPerformance = {
    id: 'perf_1',
    collectionId: 'col_1',
    collectionName: 'events',
    created: '2023-01-01',
    updated: '2023-01-01',
    title: 'Spring Concert',
    date: '2026-05-20T23:00:00.000Z',
    location: 'Main Sanctuary',
    type: 'Performance' as const,
    details: 'Black folders',
    parentPerformanceId: ''
  };

  await assert.rejects(
    async () => {
      await eventService.bulkCreateRehearsals(dummyPerformance, { count: 4, dayOfWeek: 7, time: '19:00', location: '' });
    },
    /Invalid day of week selected\./
  );

  await assert.rejects(
    async () => {
      await eventService.bulkCreateRehearsals(dummyPerformance, { count: 4, dayOfWeek: -1, time: '19:00', location: '' });
    },
    /Invalid day of week selected\./
  );

  await assert.rejects(
    async () => {
      await eventService.bulkCreateRehearsals(dummyPerformance, { count: 4, dayOfWeek: NaN, time: '19:00', location: '' });
    },
    /Invalid day of week selected\./
  );
});

test('eventService.bulkCreateRehearsals throws on invalid performance date', async () => {
  const dummyPerformance = {
    id: 'perf_1',
    collectionId: 'col_1',
    collectionName: 'events',
    created: '2023-01-01',
    updated: '2023-01-01',
    title: 'Spring Concert',
    date: 'invalid-date',
    location: 'Main Sanctuary',
    type: 'Performance' as const,
    details: 'Black folders',
    parentPerformanceId: ''
  };

  await assert.rejects(
    async () => {
      await eventService.bulkCreateRehearsals(dummyPerformance, { count: 4, dayOfWeek: 3, time: '19:00', location: '' });
    },
    /Invalid performance date\./
  );
});
