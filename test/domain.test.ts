import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calendarUtils } from '../src/lib/calendar.ts';
import { calculateAutoPaint } from '../src/lib/seatingAlgorithm.ts';
import { renderCommunicationTemplate } from '../src/lib/messageTemplates.ts';
import {
  mergeSeatingResponseWithDirtyState,
  seatingContextId,
  shouldApplySeatingResponse,
} from '../src/lib/seatingSync.ts';

test('calendarUtils.createICS emits a valid two-hour event', () => {
  const event = {
    id: 'evt_1',
    title: 'Spring Concert',
    type: 'Performance',
    date: '2026-05-20T23:00:00.000Z',
    location: 'Main Sanctuary',
    details: 'Black folders',
  } as any;

  const ics = calendarUtils.createICS(event);

  expect(ics).toMatch(/^BEGIN:VCALENDAR/);
  expect(ics).toMatch(/BEGIN:VEVENT/);
  expect(ics).toMatch(/DTSTART:20260520T230000Z/);
  expect(ics).toMatch(/DTEND:20260521T010000Z/);
  expect(ics).toMatch(/SUMMARY:Spring Concert/);
  expect(ics).toMatch(/LOCATION:Main Sanctuary/);
});

test('seating auto-paint fills vertical sections in the configured order', () => {
  const suggestions = calculateAutoPaint(
    [8, 8],
    { S: 2, A: 2, T: 2, B: 2 },
    ['S', 'A', 'T', 'B'],
  );

  expect(suggestions['0-0']).toBe('S');
  expect(suggestions['0-2']).toBe('A');
  expect(suggestions['0-4']).toBe('T');
  expect(suggestions['0-6']).toBe('B');
  expect(suggestions['1-0']).toBe('S');
  expect(suggestions['1-6']).toBe('B');
});

test('seating auto-paint supports custom section order', () => {
  const suggestions = calculateAutoPaint(
    [4],
    { S: 1, A: 1, T: 1, B: 1 },
    ['S', 'B', 'T', 'A'],
  );

  expect(['0-0', '0-1', '0-2', '0-3'].map((seat) => suggestions[seat])).toEqual(['S', 'B', 'T', 'A']);
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
  expect(contrastRatio('#2c3e50', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio('#64748b', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio('#ffffff', '#4a7c59')).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio('#345940', '#e9f0eb')).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio('#991b1b', '#fee2e2')).toBeGreaterThanOrEqual(4.5);
});

test('button system keeps accessible minimum touch target height', () => {
  const css = readFileSync(resolve(__dirname, '../src/App.css'), 'utf8');
  expect(css).toMatch(/\.btn\s*\{[\s\S]*height:\s*44px;/);
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

  expect(rendered).toBe('Reminder: Spring Concert at Main Hall on May 23, 7:00 PM. Black folders');
});

test('seating sync contexts reject stale responses from previous visits', () => {
  const originalVisit = { performanceId: 'perf_a', venueId: 'venue_1', sessionId: 1 };
  const laterVisit = { performanceId: 'perf_a', venueId: 'venue_1', sessionId: 2 };

  expect(seatingContextId(originalVisit)).not.toBe(seatingContextId(laterVisit));
  expect(shouldApplySeatingResponse(originalVisit, laterVisit)).toBe(false);
  expect(shouldApplySeatingResponse(laterVisit, laterVisit)).toBe(true);
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
      sectionOrder: 'S,A,T,B',
      assignments: { '0-1': 'older_singer' },
    },
    {
      sectionOrder: 'S,B,T,A',
      assignments: { '0-1': 'local_singer' },
    },
    { '0-1': 'local_singer', '0-2': 'another_local_singer' },
    'perf_a',
    'venue_1',
  );

  expect(merged.sectionOrder).toBe('S,B,T,A');
  expect(merged.assignments).toEqual({
    '0-1': 'local_singer',
    '0-2': 'another_local_singer',
  });
});
