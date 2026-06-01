import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getMostRecentPerformanceDate, 
  type MusicPieceWithPerformanceHistory 
} from '../src/lib/music/performanceHistory';
import { buildVisibleMusicLibraryRows } from '../src/lib/music/libraryRows';
import { createMusicPieceFixture, createEventFixture } from './helpers';

describe('Performance Recency Filtering', () => {
  describe('getMostRecentPerformanceDate', () => {
    it('returns null when expand or performances is missing', () => {
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece), null);
    });

    it('returns null when performances array is empty', () => {
      const piece: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'p1', title: 'Song 1' }),
        expand: { performances: [] }
      };
      assert.strictEqual(getMostRecentPerformanceDate(piece), null);
    });

    it('ignores invalid or missing dates and returns the newest valid date', () => {
      const piece: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'p1', title: 'Song 1' }),
        expand: {
          performances: [
            createEventFixture({ id: 'ev1', title: 'Event 1', date: '2024-05-01T12:00:00Z', type: 'Performance' }),
            createEventFixture({ id: 'ev2', title: 'Event 2', date: 'invalid-date', type: 'Performance' }),
            createEventFixture({ id: 'ev3', title: 'Event 3', date: '2025-06-01T12:00:00Z', type: 'Performance' }),
            createEventFixture({ id: 'ev4', title: 'Event 4', date: '', type: 'Performance' })
          ]
        }
      };
      assert.strictEqual(getMostRecentPerformanceDate(piece), '2025-06-01');
    });

    it('handles unsorted performance dates', () => {
      const piece: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'p1', title: 'Song 1' }),
        expand: {
          performances: [
            createEventFixture({ id: 'ev1', title: 'Event 1', date: '2025-02-15T12:00:00Z', type: 'Performance' }),
            createEventFixture({ id: 'ev2', title: 'Event 2', date: '2026-01-10T12:00:00Z', type: 'Performance' }),
            createEventFixture({ id: 'ev3', title: 'Event 3', date: '2024-12-25T12:00:00Z', type: 'Performance' })
          ]
        }
      };
      assert.strictEqual(getMostRecentPerformanceDate(piece), '2026-01-10');
    });
  });

  describe('buildVisibleMusicLibraryRows recency filter integration', () => {
    const now = new Date('2026-05-31T12:00:00Z');

    // Never performed
    const pNever = createMusicPieceFixture({ id: 'p_never', title: 'Never Performed' });

    // Performed 6 months ago (within 1 year)
    const pRecent = {
      ...createMusicPieceFixture({ id: 'p_recent', title: 'Recent Performance' }),
      expand: {
        performances: [
          createEventFixture({ id: 'ev1', title: 'Event 1', date: '2025-11-30T12:00:00Z', type: 'Performance' })
        ]
      }
    };

    // Performed 2.5 years ago (within 3 years, not within 2 years)
    const pMed = {
      ...createMusicPieceFixture({ id: 'p_med', title: 'Medium Recency' }),
      expand: {
        performances: [
          createEventFixture({ id: 'ev2', title: 'Event 2', date: '2023-11-30T12:00:00Z', type: 'Performance' })
        ]
      }
    };

    // Performed 4 years ago (not within 3 years, within 5 years)
    const pOld = {
      ...createMusicPieceFixture({ id: 'p_old', title: 'Old Performance' }),
      expand: {
        performances: [
          createEventFixture({ id: 'ev3', title: 'Event 3', date: '2022-05-30T12:00:00Z', type: 'Performance' })
        ]
      }
    };

    const allPieces = [pNever, pRecent, pMed, pOld];

    it('returns all pieces when recency filter is all', () => {
      const rows = buildVisibleMusicLibraryRows(allPieces, { recencyFilter: 'all', now });
      assert.strictEqual(rows.length, 4);
    });

    it('returns only never performed pieces for never filter', () => {
      const rows = buildVisibleMusicLibraryRows(allPieces, { recencyFilter: 'never', now });
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].id, 'p_never');
    });

    it('filters within-1-year correctly', () => {
      const rows = buildVisibleMusicLibraryRows(allPieces, { recencyFilter: 'within-1-year', now });
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].id, 'p_recent');
    });

    it('filters within-2-years correctly', () => {
      // 2026-05-31 minus 2 years is 2024-05-31. Recent is 2025-11-30.
      const rows = buildVisibleMusicLibraryRows(allPieces, { recencyFilter: 'within-2-years', now });
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].id, 'p_recent');
    });

    it('filters within-3-years correctly', () => {
      // 2026-05-31 minus 3 years is 2023-05-31. Med is 2023-11-30, Recent is 2025-11-30.
      const rows = buildVisibleMusicLibraryRows(allPieces, { recencyFilter: 'within-3-years', now });
      assert.strictEqual(rows.length, 2);
      assert.ok(rows.find(r => r.id === 'p_recent'));
      assert.ok(rows.find(r => r.id === 'p_med'));
    });

    it('filters not-within-3-years correctly (includes never performed)', () => {
      // Should include never performed, and pieces older than 3 years (p_old).
      const rows = buildVisibleMusicLibraryRows(allPieces, { recencyFilter: 'not-within-3-years', now });
      assert.strictEqual(rows.length, 2);
      assert.ok(rows.find(r => r.id === 'p_never'));
      assert.ok(rows.find(r => r.id === 'p_old'));
    });

    it('filters not-within-5-years correctly (includes never performed)', () => {
      // Should include never performed. Since p_old is 4 years ago (within 5), it is NOT included.
      const rows = buildVisibleMusicLibraryRows(allPieces, { recencyFilter: 'not-within-5-years', now });
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].id, 'p_never');
    });
  });
});
