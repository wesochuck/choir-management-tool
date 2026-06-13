import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { checkVenueDependencies, venueService, type Venue } from '../src/services/venueService.ts';

type CollectionMock = ReturnType<typeof pb.collection>;

test('checkVenueDependencies returns true if venue has linked events', async (t) => {
  const originalCollection = pb.collection;
  const mockGetList = t.mock.fn(async (page: number, perPage: number, options: { filter: string }) => {
    void page;
    void perPage;
    void options;
    return { totalItems: 1 };
  });

  pb.collection = function (name: string) {
    if (name === 'events') {
      return { getList: mockGetList } as unknown as CollectionMock;
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

test('checkVenueDependencies returns false if venue has no linked events', async (t) => {
  const originalCollection = pb.collection;
  const mockGetList = t.mock.fn(async (page: number, perPage: number, options: { filter: string }) => {
    void page;
    void perPage;
    void options;
    return { totalItems: 0 };
  });

  pb.collection = function (name: string) {
    if (name === 'events') {
      return { getList: mockGetList } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const hasEvents = await checkVenueDependencies('venue_2');
    assert.equal(hasEvents, false);
    assert.equal(mockGetList.mock.callCount(), 1);
    const firstCall = mockGetList.mock.calls[0];
    assert.equal(firstCall.arguments[0], 1);
    assert.equal(firstCall.arguments[1], 1);
    assert.equal(firstCall.arguments[2].filter, "venue='venue_2'");
  } finally {
    pb.collection = originalCollection;
  }
});

test('venueService.createVenue sends status: "Active" by default', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async (data: Partial<Venue>) => {
    return { id: 'new-venue', status: data.status, ...data } as unknown as Venue;
  });

  pb.collection = function (name: string) {
    if (name === 'pbc_venues_001') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const data = { name: 'New Sanctuary', rowCounts: [10, 12] };
    const created = await venueService.createVenue(data);
    assert.equal(created.status, 'Active');
    assert.equal(mockCreate.mock.callCount(), 1);
    const firstCall = mockCreate.mock.calls[0];
    assert.deepEqual(firstCall.arguments[0], {
      status: 'Active',
      name: 'New Sanctuary',
      rowCounts: [10, 12],
    });
  } finally {
    pb.collection = originalCollection;
  }
});
