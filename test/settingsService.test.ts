import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { getVoiceParts } from '../src/services/settingsService.ts';

test('getVoiceParts fetches voice parts from settings', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItem = t.mock.fn(async () => {
    return { voiceParts: [{ label: 'S1', fullName: 'Soprano 1' }] };
  });

  pb.collection = function (name: string) {
    if (name === 'app_settings') {
      return { getFirstListItem: mockGetFirstListItem } as any;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const parts = await getVoiceParts();
    assert.equal(parts[0].fullName, 'Soprano 1');
    assert.equal(parts[0].label, 'S1');
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});
