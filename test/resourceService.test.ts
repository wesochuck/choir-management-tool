import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { resourceService } from '../src/services/resourceService.ts';

type CollectionMock = ReturnType<typeof pb.collection>;

test('resourceService.getResources calls getFullList with correct sort', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFullList = t.mock.fn(async () => {
    return [{ id: 'res1', title: 'A Resource', sortOrder: 1 }];
  });

  pb.collection = function (name: string) {
    if (name === 'pbc_singer_res_001') {
      return { getFullList: mockGetFullList } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const resources = await resourceService.getResources();
    assert.equal(resources.length, 1);
    assert.equal(resources[0].title, 'A Resource');
    assert.equal(mockGetFullList.mock.callCount(), 1);
    const callArgs = mockGetFullList.mock.calls[0].arguments;
    assert.deepEqual(callArgs[0], { sort: 'sortOrder,created' });
  } finally {
    pb.collection = originalCollection;
  }
});

test('resourceService.createResource handles normal object', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async (data: unknown) => {
    return { id: 'new_res', ...(data as Record<string, unknown>) };
  });

  pb.collection = function (name: string) {
    if (name === 'pbc_singer_res_001') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const res = await resourceService.createResource({ title: 'New Resource', sortOrder: 2 });
    assert.equal(res.id, 'new_res');
    assert.equal(res.title, 'New Resource');
    assert.equal(res.sortOrder, 2);
    assert.equal(mockCreate.mock.callCount(), 1);
    const callArgs = mockCreate.mock.calls[0].arguments;
    assert.deepEqual(callArgs[0], { title: 'New Resource', sortOrder: 2 });
  } finally {
    pb.collection = originalCollection;
  }
});

test('resourceService.createResource handles FormData object', async (t) => {
  const originalCollection = pb.collection;
  const mockCreate = t.mock.fn(async () => {
    return { id: 'new_res_form' };
  });

  pb.collection = function (name: string) {
    if (name === 'pbc_singer_res_001') {
      return { create: mockCreate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const formData = new FormData();
    formData.append('title', 'Form Resource');
    const res = await resourceService.createResource(formData);
    assert.equal(res.id, 'new_res_form');
    assert.equal(mockCreate.mock.callCount(), 1);
    const callArgs = mockCreate.mock.calls[0].arguments;
    assert.equal(callArgs[0], formData); // should pass the FormData object directly
  } finally {
    pb.collection = originalCollection;
  }
});

test('resourceService.updateResource updates normal object', async (t) => {
  const originalCollection = pb.collection;
  const mockUpdate = t.mock.fn(async (id: string, data: unknown) => {
    return { id, ...(data as Record<string, unknown>) };
  });

  pb.collection = function (name: string) {
    if (name === 'pbc_singer_res_001') {
      return { update: mockUpdate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const res = await resourceService.updateResource('res_id_1', { title: 'Updated' });
    assert.equal(res.id, 'res_id_1');
    assert.equal(res.title, 'Updated');
    assert.equal(mockUpdate.mock.callCount(), 1);
    const callArgs = mockUpdate.mock.calls[0].arguments;
    assert.equal(callArgs[0], 'res_id_1');
    assert.deepEqual(callArgs[1], { title: 'Updated' });
  } finally {
    pb.collection = originalCollection;
  }
});

test('resourceService.updateResource updates FormData object', async (t) => {
  const originalCollection = pb.collection;
  const mockUpdate = t.mock.fn(async (id: string) => {
    return { id };
  });

  pb.collection = function (name: string) {
    if (name === 'pbc_singer_res_001') {
      return { update: mockUpdate } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const formData = new FormData();
    formData.append('title', 'Updated Form');
    const res = await resourceService.updateResource('res_id_2', formData);
    assert.equal(res.id, 'res_id_2');
    assert.equal(mockUpdate.mock.callCount(), 1);
    const callArgs = mockUpdate.mock.calls[0].arguments;
    assert.equal(callArgs[0], 'res_id_2');
    assert.equal(callArgs[1], formData);
  } finally {
    pb.collection = originalCollection;
  }
});

test('resourceService.deleteResource calls delete with correct ID', async (t) => {
  const originalCollection = pb.collection;
  const mockDelete = t.mock.fn(async () => {
    return true;
  });

  pb.collection = function (name: string) {
    if (name === 'pbc_singer_res_001') {
      return { delete: mockDelete } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const res = await resourceService.deleteResource('res_to_delete');
    assert.equal(res, true);
    assert.equal(mockDelete.mock.callCount(), 1);
    const callArgs = mockDelete.mock.calls[0].arguments;
    assert.equal(callArgs[0], 'res_to_delete');
  } finally {
    pb.collection = originalCollection;
  }
});

test('resourceService.getResourceFileUrl returns correct url', async (t) => {
  const originalGetURL = pb.files.getURL;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockGetURL = t.mock.fn((record: any, filename: string) => {
    return `http://mocked/url/${record.id}/${filename}`;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pb.files.getURL = mockGetURL as any;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockRecord = { id: 'rec123', title: 'Test' } as any;
    const url = resourceService.getResourceFileUrl(mockRecord, 'file.pdf');
    assert.equal(url, 'http://mocked/url/rec123/file.pdf');
    assert.equal(mockGetURL.mock.callCount(), 1);
    const callArgs = mockGetURL.mock.calls[0].arguments;
    assert.equal(callArgs[0], mockRecord);
    assert.equal(callArgs[1], 'file.pdf');
  } finally {
    pb.files.getURL = originalGetURL;
  }
});
