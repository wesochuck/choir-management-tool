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
    const audition = { id: 'a1', name: 'Singer', contact: 's@test.com', phone: '123', timeSlot: 'Monday 5:00 PM', voicePart: 'S1', status: 'New', notes: '' } as Audition & { phone: string };
    const result = await convertAuditionToSinger(audition);

    assert.equal(result.id, 'profile_1');
    assert.equal(mockCreate.mock.callCount(), 1);
    const firstCall = mockCreate.mock.calls[0];
    assert.deepEqual(firstCall.arguments[0], {
      name: 'Singer',
      email: 's@test.com',
      phone: '123',
      voicePart: 'S1',
      globalStatus: 'Active (Current)',
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
      timeSlot: 'Monday 5:00 PM',
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
      timeSlot: 'Monday 5:00 PM',
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
