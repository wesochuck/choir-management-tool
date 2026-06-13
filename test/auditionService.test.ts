import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { convertAuditionToSinger, auditionService, type Audition } from '../src/services/auditionService.ts';

type CollectionMock = ReturnType<typeof pb.collection>;

test('convertAuditionToSinger creates profile with correct data from audition', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'profile_1', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const audition = { id: 'a1', name: 'Singer', contact: 's@test.com', phone: '123', scheduledTimeSlot: 'Monday 5:00 PM', voicePart: 'S1', status: 'New', notes: '' } as Audition & { phone: string };
    const result = await convertAuditionToSinger(audition);

    assert.equal(result.id, 'profile_1');
    assert.equal(mockCreate.mock.callCount(), 1);
    const firstCall = mockCreate.mock.calls[0];
    assert.deepEqual(firstCall.arguments[0], {
      name: 'Singer',
      email: 's@test.com',
      phone: '123',
      voicePart: 'S1',
      globalStatus: 'Active',
      notes: ''
    });
  } finally {
    pb.collection = originalCollection;
  }
});

test('convertAuditionToSinger extracts phone from contact if it is not an email and contains digits', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'profile_2', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const audition = { id: 'a2', name: 'Singer', contact: '123-456-7890', scheduledTimeSlot: 'Monday 5:00 PM', voicePart: 'S1', status: 'New', notes: '' } as Audition;
    const result = await convertAuditionToSinger(audition);

    assert.equal(result.id, 'profile_2');
    assert.equal(mockCreate.mock.callCount(), 1);
    const firstCall = mockCreate.mock.calls[0];
    assert.deepEqual(firstCall.arguments[0], {
      name: 'Singer',
      email: '',
      phone: '123-456-7890',
      voicePart: 'S1',
      globalStatus: 'Active',
      notes: ''
    });
  } finally {
    pb.collection = originalCollection;
  }
});

test('convertAuditionToSinger uses email and phone fallbacks from audition object', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'profile_3', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const audition = { id: 'a3', name: 'Singer', contact: 'Some Guy', email: 'fallback@test.com', phone: '999-999-9999', scheduledTimeSlot: 'Monday 5:00 PM', voicePart: 'S1', status: 'New', notes: '' } as Audition & { email: string, phone: string };
    const result = await convertAuditionToSinger(audition);

    assert.equal(result.id, 'profile_3');
    assert.equal(mockCreate.mock.callCount(), 1);
    const firstCall = mockCreate.mock.calls[0];
    assert.deepEqual(firstCall.arguments[0], {
      name: 'Singer',
      email: 'fallback@test.com',
      phone: '999-999-9999',
      voicePart: 'S1',
      globalStatus: 'Active',
      notes: ''
    });
  } finally {
    pb.collection = originalCollection;
  }
});

test('convertAuditionToSinger combines notes and experience correctly', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'profile_4', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const audition = { id: 'a4', name: 'Singer', contact: 's@test.com', experience: '5 years choir', notes: 'Great sight reader', scheduledTimeSlot: 'Monday 5:00 PM', voicePart: 'S1', status: 'New' } as Audition;
    const result = await convertAuditionToSinger(audition);

    assert.equal(result.id, 'profile_4');
    assert.equal(mockCreate.mock.callCount(), 1);
    const firstCall = mockCreate.mock.calls[0];
    assert.deepEqual(firstCall.arguments[0], {
      name: 'Singer',
      email: 's@test.com',
      phone: '',
      voicePart: 'S1',
      globalStatus: 'Active',
      notes: 'Audition experience: 5 years choir\n\nAudition notes: Great sight reader'
    });
  } finally {
    pb.collection = originalCollection;
  }
});

test('convertAuditionToSinger handles empty optional fields gracefully', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'profile_5', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    // Cast an object with missing fields that are required by TS but could be undefined at runtime from PB
    const audition = { id: 'a5', name: 'Singer', contact: '' } as unknown as Audition;
    const result = await convertAuditionToSinger(audition);

    assert.equal(result.id, 'profile_5');
    assert.equal(mockCreate.mock.callCount(), 1);
    const firstCall = mockCreate.mock.calls[0];
    assert.deepEqual(firstCall.arguments[0], {
      name: 'Singer',
      email: '',
      phone: '',
      voicePart: '',
      globalStatus: 'Active',
      notes: ''
    });
  } finally {
    pb.collection = originalCollection;
  }
});

