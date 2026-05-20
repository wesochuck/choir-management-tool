import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { convertAuditionToSinger, auditionService } from '../src/services/auditionService.ts';

test('convertAuditionToSinger creates profile with correct data from audition', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async (data: any) => {
    return { id: 'profile_1', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { create: mockCreate } as any;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const audition = { id: 'a1', name: 'Singer', email: 's@test.com', phone: '123', voicePart: 'S1' };
    const result = await convertAuditionToSinger(audition as any);

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
  const mockCreate = t.mock.fn(async (data: any) => {
    return { id: 'audition_1', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'auditions') {
      return { create: mockCreate } as any;
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

