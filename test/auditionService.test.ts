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
