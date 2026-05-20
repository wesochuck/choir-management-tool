import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { settingsService } from '../src/services/settingsService.ts';

type CollectionMock = ReturnType<typeof pb.collection>;

test('getChoirName returns empty string when no setting exists', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItem = t.mock.fn(async () => {
    const err = new Error('Not found') as Error & { status: number };
    err.status = 404;
    throw err;
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const name = await settingsService.getChoirName();
    assert.equal(name, '');
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('getChoirName returns saved choir name', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItem = t.mock.fn(async () => {
    return { key: 'choir_name', value: 'Harmony Voices' };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const name = await settingsService.getChoirName();
    assert.equal(name, 'Harmony Voices');
  } finally {
    pb.collection = originalCollection;
  }
});

test('saveChoirName persists via upsert', async (t) => {
  const originalCollection = pb.collection;
  const saved = { payload: null as Record<string, unknown> | null };

  const mockGetFirstListItem = t.mock.fn(async () => {
    return { id: 'existing_1', key: 'choir_name', value: '' };
  });

  const mockUpdate = t.mock.fn(async (_id: string, data: Record<string, unknown>) => {
    saved.payload = data;
    return { id: 'existing_1', ...data };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return {
        getFirstListItem: mockGetFirstListItem,
        update: mockUpdate,
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    await settingsService.saveChoirName('Downtown Chorale');
    assert.equal(mockUpdate.mock.callCount(), 1);
    assert.equal(saved.payload?.value, 'Downtown Chorale');
    assert.equal(saved.payload?.isPublic, true);
  } finally {
    pb.collection = originalCollection;
  }
});
