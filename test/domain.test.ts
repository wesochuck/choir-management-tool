import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calendarUtils } from '../src/lib/calendar.ts';
import { calculateAutoPaint } from '../src/lib/seatingAlgorithm.ts';
import { renderCommunicationTemplate } from '../src/lib/messageTemplates.ts';
import {
  mergeSeatingResponseWithDirtyState,
  seatingContextId,
  shouldApplySeatingResponse,
  groupSingersBySection,
  removeSeatFromRow,
  removeRowAndShiftAssignments,
} from '../src/lib/seatingSync.ts';
import { findPieceDetails, formatPerformanceHistory, parseMusicLibraryCSV } from '../src/lib/musicPieceUtils.ts';
import type { Event } from '../src/services/eventService.ts';
import type { MusicPiece } from '../src/services/musicLibraryService.ts';

test('calendarUtils.createICS emits a valid two-hour event', () => {
  const event = {
    id: 'evt_1',
    title: 'Spring Concert',
    type: 'Performance',
    date: '2026-05-20T23:00:00.000Z',
    expand: {
      venue: {
        name: 'Main Sanctuary',
        address: '123 Main St'
      }
    },
    details: 'Black folders',
  };

  const ics = calendarUtils.createICS(event);

  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /DTSTART:20260520T230000Z/);
  assert.match(ics, /DTEND:20260521T010000Z/);
  assert.match(ics, /SUMMARY:Spring Concert/);
  assert.match(ics, /LOCATION:Main Sanctuary\\, 123 Main St/);
});

test('seating auto-paint fills vertical sections in the configured order', () => {
  const suggestions = calculateAutoPaint(
    [8, 8],
    { S: 2, A: 2, T: 2, B: 2 },
    ['S', 'A', 'T', 'B'],
  );

  assert.equal(suggestions['0-0'], 'S');
  assert.equal(suggestions['0-2'], 'A');
  assert.equal(suggestions['0-4'], 'T');
  assert.equal(suggestions['0-6'], 'B');
  assert.equal(suggestions['1-0'], 'S');
  assert.equal(suggestions['1-6'], 'B');
});

test('seating auto-paint supports custom section order', () => {
  const suggestions = calculateAutoPaint(
    [4],
    { S: 1, A: 1, T: 1, B: 1 },
    ['S', 'B', 'T', 'A'],
  );

  assert.deepEqual(
    ['0-0', '0-1', '0-2', '0-3'].map((seat) => suggestions[seat]),
    ['S', 'B', 'T', 'A'],
  );
});

