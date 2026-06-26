// @vitest-environment jsdom
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { act, renderHook, waitFor } from '@testing-library/react';

import { buildMusicPieceSavePayload } from '../../../../src/views/admin/music-library/useMusicPieceForm';
import { useMusicPieceDetails } from '../../../../src/views/admin/music-library/hooks/useMusicPieceDetails';

const mockGenres = [
  { id: 'genre_1', label: 'Classical' },
  { id: 'genre_2', label: 'Sacred' },
];

const samplePiece = {
  id: 'piece_1',
  collectionId: 'pbc_music_001',
  collectionName: 'musicPieces',
  created: '2026-01-01 00:00:00.000Z',
  updated: '2026-01-01 00:00:00.000Z',
  title: 'Messiah',
  composer: 'G.F. Handel',
  arranger: '',
  duration: '2:30:00',
  copies: 50,
  catalogId: 'H-101',
  purchaseDate: '2020-05-01',
  sectionBuckets: ['S', 'A'],
  genres: ['genre_2'],
  notes: 'Oratorio',
  audioFiles: [],
  audioTrackMapping: {},
};

describe('music piece form state', () => {
  it('initializes empty details for a new piece and tracks dirty state', () => {
    const { result } = renderHook(() =>
      useMusicPieceDetails({
        piece: null,
        allGenres: mockGenres,
      })
    );

    assert.strictEqual(result.current.title, '');
    assert.strictEqual(result.current.composer, '');
    assert.strictEqual(result.current.arranger, '');
    assert.strictEqual(result.current.isDirty, false);

    act(() => {
      result.current.setTitle('New Title');
    });

    assert.strictEqual(result.current.title, 'New Title');
    assert.strictEqual(result.current.isDirty, true);
  });

  it('initializes details from an existing piece', async () => {
    const { result } = renderHook(() =>
      useMusicPieceDetails({
        piece: samplePiece,
        allGenres: mockGenres,
      })
    );

    await waitFor(() => {
      assert.strictEqual(result.current.title, 'Messiah');
    });

    assert.strictEqual(result.current.composer, 'G.F. Handel');
    assert.strictEqual(result.current.catalogId, 'H-101');
    assert.strictEqual(result.current.purchaseDateInput, '05/2020');
    assert.deepStrictEqual(result.current.sectionBuckets, ['S', 'A']);
    assert.strictEqual(result.current.isDirty, false);

    act(() => {
      result.current.setComposer('George Frideric Handel');
    });

    assert.strictEqual(result.current.isDirty, true);
  });

  it('builds a serialized save payload for a new piece', () => {
    const { result } = renderHook(() =>
      useMusicPieceDetails({
        piece: null,
        allGenres: mockGenres,
      })
    );

    act(() => {
      result.current.setTitle('Hallelujah Chorus');
      result.current.setComposer('Handel');
      result.current.setDuration('4:15');
      result.current.setPurchaseDateInput('12/2021');
    });

    const payload = buildMusicPieceSavePayload({
      piece: null,
      details: result.current,
      movements: {
        tuttiFile: null,
        isMultiMovementInput: false,
        localMovementsList: [],
      },
    });

    assert.strictEqual(payload.title, 'Hallelujah Chorus');
    assert.strictEqual(payload.composer, 'Handel');
    assert.strictEqual(payload.duration, '4:15');
    assert.strictEqual(payload.purchaseDate, '2021-12-01');
  });
});
