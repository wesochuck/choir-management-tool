import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';

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
      await eventService.bulkCreateRehearsals(dummyPerformance, { count: 4, dayOfWeek: 7, time: '19:00', venue: '' });
    },
    /Invalid day of week selected\./
  );

  await assert.rejects(
    async () => {
      await eventService.bulkCreateRehearsals(dummyPerformance, { count: 4, dayOfWeek: -1, time: '19:00', venue: '' });
    },
    /Invalid day of week selected\./
  );

  await assert.rejects(
    async () => {
      await eventService.bulkCreateRehearsals(dummyPerformance, { count: 4, dayOfWeek: NaN, time: '19:00', venue: '' });
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
      await eventService.bulkCreateRehearsals(dummyPerformance, { count: 4, dayOfWeek: 3, time: '19:00', venue: '' });
    },
    /Invalid performance date\./
  );
});

test('eventService.deleteEvent cascade deletes child rehearsals', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFullList = t.mock.fn(async () => {
    return [
      { id: 'rehearsal_1', title: 'Rehearsal 1', parentPerformanceId: 'perf_123' },
      { id: 'rehearsal_2', title: 'Rehearsal 2', parentPerformanceId: 'perf_123' }
    ];
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockDelete = t.mock.fn(async (_id: string) => {
    return true;
  });

  pb.collection = function (name: string) {
    if (name === 'events') {
      return {
        getFullList: mockGetFullList,
        delete: mockDelete
      } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };

  try {
    await eventService.deleteEvent('perf_123');

    // Should fetch child rehearsals first
    assert.equal(mockGetFullList.mock.callCount(), 1);
    
    // Should call delete on both rehearsals + the main performance
    assert.equal(mockDelete.mock.callCount(), 3);
    assert.equal(mockDelete.mock.calls[0].arguments[0], 'rehearsal_1');
    assert.equal(mockDelete.mock.calls[1].arguments[0], 'rehearsal_2');
    assert.equal(mockDelete.mock.calls[2].arguments[0], 'perf_123');
  } finally {
    pb.collection = originalCollection;
  }
});

test('eventService.createEventWithRehearsals rolls back event creation on bulk rehearsals error', async (t) => {
  const originalCollection = pb.collection;
  
  const mockCreate = t.mock.fn(async (data: unknown) => {
    return { id: 'new_perf_123', ...(data as Record<string, unknown>) };
  });

  const mockDelete = t.mock.fn(async () => {
    return true;
  });

  pb.collection = function (name: string) {
    if (name === 'events') {
      return {
        create: mockCreate,
        delete: mockDelete,
        getFullList: async () => []
      } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };

  try {
    // Force bulkCreateRehearsals to throw by providing invalid dayOfWeek
    await assert.rejects(
      async () => {
        await eventService.createEventWithRehearsals(
          { title: 'Test Performance', type: 'Performance', date: '2026-05-20T23:00:00.000Z' },
          { count: 4, dayOfWeek: 9, time: '19:00', venue: '' }
        );
      },
      /Invalid day of week selected\./
    );

    // Should create the event first
    assert.equal(mockCreate.mock.callCount(), 1);
    // Should rollback (delete) the created event 'new_perf_123'
    assert.equal(mockDelete.mock.callCount(), 1);
    assert.equal(mockDelete.mock.calls[0].arguments[0], 'new_perf_123');
  } finally {
    pb.collection = originalCollection;
  }
});

