import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';

import { eventService } from '../src/services/eventService.ts';
import { settingsService } from '../src/services/settingsService.ts';

test('eventService.getEvents deduplicates concurrent in-flight requests', async (t) => {
  const originalCollection = pb.collection;

  let callCount = 0;
  let resolveFirst: (value: unknown) => void = () => {};
  const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });

  const mockGetFullList = t.mock.fn(async () => {
    callCount++;
    if (callCount === 1) {
      await firstPromise;
    }
    return [{ id: 'evt_1', title: 'Concert', type: 'Performance', date: '2026-12-25' }];
  });

  pb.collection = function (name: string) {
    if (name === 'events') {
      return { getFullList: mockGetFullList } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const call1 = eventService.getEvents();
    const call2 = eventService.getEvents();

    await new Promise(r => setTimeout(r, 10));
    assert.equal(callCount, 1);

    resolveFirst({} as never);
    const [result1, result2] = await Promise.all([call1, call2]);

    assert.equal(result1.length, 1);
    assert.equal(result2.length, 1);
    assert.equal(callCount, 1);

    const result3 = await eventService.getEvents();
    assert.equal(callCount, 2);
    assert.equal(result3.length, 1);
  } finally {
    pb.collection = originalCollection;
  }
});

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

test('eventService.bulkCreateRehearsals creates rehearsals with PocketBase batch', async (t) => {
  const originalCreateBatch = pb.createBatch;
  const originalGetTimezone = settingsService.getTimezone;

  const createdEvents: Record<string, unknown>[] = [];
  const mockBatchSend = t.mock.fn(async () => {
    return createdEvents.map((body, index) => ({
      status: 200,
      body: {
        id: `rehearsal_${index + 1}`,
        collectionId: 'events_col',
        collectionName: 'events',
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
        ...body,
      },
    }));
  });

  settingsService.getTimezone = async () => 'America/New_York';
  pb.createBatch = function () {
    return {
      collection: (colName: string) => {
        assert.equal(colName, 'events');
        return {
          create: (data: Record<string, unknown>) => {
            createdEvents.push(data);
          },
        } as unknown as ReturnType<ReturnType<typeof pb.createBatch>['collection']>;
      },
      send: mockBatchSend,
    } as unknown as ReturnType<typeof pb.createBatch>;
  };

  try {
    const performance = {
      id: 'perf_1',
      collectionId: 'col_1',
      collectionName: 'events',
      created: '2023-01-01',
      updated: '2023-01-01',
      title: 'Spring Concert',
      date: '2026-05-20T23:00:00.000Z',
      type: 'Performance' as const,
      details: 'Black folders',
      parentPerformanceId: '',
    };

    const rehearsals = await eventService.bulkCreateRehearsals(performance, {
      count: 2,
      dayOfWeek: 3,
      time: '19:00',
      venue: '',
    });

    assert.equal(mockBatchSend.mock.callCount(), 1);
    assert.equal(createdEvents.length, 2);
    assert.equal(rehearsals.length, 2);
    assert.equal(createdEvents[0].parentPerformanceId, 'perf_1');
    assert.equal(createdEvents[0].type, 'Rehearsal');
  } finally {
    pb.createBatch = originalCreateBatch;
    settingsService.getTimezone = originalGetTimezone;
  }
});

test('eventService.deleteEvent cascade deletes child rehearsals', async (t) => {
  const originalCollection = pb.collection;
  const originalCreateBatch = pb.createBatch;
  
  const mockGetFullList = t.mock.fn(async () => {
    return [
      { id: 'rehearsal_1', title: 'Rehearsal 1', parentPerformanceId: 'perf_123' },
      { id: 'rehearsal_2', title: 'Rehearsal 2', parentPerformanceId: 'perf_123' }
    ];
  });
  const mockDelete = t.mock.fn(async (id?: string) => {
    void id;
    return true;
  });

  pb.collection = function (name: string) {
    if (name === 'events') {
      return {
        getFullList: mockGetFullList,
        delete: mockDelete
      } as unknown as ReturnType<typeof pb.collection>;
    }
    if (name === 'ticketPurchases') {
      return {
        getFullList: async () => []
      } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };

  const mockBatchSend = t.mock.fn(async () => {
    return [];
  });

  // Mock pocketbase batch
  pb.createBatch = function () {
    return {
      collection: (colName: string) => {
        void colName;
        return {
          delete: (id: string) => {
            mockDelete(id);
          }
        } as unknown as ReturnType<ReturnType<typeof pb.createBatch>['collection']>;
      },
      send: mockBatchSend
    } as unknown as ReturnType<typeof pb.createBatch>;
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
    pb.createBatch = originalCreateBatch;
  }
});

test('eventService.createEventWithRehearsals rolls back event creation on bulk rehearsals error', async (t) => {
  const originalCollection = pb.collection;
  
  const mockCreate = t.mock.fn(async (data: unknown) => {
    return { id: 'new_perf_123', ...(data as Record<string, unknown>) };
  });

  const mockDelete = t.mock.fn(async (id?: string) => {
    void id;
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
    if (name === 'ticketPurchases') {
      return {
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
