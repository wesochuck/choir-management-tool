import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { checkVenueDependencies } from '../src/services/venueService.ts';

test('checkVenueDependencies returns true if venue has linked events', async (t) => {
  const originalCollection = pb.collection;
  const mockGetList = t.mock.fn(async (page: number, perPage: number, options: any) => {
    return { totalItems: 1 };
  });

  pb.collection = function (name: string) {
    if (name === 'events') {
      return { getList: mockGetList } as any;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const hasEvents = await checkVenueDependencies('venue_1');
    assert.equal(hasEvents, true);
    assert.equal(mockGetList.mock.callCount(), 1);
    const firstCall = mockGetList.mock.calls[0];
    assert.equal(firstCall.arguments[0], 1);
    assert.equal(firstCall.arguments[1], 1);
    assert.equal(firstCall.arguments[2].filter, "venue='venue_1'");
  } finally {
    pb.collection = originalCollection;
  }
});
