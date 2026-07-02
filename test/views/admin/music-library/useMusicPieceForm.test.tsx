// @vitest-environment jsdom
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { act, renderHook, waitFor } from '@testing-library/react';

import { buildMusicPieceSavePayload } from '../../../../src/views/admin/music-library/useMusicPieceForm';
import { useMusicPieceDetails } from '../../../../src/views/admin/music-library/hooks/useMusicPieceDetails';
import { computeAutoFillDecision } from '../../../../src/views/admin/music-library/hooks/durationAutoFillLogic';
import type { DurationAutoFillState } from '../../../../src/views/admin/music-library/hooks/durationAutoFillLogic';

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

describe('computeAutoFillDecision', () => {
  const emptyState: DurationAutoFillState = {
    manuallyEdited: false,
    runningMax: null,
    tuttiLocked: false,
  };

  it('updates for non-tutti track on empty field, sets running max', () => {
    const result = computeAutoFillDecision(emptyState, '', 'Bass', 150);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.newDuration, '2:30');
    assert.strictEqual(result!.newState.runningMax, 150);
    assert.strictEqual(result!.newState.tuttiLocked, false);
  });

  it('does not update for shorter non-tutti track after a longer one', () => {
    const state: DurationAutoFillState = {
      manuallyEdited: false,
      runningMax: 155,
      tuttiLocked: false,
    };
    const result = computeAutoFillDecision(state, '2:35', 'Tenor', 150);
    assert.strictEqual(result, null);
  });

  it('tutti track overrides current max even when shorter, and locks', () => {
    const state: DurationAutoFillState = {
      manuallyEdited: false,
      runningMax: 155,
      tuttiLocked: false,
    };
    const result = computeAutoFillDecision(state, '2:35', 'tutti', 152);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.newDuration, '2:32');
    assert.strictEqual(result!.newState.runningMax, 152);
    assert.strictEqual(result!.newState.tuttiLocked, true);
  });

  it('ignores non-tutti track after tutti lock', () => {
    const state: DurationAutoFillState = {
      manuallyEdited: false,
      runningMax: 152,
      tuttiLocked: true,
    };
    const result = computeAutoFillDecision(state, '2:32', 'Soprano', 160);
    assert.strictEqual(result, null);
  });

  it('returns null when manuallyEdited is true', () => {
    const state: DurationAutoFillState = {
      manuallyEdited: true,
      runningMax: null,
      tuttiLocked: false,
    };
    const result = computeAutoFillDecision(state, '', 'Bass', 150);
    assert.strictEqual(result, null);
  });

  it('returns null for non-empty DB duration with no prior auto-fill', () => {
    const result = computeAutoFillDecision(emptyState, '3:45', 'Bass', 150);
    assert.strictEqual(result, null);
  });

  it('tutti track on fresh empty field (creation flow) updates and locks', () => {
    const result = computeAutoFillDecision(emptyState, '', 'tutti', 190);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.newDuration, '3:10');
    assert.strictEqual(result!.newState.runningMax, 190);
    assert.strictEqual(result!.newState.tuttiLocked, true);
  });

  it('updates for longer non-tutti track after a shorter one', () => {
    const state: DurationAutoFillState = {
      manuallyEdited: false,
      runningMax: 150,
      tuttiLocked: false,
    };
    const result = computeAutoFillDecision(state, '2:30', 'Tenor', 160);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.newDuration, '2:40');
    assert.strictEqual(result!.newState.runningMax, 160);
  });
});
