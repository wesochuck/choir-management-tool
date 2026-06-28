import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import {
  getDirectorySettings,
  saveDirectorySettings,
} from '../src/services/settings/directorySettings.ts';

type CollectionMock = ReturnType<typeof pb.collection>;
type SavedPayload = { value: Record<string, unknown>; isPublic: boolean; key: string };

test('getDirectorySettings returns enabled true when settings are absent', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItem = t.mock.fn(async () => {
    throw { status: 404 }; // Simulates missing setting
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const settings = await getDirectorySettings();
    assert.equal(settings.enabled, true);
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('getDirectorySettings returns stored value when present', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItem = t.mock.fn(async () => {
    return { key: 'directorySettings', value: { enabled: false } };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const settings = await getDirectorySettings();
    assert.equal(settings.enabled, false);
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('saveDirectorySettings updates the setting in pocketbase with isPublic true', async (t) => {
  const originalCollection = pb.collection;
  const saved = { payload: null as SavedPayload | null, id: '' };

  const mockGetFirstListItem = t.mock.fn(async () => {
    return { id: 'settings_directory_1', key: 'directorySettings', value: { enabled: true } };
  });

  const mockUpdate = t.mock.fn(async (id: string, data: SavedPayload) => {
    saved.id = id;
    saved.payload = data;
    return { id, ...data };
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
    await saveDirectorySettings({ enabled: false });
    assert.equal(saved.id, 'settings_directory_1');
    assert.equal(saved.payload?.key, 'directorySettings');
    assert.equal(saved.payload?.value.enabled, false);
    assert.equal(saved.payload?.isPublic, true);
    assert.equal(mockGetFirstListItem.mock.callCount(), 1); // one for check, update uses id
    assert.equal(mockUpdate.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});
