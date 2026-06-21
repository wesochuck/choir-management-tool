// @vitest-environment node
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPiecePerformanceMap } from '../src/hooks/usePiecePerformanceMap';
import type { Event, SetListItem } from '../src/services/eventService';

function makeEvent(overrides: Partial<Event> & { id: string; date: string }): Event {
  return {
    title: 'Test',
    type: 'Performance' as const,
    parentPerformanceId: '',
    details: '',
    collectionId: 'col',
    collectionName: 'events',
    created: '',
    updated: '',
    setList: [],
    ...overrides,
  } as Event;
}

describe('buildPiecePerformanceMap', () => {
  it('builds empty map when no events have matching pieceIds', () => {
    const events: Event[] = [makeEvent({ id: 'e1', date: '2026-01-01', setList: [] })];
    const map = buildPiecePerformanceMap(events);
    assert.strictEqual(map.size, 0);
  });

  it('records pieceId appearing in an event setList', () => {
    const events: Event[] = [
      makeEvent({
        id: 'e1',
        date: '2026-01-01T12:00:00Z',
        setList: [{ id: 's1', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
    ];
    const map = buildPiecePerformanceMap(events);
    const entry = map.get('p1');
    assert.ok(entry);
    assert.strictEqual(entry.count, 1);
    assert.strictEqual(entry.dates.length, 1);
  });

  it('counts multiple events for same pieceId', () => {
    const events: Event[] = [
      makeEvent({
        id: 'e1',
        date: '2026-01-01T12:00:00Z',
        setList: [{ id: 's1', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
      makeEvent({
        id: 'e2',
        date: '2026-06-01T12:00:00Z',
        setList: [{ id: 's2', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
    ];
    const map = buildPiecePerformanceMap(events);
    assert.strictEqual(map.get('p1')!.count, 2);
    assert.strictEqual(map.get('p1')!.dates.length, 2);
  });

  it('handles events without setList gracefully', () => {
    const eventWithoutSetList = {
      id: 'e1',
      date: '2026-01-01',
      title: 'Test',
      type: 'Performance' as const,
    } as unknown as Event;
    const map = buildPiecePerformanceMap([eventWithoutSetList]);
    assert.strictEqual(map.size, 0);
  });

  it('returns the most recent date correctly sorted', () => {
    const events: Event[] = [
      makeEvent({
        id: 'e1',
        date: '2026-01-01T12:00:00Z',
        setList: [{ id: 's1', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
      makeEvent({
        id: 'e2',
        date: '2026-06-01T12:00:00Z',
        setList: [{ id: 's2', title: 'Piece A', pieceId: 'p1' }] as SetListItem[],
      }),
    ];
    const map = buildPiecePerformanceMap(events);
    assert.strictEqual(map.get('p1')!.mostRecentDate, '2026-06-01');
  });

  it('handles pieceIds that are undefined (intermission items)', () => {
    const events: Event[] = [
      makeEvent({
        id: 'e1',
        date: '2026-01-01T12:00:00Z',
        setList: [{ id: 's1', title: 'Intermission', type: 'intermission' }] as SetListItem[],
      }),
    ];
    const map = buildPiecePerformanceMap(events);
    assert.strictEqual(map.size, 0);
  });
});
