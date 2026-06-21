import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMostRecentPerformanceDate,
  getEffectiveMostRecentPerformanceDate,
} from '../src/lib/music/performanceHistory';
import { buildPiecePerformanceMap } from '../src/hooks/usePiecePerformanceMap';
import { createMusicPieceFixture, createEventFixture } from './helpers';
import type { Event } from '../src/services/eventService';

describe('performanceHistory tests', () => {
  describe('getMostRecentPerformanceDate', () => {
    it('returns the newest own performance date', () => {
      const ev1 = {
        ...createEventFixture({
          id: 'ev1',
          title: 'Perf 1',
          date: '2024-01-01T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's1', title: 'Song 1', pieceId: 'p1' }],
      };
      const ev2 = {
        ...createEventFixture({
          id: 'ev2',
          title: 'Perf 2',
          date: '2026-06-14T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's2', title: 'Song 1', pieceId: 'p1' }],
      };
      const perfMap = buildPiecePerformanceMap([ev1, ev2] as unknown as Event[]);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), '2026-06-14');
    });

    it('returns null when the piece has no performance entries', () => {
      const perfMap = buildPiecePerformanceMap([]);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), null);
    });

    it('ignores invalid performance dates', () => {
      const ev1 = {
        ...createEventFixture({
          id: 'ev1',
          title: 'Perf 1',
          date: 'invalid-date',
          type: 'Performance',
        }),
        setList: [{ id: 's1', title: 'Song 1', pieceId: 'p1' }],
      };
      const ev2 = {
        ...createEventFixture({
          id: 'ev2',
          title: 'Perf 2',
          date: '2026-06-14T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's2', title: 'Song 1', pieceId: 'p1' }],
      };
      const perfMap = buildPiecePerformanceMap([ev1, ev2] as unknown as Event[]);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), '2026-06-14');
    });
  });

  describe('getEffectiveMostRecentPerformanceDate', () => {
    it("uses a movement's own last performed date when present", () => {
      const ev1 = {
        ...createEventFixture({
          id: 'ev1',
          title: 'Perf 1',
          date: '2026-06-14T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's1', title: 'Parent', pieceId: 'parent' }],
      };
      const ev2 = {
        ...createEventFixture({
          id: 'ev2',
          title: 'Perf 2',
          date: '2026-07-01T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's2', title: 'Child', pieceId: 'child' }],
      };
      const perfMap = buildPiecePerformanceMap([ev1, ev2] as unknown as Event[]);
      const parent = createMusicPieceFixture({ id: 'parent', title: 'Parent Work' });
      const child = createMusicPieceFixture({
        id: 'child',
        title: 'Child Movement',
        parentId: 'parent',
      });
      assert.strictEqual(
        getEffectiveMostRecentPerformanceDate(child, perfMap, [parent, child]),
        '2026-07-01'
      );
    });

    it('falls back to parent last performed date for child movements without their own performance history', () => {
      const ev1 = {
        ...createEventFixture({
          id: 'ev1',
          title: 'Perf 1',
          date: '2026-06-14T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's1', title: 'Parent', pieceId: 'parent' }],
      };
      const perfMap = buildPiecePerformanceMap([ev1] as unknown as Event[]);
      const parent = createMusicPieceFixture({ id: 'parent', title: 'Parent Work' });
      const child = createMusicPieceFixture({
        id: 'child',
        title: 'Child Movement',
        parentId: 'parent',
      });
      assert.strictEqual(
        getEffectiveMostRecentPerformanceDate(child, perfMap, [parent, child]),
        '2026-06-14'
      );
    });

    it('returns null for child movements when neither child nor parent has performance history', () => {
      const perfMap = buildPiecePerformanceMap([]);
      const parent = createMusicPieceFixture({ id: 'parent', title: 'Parent Work' });
      const child = createMusicPieceFixture({
        id: 'child',
        title: 'Child Movement',
        parentId: 'parent',
      });
      assert.strictEqual(
        getEffectiveMostRecentPerformanceDate(child, perfMap, [parent, child]),
        null
      );
    });
  });
});
