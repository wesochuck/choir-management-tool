import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { musicLibraryService, type MusicPiece } from '../src/services/musicLibraryService.ts';
import { resolvePieceMetadata } from '../src/lib/musicPieceUtils.ts';

type CollectionMock = ReturnType<typeof pb.collection>;

test('resolvePieceMetadata inherits parent fields when child fields are blank', () => {
  const parent: Partial<MusicPiece> = {
    id: 'parent_1',
    title: 'Messiah',
    composer: 'George Frideric Handel',
    voicing: 'SATB',
    copies: 50,
    catalogId: 'GFH-001'
  };

  const child: Partial<MusicPiece> = {
    id: 'child_1',
    parentId: 'parent_1',
    title: 'Comfort ye my people',
    composer: '',
    voicing: '',
    catalogId: ''
  };

  const resolved = resolvePieceMetadata(child, parent);

  assert.equal(resolved.composer, 'George Frideric Handel');
  assert.equal(resolved.voicing, 'SATB');
  assert.equal(resolved.copies, 50);
  assert.equal(resolved.catalogId, 'GFH-001');
  assert.equal(resolved.title, 'Comfort ye my people');
});

test('resolvePieceMetadata prefers child fields if child fields are populated', () => {
  const parent: Partial<MusicPiece> = {
    id: 'parent_1',
    title: 'Messiah',
    composer: 'Handel',
    voicing: 'SATB',
    copies: 50,
    catalogId: 'GFH-001'
  };

  const child: Partial<MusicPiece> = {
    id: 'child_1',
    parentId: 'parent_1',
    title: 'For unto us a Child is born',
    composer: 'G.F. Handel',
    voicing: 'SSATB',
    copies: 60,
    catalogId: 'GFH-002'
  };

  const resolved = resolvePieceMetadata(child, parent);

  assert.equal(resolved.composer, 'G.F. Handel');
  assert.equal(resolved.voicing, 'SSATB');
  assert.equal(resolved.copies, 60);
  assert.equal(resolved.catalogId, 'GFH-002');
  assert.equal(resolved.title, 'For unto us a Child is born');
});

test('musicLibraryService.deletePiece with unlinkChildren option updates children parentId to empty', async (t) => {
  const originalCollection = pb.collection;
  const originalCreateBatch = pb.createBatch;
  
  const mockDelete = t.mock.fn(async (id?: string) => {
    void id;
    return true;
  });
  
  const mockGetFullList = t.mock.fn(async () => {
    return [
      { id: 'child_1', title: 'Movement 1', parentId: 'parent_1' },
      { id: 'child_2', title: 'Movement 2', parentId: 'parent_1' }
    ] as unknown as MusicPiece[];
  });

  const mockUpdate = t.mock.fn(async (id: string, data: Record<string, unknown>) => {
    return { id, ...data } as unknown as MusicPiece;
  });

  // Mock pocketbase collection
  pb.collection = function (name: string) {
    if (name === 'musicLibrary') {
      return {
        getFullList: mockGetFullList,
        update: mockUpdate,
        delete: mockDelete
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  const mockBatchSend = t.mock.fn(async () => {
    return [];
  });

  // Mock pocketbase batch
  pb.createBatch = function () {
    return {
      collection: (colName: string) => {
        void colName;
        return {
          update: (id: string, data: Record<string, unknown>) => {
            mockUpdate(id, data);
          },
          delete: (id: string) => {
            mockDelete(id);
          }
        } as unknown as ReturnType<ReturnType<typeof pb.createBatch>['collection']>;
      },
      send: mockBatchSend
    } as unknown as ReturnType<typeof pb.createBatch>;
  };

  try {
    await musicLibraryService.deletePiece('parent_1', { unlinkChildren: true });

    assert.equal(mockGetFullList.mock.callCount(), 1);
    assert.equal(mockUpdate.mock.callCount(), 2);
    assert.equal(mockDelete.mock.callCount(), 1);

    // Verify first update call was unlinking
    const firstUpdateCallArgs = mockUpdate.mock.calls[0].arguments;
    assert.equal(firstUpdateCallArgs[0], 'child_1');
    assert.deepEqual(firstUpdateCallArgs[1], { parentId: '' });

    // Verify second update call was unlinking
    const secondUpdateCallArgs = mockUpdate.mock.calls[1].arguments;
    assert.equal(secondUpdateCallArgs[0], 'child_2');
    assert.deepEqual(secondUpdateCallArgs[1], { parentId: '' });
  } finally {
    pb.collection = originalCollection;
    pb.createBatch = originalCreateBatch;
  }
});
