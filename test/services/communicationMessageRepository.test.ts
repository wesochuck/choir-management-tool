import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../../src/lib/pocketbase';
import { communicationService, type MessageRecord } from '../../src/services/communicationService';

interface CollectionReadMock {
  getOne: (id: string) => Promise<MessageRecord>;
}

interface PocketBaseCollectionMock {
  collection: (name: string) => CollectionReadMock;
}

afterEach(() => mock.restoreAll());

describe('communication draft read', () => {
  it('reads one message by ID through the compatibility service', async () => {
    const expected = { id: 'draft-123' } as MessageRecord;
    const getOne = mock.fn(async () => expected);
    mock.method(pb as unknown as PocketBaseCollectionMock, 'collection', (name: string) => {
      assert.equal(name, 'messages');
      return { getOne };
    });

    assert.equal(typeof communicationService.getDraft, 'function');
    const record = await communicationService.getDraft('draft-123');
    assert.equal(getOne.mock.calls[0].arguments[0], 'draft-123');
    assert.equal(record, expected);
  });

  it('propagates the raw PocketBase error', async () => {
    const pocketBaseError = { status: 404, data: { message: 'Missing' } };
    const getOne = mock.fn(async (): Promise<MessageRecord> => {
      throw pocketBaseError;
    });
    mock.method(pb as unknown as PocketBaseCollectionMock, 'collection', () => ({ getOne }));

    await assert.rejects(
      communicationService.getDraft('missing'),
      (error: unknown) => error === pocketBaseError
    );
  });
});
