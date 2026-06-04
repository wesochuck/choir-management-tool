import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
});
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EventCard } from '../src/components/singer/EventCard.tsx';
import type { Event } from '../src/services/eventService.ts';

test('EventCard set list preview renders all items without truncating or showing more in practice player', () => {
  const testEvent: Event = {
    id: 'perf-123',
    title: 'Grand Concert',
    type: 'Performance',
    date: '2026-12-25T19:00:00Z',
    setListApproved: true,
    setList: [
      { id: '1', title: 'Song One', composer: 'Composer A' },
      { id: '2', title: 'Song Two', composer: 'Composer B' },
      { id: '3', title: 'Song Three', composer: 'Composer C' },
      { id: '4', title: 'Song Four', composer: 'Composer D' },
      { id: '5', title: 'Song Five', composer: 'Composer E' },
      { id: '6', title: 'Song Six', composer: 'Composer F' },
      { id: '7', title: 'Song Seven', composer: 'Composer G' },
      { id: '8', title: 'Song Eight', composer: 'Composer H' }
    ]
  };

  const myRosters = {
    'perf-123': { rsvp: 'Yes' as const }
  };

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: testEvent,
        rsvp: 'Yes',
        onRSVP: async () => {},
        allEvents: [testEvent],
        myRosters: myRosters
      })
    )
  );

  // Assert that all 8 song titles are rendered
  const listItems = container.querySelectorAll('.setlist-preview-box li');
  assert.equal(listItems.length, 8, 'Should render all 8 items');

  const textContent = container.textContent || '';
  // Check that the individual song titles are present
  assert.ok(textContent.includes('Song One'));
  assert.ok(textContent.includes('Song Eight'));

  // Assert that "+ 2 more in Practice Player" or any variants are NOT rendered
  assert.ok(!textContent.includes('more in Practice Player'), 'Should not contain more in Practice Player text');
});

test('EventCard hides RSVP options if parent performance is declined', () => {
  const rehearsalEvent: Event = {
    id: 'reh-456',
    title: 'Weekly Rehearsal',
    type: 'Rehearsal',
    date: '2026-12-25T19:00:00Z',
    parentPerformanceId: 'perf-123',
  };

  const myRosters = {
    'perf-123': { rsvp: 'No' as const }
  };

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: rehearsalEvent,
        rsvp: 'Pending',
        onRSVP: async () => {},
        allEvents: [rehearsalEvent],
        myRosters: myRosters
      })
    )
  );

  const textContent = container.textContent || '';
  // The RSVP options should not be shown
  assert.ok(!textContent.includes("I'll be there"), "Should not show 'I'll be there' button");
  assert.ok(!textContent.includes('Report absence'), "Should not show 'Report absence' button");
  
  // Instead, the excuse message should be rendered
  assert.ok(textContent.includes('Excused (Parent Performance Declined)'), "Should show excused message");
});

test('EventCard shows RSVP options if parent performance is attending', () => {
  const rehearsalEvent: Event = {
    id: 'reh-456',
    title: 'Weekly Rehearsal',
    type: 'Rehearsal',
    date: '2026-12-25T19:00:00Z',
    parentPerformanceId: 'perf-123',
  };

  const myRosters = {
    'perf-123': { rsvp: 'Yes' as const }
  };

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: rehearsalEvent,
        rsvp: 'Pending',
        onRSVP: async () => {},
        allEvents: [rehearsalEvent],
        myRosters: myRosters
      })
    )
  );

  const textContent = container.textContent || '';
  // The RSVP options should be shown
  assert.ok(textContent.includes("I'll be there"), "Should show 'I'll be there' button");
  assert.ok(textContent.includes('Report absence'), "Should show 'Report absence' button");
  assert.ok(!textContent.includes('Excused (Parent Performance Declined)'), "Should not show excused message");
});
