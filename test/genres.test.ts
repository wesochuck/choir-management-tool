/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  pieceHasGenre, 
  filterPiecesByGenre, 
  getGenreLabelsForPiece, 
  normalizeGenreLabel, 
  createGenreId 
} from '../src/lib/music/genres.ts';
import type { MusicPiece } from '../src/types/musicLibrary.ts';
import type { MusicGenreDef } from '../src/services/settingsService.ts';

describe('Music Library Genres Logic', () => {
  const genres: MusicGenreDef[] = [
    { id: 'christmas', label: 'Christmas' },
    { id: 'patriotic', label: 'Patriotic' },
    { id: 'sacred', label: 'Sacred' }
  ];

  describe('pieceHasGenre', () => {
    it('returns false for undefined or missing genres', () => {
      assert.strictEqual(pieceHasGenre({} as any, 'christmas'), false);
      assert.strictEqual(pieceHasGenre({ genres: [] } as any, 'christmas'), false);
      assert.strictEqual(pieceHasGenre({ genres: undefined } as any, 'christmas'), false);
    });

    it('returns true for exact match', () => {
      assert.strictEqual(pieceHasGenre({ genres: ['christmas', 'sacred'] } as any, 'christmas'), true);
      assert.strictEqual(pieceHasGenre({ genres: ['christmas', 'sacred'] } as any, 'sacred'), true);
    });

    it('returns false for non-matching genre', () => {
      assert.strictEqual(pieceHasGenre({ genres: ['christmas'] } as any, 'patriotic'), false);
    });
  });

  describe('filterPiecesByGenre', () => {
    const pieces = [
      { id: '1', title: 'Song 1', genres: ['christmas'] },
      { id: '2', title: 'Song 2', genres: ['patriotic', 'sacred'] },
      { id: '3', title: 'Song 3', genres: [] },
      { id: '4', title: 'Song 4' }
    ] as MusicPiece[];

    it('returns all pieces when filter is empty', () => {
      assert.strictEqual(filterPiecesByGenre(pieces, '').length, 4);
    });

    it('filters correctly by genre ID', () => {
      const filtered = filterPiecesByGenre(pieces, 'christmas');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, '1');

      const filteredSacred = filterPiecesByGenre(pieces, 'sacred');
      assert.strictEqual(filteredSacred.length, 1);
      assert.strictEqual(filteredSacred[0].id, '2');
    });
  });

  describe('getGenreLabelsForPiece', () => {
    it('returns empty array for no genres', () => {
      assert.deepStrictEqual(getGenreLabelsForPiece({} as any, genres), []);
    });

    it('maps known IDs to labels', () => {
      assert.deepStrictEqual(
        getGenreLabelsForPiece({ genres: ['christmas', 'sacred'] } as any, genres), 
        ['Christmas', 'Sacred']
      );
    });

    it('handles unknown IDs safely', () => {
      assert.deepStrictEqual(
        getGenreLabelsForPiece({ genres: ['christmas', 'unknown-id'] } as any, genres), 
        ['Christmas', 'Unknown (unknown-id)']
      );
    });
  });

  describe('normalizeGenreLabel', () => {
    it('trims whitespace', () => {
      assert.strictEqual(normalizeGenreLabel('  Christmas  '), 'Christmas');
    });
  });

  describe('createGenreId', () => {
    it('slugifies label correctly', () => {
      assert.strictEqual(createGenreId('Sacred Music', []), 'sacred-music');
      assert.strictEqual(createGenreId('R&B / Soul', []), 'r-b-soul');
    });

    it('handles collisions with numeric suffix', () => {
      const existing = [{ id: 'sacred', label: 'Sacred' }];
      assert.strictEqual(createGenreId('Sacred', existing), 'sacred-2');
      
      const existing2 = [
        { id: 'sacred', label: 'Sacred' },
        { id: 'sacred-2', label: 'Sacred' }
      ];
      assert.strictEqual(createGenreId('Sacred', existing2), 'sacred-3');
    });
  });
});
