import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMostRecentPerformanceDate } from '../src/lib/music/performanceHistory';
import { buildPiecePerformanceMap } from '../src/hooks/usePiecePerformanceMap';
import { createMusicPieceFixture, createEventFixture } from './helpers';
import type { Event } from '../src/services/eventService';

describe('Performance Recency Filtering', () => {
  describe('getMostRecentPerformanceDate', () => {
    it('returns null when expand or performances is missing', () => {
      const perfMap = buildPiecePerformanceMap([]);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), null);
    });

    it('returns null when performances array is empty', () => {
      const perfMap = buildPiecePerformanceMap([]);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), null);
    });

    it('ignores invalid or missing dates and returns the newest valid date', () => {
      const ev1 = {
        ...createEventFixture({
          id: 'ev1',
          title: 'Event 1',
          date: '2024-05-01T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's1', title: 'Song 1', pieceId: 'p1' }],
      };
      const ev2 = {
        ...createEventFixture({
          id: 'ev2',
          title: 'Event 2',
          date: 'invalid-date',
          type: 'Performance',
        }),
        setList: [{ id: 's2', title: 'Song 1', pieceId: 'p1' }],
      };
      const ev3 = {
        ...createEventFixture({
          id: 'ev3',
          title: 'Event 3',
          date: '2025-06-01T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's3', title: 'Song 1', pieceId: 'p1' }],
      };
      const ev4 = {
        ...createEventFixture({ id: 'ev4', title: 'Event 4', date: '', type: 'Performance' }),
        setList: [{ id: 's4', title: 'Song 1', pieceId: 'p1' }],
      };
      const perfMap = buildPiecePerformanceMap([ev1, ev2, ev3, ev4] as unknown as Event[]);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), '2025-06-01');
    });

    it('handles unsorted performance dates', () => {
      const ev1 = {
        ...createEventFixture({
          id: 'ev1',
          title: 'Event 1',
          date: '2025-02-15T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's1', title: 'Song 1', pieceId: 'p1' }],
      };
      const ev2 = {
        ...createEventFixture({
          id: 'ev2',
          title: 'Event 2',
          date: '2026-01-10T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's2', title: 'Song 1', pieceId: 'p1' }],
      };
      const ev3 = {
        ...createEventFixture({
          id: 'ev3',
          title: 'Event 3',
          date: '2024-12-25T12:00:00Z',
          type: 'Performance',
        }),
        setList: [{ id: 's3', title: 'Song 1', pieceId: 'p1' }],
      };
      const perfMap = buildPiecePerformanceMap([ev1, ev2, ev3] as unknown as Event[]);
      const piece = createMusicPieceFixture({ id: 'p1', title: 'Song 1' });
      assert.strictEqual(getMostRecentPerformanceDate(piece, perfMap), '2026-01-10');
    });
  });
});