test('createAudition correctly passes status and notes fields', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'audition_1', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'auditions') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const data = {
      name: 'Test Singer',
      contact: 'test@singer.com',
      scheduledTimeSlot: 'Monday 5:00 PM',
      voicePart: 'T1',
      experience: 'Experienced TTBB singer',
      status: 'Scheduled' as const,
      notes: 'Needs sight-reading check',
      performance: 'perf_1'
    };

    const result = await auditionService.createAudition(data);

    assert.equal(result.id, 'audition_1');
    assert.equal(mockCreate.mock.callCount(), 1);
    const firstCall = mockCreate.mock.calls[0];
    assert.deepEqual(firstCall.arguments[0], {
      name: 'Test Singer',
      contact: 'test@singer.com',
      scheduledTimeSlot: 'Monday 5:00 PM',
      voicePart: 'T1',
      experience: 'Experienced TTBB singer',
      status: 'Scheduled',
      notes: 'Needs sight-reading check',
      performance: 'perf_1'
    });
  } finally {
    pb.collection = originalCollection;
  }
});

test('getAuditions calls getFullList with correct parameters', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFullList = t.mock.fn(async () => {
    return [{ id: 'a1' }, { id: 'a2' }];
  });

  pb.collection = function (name: string) {
    if (name === 'auditions') {
      return { getFullList: mockGetFullList } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await auditionService.getAuditions();
    assert.equal(result.length, 2);
    assert.equal(mockGetFullList.mock.callCount(), 1);
    const firstCall = mockGetFullList.mock.calls[0];
    assert.deepEqual(firstCall.arguments[0], {
      sort: '-created',
      expand: 'performance',
    });
  } finally {
    pb.collection = originalCollection;
  }
});

test('updateAudition calls update with correct parameters', async (t) => {
  const originalCollection = pb.collection;
  const mockUpdate = t.mock.fn(async (id: string, data: Record<string, unknown>) => {
    return { id, ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'auditions') {
      return { update: mockUpdate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await auditionService.updateAudition('a1', { status: 'Closed' });
    assert.equal(result.id, 'a1');
    assert.equal(result.status, 'Closed');
    assert.equal(mockUpdate.mock.callCount(), 1);
    const firstCall = mockUpdate.mock.calls[0];
    assert.equal(firstCall.arguments[0], 'a1');
    assert.deepEqual(firstCall.arguments[1], { status: 'Closed' });
    assert.deepEqual(firstCall.arguments[2], { expand: 'performance' });
  } finally {
    pb.collection = originalCollection;
  }
});

test('deleteAudition calls delete with correct parameters', async (t) => {
  const originalCollection = pb.collection;
  const mockDelete = t.mock.fn(async () => true);

  pb.collection = function (name: string) {
    if (name === 'auditions') {
      return { delete: mockDelete } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await auditionService.deleteAudition('a1');
    assert.equal(result, true);
    assert.equal(mockDelete.mock.callCount(), 1);
    const firstCall = mockDelete.mock.calls[0];
    assert.equal(firstCall.arguments[0], 'a1');
  } finally {
    pb.collection = originalCollection;
  }
});

test('auditionService.convertAuditionToSinger without performance linked', async (t) => {
  const originalCollection = pb.collection;

  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'Test Singer', contact: 't@t.com', status: 'New' };
  });
  const mockUpdate = t.mock.fn(async (id: string, data: Record<string, unknown>) => {
    return { id, ...data };
  });
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'new_profile_1', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'auditions') {
      return { getOne: mockGetOne, update: mockUpdate } as unknown as CollectionMock;
    }
    if (name === 'profiles') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const result = await auditionService.convertAuditionToSinger('a1');

    assert.equal(result.status, 'Closed');
    assert.equal(mockGetOne.mock.callCount(), 1);
    assert.equal(mockGetOne.mock.calls[0].arguments[0], 'a1');

    assert.equal(mockCreate.mock.callCount(), 1);
    assert.equal(mockUpdate.mock.callCount(), 1);
    assert.equal(mockUpdate.mock.calls[0].arguments[0], 'a1');
    assert.deepEqual(mockUpdate.mock.calls[0].arguments[1], { status: 'Closed' });
  } finally {
    pb.collection = originalCollection;
  }
});

