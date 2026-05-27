import test from 'node:test';
import assert from 'node:assert/strict';
import type { RecordModel } from 'pocketbase';
import { pollService, type SingerPoll } from '../src/services/pollService.ts';
import { pb } from '../src/lib/pocketbase.ts';

test('pollService.getPollDetails sends token to poll-details endpoint', async () => {
  const originalSend = pb.send;
  let receivedPath = '';
  let receivedBody: unknown = null;

  pb.send = (async <T>(path: string, options?: { body?: unknown }): Promise<T> => {
    receivedPath = path;
    receivedBody = options?.body ?? null;
    return {
      poll: {
        id: 'poll_1',
        question: 'Need risers?',
        event: null
      },
      currentStatus: ''
    } as T;
  }) as typeof pb.send;

  try {
    const result = await pollService.getPollDetails('tok_123');
    assert.equal(receivedPath, '/api/poll-details');
    assert.deepEqual(receivedBody, { token: 'tok_123' });
    assert.equal(result.poll.id, 'poll_1');
  } finally {
    pb.send = originalSend;
  }
});

test('pollService.submitResponse sends status payload to submit endpoint', async () => {
  const originalSend = pb.send;
  let receivedPath = '';
  let receivedBody: unknown = null;

  pb.send = (async <T>(path: string, options?: { body?: unknown }): Promise<T> => {
    receivedPath = path;
    receivedBody = options?.body ?? null;
    return { success: true } as T;
  }) as typeof pb.send;

  try {
    const result = await pollService.submitResponse('tok_abc', 'Yes');
    assert.equal(receivedPath, '/api/submit-poll-response');
    assert.deepEqual(receivedBody, { token: 'tok_abc', status: 'Yes' });
    assert.equal(result.success, true);
  } finally {
    pb.send = originalSend;
  }
});

test('pollService.generateTokens sends poll and profile ids', async () => {
  const originalSend = pb.send;
  let receivedPath = '';
  let receivedBody: unknown = null;

  pb.send = (async <T>(path: string, options?: { body?: unknown }): Promise<T> => {
    receivedPath = path;
    receivedBody = options?.body ?? null;
    return { tokens: { profile1: 'signed_token_1' } } as T;
  }) as typeof pb.send;

  try {
    const result = await pollService.generateTokens('poll_1', ['profile1']);
    assert.equal(receivedPath, '/api/generate-poll-tokens');
    assert.deepEqual(receivedBody, { pollId: 'poll_1', profileIds: ['profile1'] });
    assert.equal(result.tokens.profile1, 'signed_token_1');
  } finally {
    pb.send = originalSend;
  }
});

test('pollService.getActivePollsForSinger merges poll responses by poll id', async () => {
  const originalCollection = pb.collection;
  const originalFilter = pb.filter;
  let receivedFilter = '';

  const pollRecords: SingerPoll[] = [
    {
      id: 'pollA',
      question: 'Can you help with setup?',
      eventId: '',
      status: '',
      collectionId: 'pbc_polls_001',
      collectionName: 'polls',
      created: '2026-05-01T00:00:00Z',
      updated: '2026-05-01T00:00:00Z'
    },
    {
      id: 'pollB',
      question: 'Can you bring snacks?',
      eventId: 'evt_1',
      status: '',
      collectionId: 'pbc_polls_001',
      collectionName: 'polls',
      created: '2026-05-01T00:00:00Z',
      updated: '2026-05-01T00:00:00Z'
    }
  ];

  const responseRecords: RecordModel[] = [
    {
      id: 'resp_1',
      pollId: 'pollA',
      profileId: 'profile_1',
      status: 'Yes',
      collectionId: 'pbc_poll_responses_001',
      collectionName: 'pollResponses',
      created: '2026-05-01T00:00:00Z',
      updated: '2026-05-01T00:00:00Z'
    } as unknown as RecordModel
  ];

  pb.filter = ((expr: string, params?: Record<string, unknown>) => {
    return `${expr} :: ${JSON.stringify(params ?? {})}`;
  }) as typeof pb.filter;

  pb.collection = ((name: string) => {
    if (name === 'polls') {
      return {
        getFullList: async () => pollRecords
      };
    }
    if (name === 'pollResponses') {
      return {
        getFullList: async (opts: { filter: string }) => {
          receivedFilter = opts.filter;
          return responseRecords;
        }
      };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    const list = await pollService.getActivePollsForSinger('profile_1');
    assert.match(receivedFilter, /profileId = \{:profileId\}/);
    assert.match(receivedFilter, /"profile_1"/);
    assert.equal(list.length, 2);
    assert.equal(list[0].status, 'Yes');
    assert.equal(list[1].status, '');
  } finally {
    pb.collection = originalCollection;
    pb.filter = originalFilter;
  }
});

test('pollService.submitResponseLoggedIn updates existing response when found', async () => {
  const originalCollection = pb.collection;
  let updatedId = '';
  let createdCalled = false;

  pb.collection = ((name: string) => {
    if (name === 'pollResponses') {
      return {
        getFirstListItem: async () => ({ id: 'resp_existing' }),
        update: async (id: string) => {
          updatedId = id;
          return { id };
        },
        create: async () => {
          createdCalled = true;
          return {};
        }
      };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    await pollService.submitResponseLoggedIn('poll_1', 'profile_1', 'No');
    assert.equal(updatedId, 'resp_existing');
    assert.equal(createdCalled, false);
  } finally {
    pb.collection = originalCollection;
  }
});

test('pollService.submitResponseLoggedIn creates response when existing record is missing', async () => {
  const originalCollection = pb.collection;
  let createdPayload: unknown = null;
  let updateCalled = false;

  pb.collection = ((name: string) => {
    if (name === 'pollResponses') {
      return {
        getFirstListItem: async () => {
          throw new Error('404 Not Found');
        },
        update: async () => {
          updateCalled = true;
          return {};
        },
        create: async (payload: unknown) => {
          createdPayload = payload;
          return payload;
        }
      };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    await pollService.submitResponseLoggedIn('poll_2', 'profile_2', 'Yes');
    assert.equal(updateCalled, false);
    assert.deepEqual(createdPayload, {
      pollId: 'poll_2',
      profileId: 'profile_2',
      status: 'Yes'
    });
  } finally {
    pb.collection = originalCollection;
  }
});