const contrastRatio = (foreground: string, background: string) => {
  const parse = (hex: string) => {
    const normalized = hex.replace('#', '');
    return [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  };
  const luminance = (hex: string) => {
    const values = parse(hex).map((value) => (
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    ));
    return (0.2126 * values[0]) + (0.7152 * values[1]) + (0.0722 * values[2]);
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

test('core color pairs meet WCAG AA contrast for normal text', () => {
  assert.ok(contrastRatio('#2c3e50', '#ffffff') >= 4.5, 'body text on white');
  assert.ok(contrastRatio('#64748b', '#ffffff') >= 4.5, 'muted text on white');
  assert.ok(contrastRatio('#ffffff', '#4a7c59') >= 4.5, 'primary button text');
  assert.ok(contrastRatio('#345940', '#e9f0eb') >= 4.5, 'secondary button text');
  assert.ok(contrastRatio('#991b1b', '#fee2e2') >= 4.5, 'danger text');
});

test('button system keeps accessible minimum touch target height', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /\.btn\s*\{[\s\S]*height:\s*44px;/);
});

test('singer card name allows full name text with flexible width', () => {
  const css = readFileSync(new URL('../src/views/admin/SeatingView.css', import.meta.url), 'utf8');
  assert.ok(!/\.singer-card-name\s*\{[^}]*max-width:\s*75px/.test(css), 'should not restrict name card with small hardcoded max-width');
  assert.match(css, /\.singer-card-name\s*\{[^}]*flex:\s*1/);
  assert.match(css, /\.singer-card-name\s*\{[^}]*min-width:\s*0/);
});

test('communication templates replace event placeholders', () => {
  const rendered = renderCommunicationTemplate(
    'Reminder: {eventTitle} at {eventLocation} on {eventDate}. {eventDetails}',
    {
      eventTitle: 'Spring Concert',
      eventLocation: 'Main Hall',
      eventDate: 'May 23, 7:00 PM',
      eventDetails: 'Black folders',
    },
  );

  assert.equal(rendered, 'Reminder: Spring Concert at Main Hall on May 23, 7:00 PM. Black folders');
});

test('seating sync contexts reject stale responses from previous visits', () => {
  const originalVisit = { performanceId: 'perf_a', venueId: 'venue_1', sessionId: 1 };
  const laterVisit = { performanceId: 'perf_a', venueId: 'venue_1', sessionId: 2 };

  assert.notEqual(seatingContextId(originalVisit), seatingContextId(laterVisit));
  assert.equal(shouldApplySeatingResponse(originalVisit, laterVisit), false);
  assert.equal(shouldApplySeatingResponse(laterVisit, laterVisit), true);
});

test('seating sync merge preserves optimistic edits over late load data', () => {
  const merged = mergeSeatingResponseWithDirtyState(
    {
      id: 'chart_1',
      collectionId: 'pbc_seating_001',
      collectionName: 'seating',
      created: '',
      updated: '',
      performance: 'perf_a',
      venue: 'venue_1',
      layoutOverride: [8],
      formationId: 'strategy_a',
      assignments: { '0-1': 'older_singer' },
    },
    {
      formationId: 'strategy_b',
      assignments: { '0-1': 'local_singer' },
    },
    { '0-1': 'local_singer', '0-2': 'another_local_singer' },
    'perf_a',
    'venue_1',
  );

  assert.equal(merged.formationId, 'strategy_b');
  assert.deepEqual(merged.assignments, {
    '0-1': 'local_singer',
    '0-2': 'another_local_singer',
  });
});

test('groupSingersBySection excludes assigned singers and segments unassigned into lanes', () => {
  const profiles = [
    { id: '1', name: 'Alice Smith', voicePart: 'Soprano 1' },
    { id: '2', name: 'Amanda Jones', voicePart: 'Soprano 2' },
    { id: '3', name: 'Betty Miller', voicePart: 'Alto 1' },
    { id: '4', name: 'Thomas Wright', voicePart: 'Tenor 2' },
    { id: '5', name: 'Bob Johnson', voicePart: 'Bass' },
    { id: '6', name: 'Soloist Steve', voicePart: 'Soloist' },
  ];
  
  // Exclude '1' (Alice) and '5' (Bob) as they are already assigned
  const assigned = new Set(['1', '5']);
  
  const grouped = groupSingersBySection(profiles, assigned);
  
  assert.deepEqual(grouped.S, [{ id: '2', name: 'Amanda Jones', voicePart: 'Soprano 2' }]);
  assert.deepEqual(grouped.A, [{ id: '3', name: 'Betty Miller', voicePart: 'Alto 1' }]);
  assert.deepEqual(grouped.T, [{ id: '4', name: 'Thomas Wright', voicePart: 'Tenor 2' }]);
  assert.deepEqual(grouped.B, []);
  assert.deepEqual(grouped.Other, [{ id: '6', name: 'Soloist Steve', voicePart: 'Soloist' }]);
});

test('findPieceDetails matches and returns the piece by id', () => {
  const library = [
    { id: 'piece_1', title: 'Messiah', composer: 'Handel' },
    { id: 'piece_2', title: 'Requiem', composer: 'Mozart' }
  ] as MusicPiece[];

  const result = findPieceDetails('piece_2', library);
  assert.equal(result?.title, 'Requiem');
  assert.equal(result?.composer, 'Mozart');
});

test('findPieceDetails returns null if piece id is not in library', () => {
  const library = [
    { id: 'piece_1', title: 'Messiah', composer: 'Handel' }
  ] as MusicPiece[];

  const result = findPieceDetails('piece_unknown', library);
  assert.equal(result, null);
});

test('findPieceDetails handles empty library or undefined parameters', () => {
  assert.equal(findPieceDetails('some_id', []), null);
  assert.equal(findPieceDetails('', []), null);
});

test('formatPerformanceHistory returns formatted performance strings when expand.performances exists', () => {
  const piece = {
    id: 'piece_1',
    title: 'Messiah',
    composer: 'Handel',
    expand: {
      performances: [
        { id: 'evt_1', title: 'Spring Concert', date: '2026-05-20T23:00:00.000Z', type: 'Performance' },
        { id: 'evt_2', title: 'Winter Gala', date: '2025-12-15T19:00:00.000Z', type: 'Performance' }
      ]
    }
  } as MusicPiece & { expand: { performances: Event[] } };

  const result = formatPerformanceHistory(piece);
  assert.deepEqual(result, [
    'Spring Concert (2026-05-20)',
    'Winter Gala (2025-12-15)'
  ]);
});

test('formatPerformanceHistory returns empty array when expand or performances is missing', () => {
  const pieceBody = { id: 'piece_2', title: 'Requiem' } as MusicPiece;
  assert.deepEqual(formatPerformanceHistory(pieceBody), []);

  const pieceEmptyExpand = { id: 'piece_2', title: 'Requiem', expand: {} } as MusicPiece;
  assert.deepEqual(formatPerformanceHistory(pieceEmptyExpand), []);

  const pieceEmptyPerformances = { id: 'piece_2', title: 'Requiem', expand: { performances: [] } } as unknown as MusicPiece;
  assert.deepEqual(formatPerformanceHistory(pieceEmptyPerformances), []);
});

test('parseMusicLibraryCSV parses CSV with standard fields and optional duration', () => {
  const csvText = `Title,Composer,Copies,Catalog ID,Duration,Notes
Messiah,Handel,45,CAT-001,2:45:00,Historic Messiah Notes
Requiem,Mozart,,CAT-002,50:00,
Ave Verum,Mozart,30,,,`;

  const results = parseMusicLibraryCSV(csvText);

  assert.equal(results.length, 3);

  // Piece 1: Full fields including duration
  assert.equal(results[0].title, 'Messiah');
  assert.equal(results[0].composer, 'Handel');
  assert.equal(results[0].copies, 45);
  assert.equal(results[0].catalogId, 'CAT-001');
  assert.equal(results[0].duration, '2:45:00');
  assert.equal(results[0].notes, 'Historic Messiah Notes');

  // Piece 2: Optional duration and catalogId, but empty/missing copies
  assert.equal(results[1].title, 'Requiem');
  assert.equal(results[1].composer, 'Mozart');
  assert.equal(results[1].copies, undefined);
  assert.equal(results[1].catalogId, 'CAT-002');
  assert.equal(results[1].duration, '50:00');
  assert.equal(results[1].notes, '');

  // Piece 3: No duration or catalogId
  assert.equal(results[2].title, 'Ave Verum');
  assert.equal(results[2].composer, 'Mozart');
  assert.equal(results[2].copies, 30);
  assert.equal(results[2].catalogId, '');
  assert.equal(results[2].duration, undefined);
  assert.equal(results[2].notes, '');
});

test('findPieceDetails preserves and returns duration if present', () => {
  const library = [
    { id: 'piece_1', title: 'Messiah', composer: 'Handel', duration: '3:30' }
  ] as MusicPiece[];

  const result = findPieceDetails('piece_1', library);
  assert.equal(result?.duration, '3:30');
});

test('removeSeatFromRow decrements seat count and shifts subsequent assignments in that row left', () => {
  const rowCounts = [3, 4];
  const assignments = {
    '0-0': 'singerA',
    '0-1': 'singerB', // target to remove
    '0-2': 'singerC',
    '1-0': 'singerD',
    '1-2': 'singerE',
  };

  const result = removeSeatFromRow(rowCounts, 0, 1, assignments);

  assert.deepEqual(result.rowCounts, [2, 4]);
  assert.deepEqual(result.assignments, {
    '0-0': 'singerA',
    '0-1': 'singerC', // singerC shifted left
    '1-0': 'singerD',
    '1-2': 'singerE', // unaffected row
  });
});

test('removeRowAndShiftAssignments removes the row and shifts all rows below it up by one index', () => {
  const rowCounts = [3, 4, 5];
  const assignments = {
    '0-0': 'singerA',
    '1-0': 'singerB', // row being removed
    '1-1': 'singerC', // row being removed
    '2-0': 'singerD',
  };

  const result = removeRowAndShiftAssignments(rowCounts, 1, assignments);

  assert.deepEqual(result.rowCounts, [3, 5]);
  assert.deepEqual(result.assignments, {
    '0-0': 'singerA',
    '1-0': 'singerD', // shifted from row 2 to row 1
  });
});