test('auditionService.convertAuditionToSinger with performance linked handles roster linking', async (t) => {
  const originalCollection = pb.collection;
  const originalCreateBatch = pb.createBatch;

  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'Test Singer', contact: 't@t.com', status: 'New', performance: 'perf_1' };
  });
  const mockUpdate = t.mock.fn(async (id: string, data: Record<string, unknown>) => {
    return { id, ...data };
  });
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'new_profile_1', ...data };
  });
  const mockGetFullList = t.mock.fn(async () => {
    return [{ id: 'evt_1' }, { id: 'evt_2' }];
  });

  const mockBatchCreate = t.mock.fn();
  const mockBatchSend = t.mock.fn(async () => {});

  pb.collection = function (name: string) {
    if (name === 'auditions') {
      return { getOne: mockGetOne, update: mockUpdate } as unknown as CollectionMock;
    }
    if (name === 'profiles') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    if (name === 'events') {
      return { getFullList: mockGetFullList } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  pb.createBatch = function() {
    return {
      collection: (name: string) => ({ create: mockBatchCreate }),
      send: mockBatchSend
    } as unknown as ReturnType<typeof originalCreateBatch>;
  };

  try {
    const result = await auditionService.convertAuditionToSinger('a1');

    assert.equal(result.status, 'Closed');
    assert.equal(mockGetFullList.mock.callCount(), 1);
    assert.equal(mockBatchCreate.mock.callCount(), 2);

    const createCall1 = mockBatchCreate.mock.calls[0];
    assert.deepEqual(createCall1.arguments[0], {
      profile: 'new_profile_1',
      event: 'evt_1',
      rsvp: 'Pending',
      attendance: 'Pending',
      folderReturned: false,
    });

    const createCall2 = mockBatchCreate.mock.calls[1];
    assert.deepEqual(createCall2.arguments[0], {
      profile: 'new_profile_1',
      event: 'evt_2',
      rsvp: 'Pending',
      attendance: 'Pending',
      folderReturned: false,
    });

    assert.equal(mockBatchSend.mock.callCount(), 1);

    assert.equal(mockUpdate.mock.callCount(), 1);
    assert.equal(mockUpdate.mock.calls[0].arguments[0], 'a1');
    assert.deepEqual(mockUpdate.mock.calls[0].arguments[1], { status: 'Closed' });
  } finally {
    pb.collection = originalCollection;
    pb.createBatch = originalCreateBatch;
  }
});

test('auditionService.convertAuditionToSinger with performance handles batch error gracefully', async (t) => {
  const originalCollection = pb.collection;
  const originalCreateBatch = pb.createBatch;

  const mockGetOne = t.mock.fn(async (id: string) => {
    return { id, name: 'Test Singer', contact: 't@t.com', status: 'New', performance: 'perf_1' };
  });
  const mockUpdate = t.mock.fn(async (id: string, data: Record<string, unknown>) => {
    return { id, ...data };
  });
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'new_profile_1', ...data };
  });
  const mockGetFullList = t.mock.fn(async () => {
    return [{ id: 'evt_1' }];
  });

  const mockBatchCreate = t.mock.fn();
  const mockBatchSend = t.mock.fn(async () => { throw new Error('Batch failed'); });

  const originalConsoleError = console.error;
  let errorLogged = false;
  console.error = (...args: any[]) => {
    errorLogged = true;
  };

  pb.collection = function (name: string) {
    if (name === 'auditions') {
      return { getOne: mockGetOne, update: mockUpdate } as unknown as CollectionMock;
    }
    if (name === 'profiles') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    if (name === 'events') {
      return { getFullList: mockGetFullList } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  pb.createBatch = function() {
    return {
      collection: (name: string) => ({ create: mockBatchCreate }),
      send: mockBatchSend
    } as unknown as ReturnType<typeof originalCreateBatch>;
  };

  try {
    const result = await auditionService.convertAuditionToSinger('a1');

    assert.equal(result.status, 'Closed');
    assert.equal(mockBatchSend.mock.callCount(), 1);
    assert.equal(errorLogged, true);

    // update is still called
    assert.equal(mockUpdate.mock.callCount(), 1);
    assert.equal(mockUpdate.mock.calls[0].arguments[0], 'a1');
    assert.deepEqual(mockUpdate.mock.calls[0].arguments[1], { status: 'Closed' });
  } finally {
    pb.collection = originalCollection;
    pb.createBatch = originalCreateBatch;
    console.error = originalConsoleError;
  }
});
