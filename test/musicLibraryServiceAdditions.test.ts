import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { type MusicPiece } from '../src/services/musicLibraryService.ts';
import { musicLibraryWorkflows } from '../src/services/musicLibraryWorkflows.ts';

type CollectionMock = ReturnType<typeof pb.collection>;

test('musicLibraryWorkflows.createPieceWithMovementsAndTutti creates parent and sequential movements', async (t) => {
  const originalCollection = pb.collection;
  
  const createdPieces: Record<string, unknown>[] = [];
  
  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    const id = `piece_${createdPieces.length + 1}`;
    const newRecord = { id, ...data };
    createdPieces.push(newRecord);
    return newRecord as unknown as MusicPiece;
  });

  pb.collection = function (name: string) {
    if (name === 'musicLibrary') {
      return {
        create: mockCreate
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const parentData = {
      title: 'Messiah Medley',
      composer: 'G.F. Handel',
      voicing: 'SATB',
      copies: 40,
      catalogId: 'GFH-MED'
    };

    const movements = [
      { title: 'Overture', duration: '3:00' },
      { title: 'Comfort Ye', duration: '2:30' }
    ];

    const result = await musicLibraryWorkflows.createPieceWithMovementsAndTutti(parentData, { movements });

    // Verify parent piece was returned
    assert.equal(result.title, 'Messiah Medley');
    assert.equal(result.composer, 'G.F. Handel');
    
    // 3 creates total: 1 parent, 2 movements
    assert.equal(mockCreate.mock.callCount(), 3);
    
    // Check parent record
    assert.equal(createdPieces[0].title, 'Messiah Medley');
    assert.equal(createdPieces[0].parentId, undefined);

    // Check child movement 1
    assert.equal(createdPieces[1].title, 'Overture');
    assert.equal(createdPieces[1].duration, '3:00');
    assert.equal(createdPieces[1].parentId, createdPieces[0].id);
    assert.equal(createdPieces[1].composer, 'G.F. Handel');
    assert.equal(createdPieces[1].voicing, 'SATB');
    assert.equal(createdPieces[1].copies, 40);
    assert.equal(createdPieces[1].catalogId, 'GFH-MED');

    // Check child movement 2
    assert.equal(createdPieces[2].title, 'Comfort Ye');
    assert.equal(createdPieces[2].duration, '2:30');
    assert.equal(createdPieces[2].parentId, createdPieces[0].id);
  } finally {
    pb.collection = originalCollection;
  }
});

test('musicLibraryWorkflows.createPieceWithMovementsAndTutti uploads tutti file when provided', async (t) => {
  const originalCollection = pb.collection;

  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    return { id: 'parent_1', ...data } as unknown as MusicPiece;
  });

  const mockUpdate = t.mock.fn(async (id: string, data: Record<string, unknown> | FormData) => {
    if (data instanceof FormData) {
      // Mock PocketBase return after file upload
      return {
        id,
        audioFiles: ['tutti_file_123.mp3']
      } as unknown as MusicPiece;
    }
    return { id, ...data } as unknown as MusicPiece;
  });

  pb.collection = function (name: string) {
    if (name === 'musicLibrary') {
      return {
        create: mockCreate,
        update: mockUpdate
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const parentData = {
      title: 'Tutti Piece',
      composer: 'Test Composer'
    };

    // Use a real file
    const mockTuttiFile = new File(['audio content'], 'tutti.mp3', { type: 'audio/mpeg' });

    const result = await musicLibraryWorkflows.createPieceWithMovementsAndTutti(parentData, {
      tuttiFile: mockTuttiFile
    });

    assert.equal(mockCreate.mock.callCount(), 1);
    assert.equal(mockUpdate.mock.callCount(), 2);

    // First update was the FormData file upload
    const firstUpdateCall = mockUpdate.mock.calls[0];
    assert.equal(firstUpdateCall.arguments[0], 'parent_1');
    assert.ok(firstUpdateCall.arguments[1] instanceof FormData);
    const fd = firstUpdateCall.arguments[1] as FormData;
    const uploadedFile = fd.get('audioFiles') as File;
    assert.equal(uploadedFile.name, 'tutti.mp3');

    // Second update was setting the audioTrackMapping
    const secondUpdateCall = mockUpdate.mock.calls[1];
    assert.equal(secondUpdateCall.arguments[0], 'parent_1');
    assert.deepEqual(secondUpdateCall.arguments[1], {
      audioTrackMapping: { tutti: 'tutti_file_123.mp3' }
    });

    assert.deepEqual(result.audioTrackMapping, { tutti: 'tutti_file_123.mp3' });
  } finally {
    pb.collection = originalCollection;
  }
});

test('musicLibraryWorkflows.createPieceWithMovementsAndTutti creates child movements concurrently', async (t) => {
  const originalCollection = pb.collection;
  
  let activeCalls = 0;
  let maxConcurrentCalls = 0;

  const mockCreate = t.mock.fn(async (data: Record<string, unknown>) => {
    // Parent piece creation must happen first, is sequential.
    if (!data.parentId) {
      return { id: 'parent_1', ...data } as unknown as MusicPiece;
    }

    activeCalls++;
    if (activeCalls > maxConcurrentCalls) {
      maxConcurrentCalls = activeCalls;
    }

    // Yield control to let other concurrent promises start
    await new Promise((resolve) => process.nextTick(resolve));

    activeCalls--;
    return { id: `piece_${activeCalls + 1}`, ...data } as unknown as MusicPiece;
  });

  pb.collection = function (name: string) {
    if (name === 'musicLibrary') {
      return {
        create: mockCreate
      } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const parentData = {
      title: 'Messiah Medley',
      composer: 'G.F. Handel'
    };

    const movements = [
      { title: 'Overture', duration: '3:00' },
      { title: 'Comfort Ye', duration: '2:30' }
    ];

    await musicLibraryWorkflows.createPieceWithMovementsAndTutti(parentData, { movements });

    // Assert that the movements were processed concurrently
    assert.equal(maxConcurrentCalls, 2, 'The child movements should be created concurrently');
  } finally {
    pb.collection = originalCollection;
  }
});
