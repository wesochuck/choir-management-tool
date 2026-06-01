import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMostRecentPerformanceDate,
  getEffectiveMostRecentPerformanceDate,
  type MusicPieceWithPerformanceHistory
} from '../src/lib/music/performanceHistory';
import { createMusicPieceFixture, createEventFixture } from './helpers';

describe('performanceHistory tests', () => {
  describe('getMostRecentPerformanceDate', () => {
    it('returns the newest own performance date', () => {
      const piece: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'p1', title: 'Song 1' }),
        expand: {
          performances: [
            createEventFixture({ id: 'ev1', title: 'Perf 1', date: '2024-01-01T12:00:00Z', type: 'Performance' }),
            createEventFixture({ id: 'ev2', title: 'Perf 2', date: '2026-06-14T12:00:00Z', type: 'Performance' })
          ]
        }
      };
      assert.strictEqual(getMostRecentPerformanceDate(piece), '2026-06-14');
    });

    it('returns null when the piece has no expanded performances', () => {
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece), null);
    });

    it('ignores invalid performance dates', () => {
      const piece: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'p1', title: 'Song 1' }),
        expand: {
          performances: [
            createEventFixture({ id: 'ev1', title: 'Perf 1', date: 'invalid-date', type: 'Performance' }),
            createEventFixture({ id: 'ev2', title: 'Perf 2', date: '2026-06-14T12:00:00Z', type: 'Performance' })
          ]
        }
      };
      assert.strictEqual(getMostRecentPerformanceDate(piece), '2026-06-14');
    });
  });

  describe('getEffectiveMostRecentPerformanceDate', () => {
    it('uses a movement’s own last performed date when present', () => {
      const parent: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'parent', title: 'Parent Work' }),
        expand: {
          performances: [
            createEventFixture({ id: 'ev1', title: 'Perf 1', date: '2026-06-14T12:00:00Z', type: 'Performance' })
          ]
        }
      };
      const child: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'child', title: 'Child Movement', parentId: 'parent' }),
        expand: {
          performances: [
            createEventFixture({ id: 'ev2', title: 'Perf 2', date: '2026-07-01T12:00:00Z', type: 'Performance' })
          ]
        }
      };

      assert.strictEqual(getEffectiveMostRecentPerformanceDate(child, [parent, child]), '2026-07-01');
    });

    it('falls back to parent last performed date for child movements without their own performance history', () => {
      const parent: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'parent', title: 'Parent Work' }),
        expand: {
          performances: [
            createEventFixture({ id: 'ev1', title: 'Perf 1', date: '2026-06-14T12:00:00Z', type: 'Performance' })
          ]
        }
      };
      const child: MusicPieceWithPerformanceHistory = createMusicPieceFixture({ id: 'child', title: 'Child Movement', parentId: 'parent' });

      assert.strictEqual(getEffectiveMostRecentPerformanceDate(child, [parent, child]), '2026-06-14');
    });

    it('falls back to expanded parent data when parent is not present in allPieces', () => {
      const parent: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'parent', title: 'Parent Work' }),
        expand: {
          performances: [
            createEventFixture({ id: 'ev1', title: 'Perf 1', date: '2026-06-14T12:00:00Z', type: 'Performance' })
          ]
        }
      };
      const child: MusicPieceWithPerformanceHistory = {
        ...createMusicPieceFixture({ id: 'child', title: 'Child Movement', parentId: 'parent' }),
        expand: {
          parentId: parent
        }
      };

      assert.strictEqual(getEffectiveMostRecentPerformanceDate(child, [child]), '2026-06-14');
    });

    it('returns null for child movements when neither child nor parent has performance history', () => {
      const parent: MusicPieceWithPerformanceHistory = createMusicPieceFixture({ id: 'parent', title: 'Parent Work' });
      const child: MusicPieceWithPerformanceHistory = createMusicPieceFixture({ id: 'child', title: 'Child Movement', parentId: 'parent' });

      assert.strictEqual(getEffectiveMostRecentPerformanceDate(child, [parent, child]), null);
    });
  });
});
