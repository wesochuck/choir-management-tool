// @vitest-environment jsdom
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EventCard } from '../src/components/singer/EventCard.tsx';
import type { Event } from '../src/services/eventService.ts';
import type { EventRoster } from '../src/services/rosterService.ts';

afterEach(() => {
  cleanup();
});

test('EventCard set list preview renders all items without truncating or showing more in practice player', () => {
  const testEvent = {
    id: 'perf-123',
    title: 'Grand Concert',
    type: 'Performance' as const,
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
      { id: '8', title: 'Song Eight', composer: 'Composer H' },
    ],
  } as unknown as Event;

  const myRosters = {
    'perf-123': { rsvp: 'Yes' as const },
  } as unknown as Record<string, EventRoster>;

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: testEvent,
        rsvp: 'Yes',
        onRSVP: async () => {},
        allEvents: [testEvent],
        myRosters: myRosters,
      })
    )
  );

  // Assert that all 8 song titles are rendered
  const listItems = container.querySelectorAll('ol li');
  assert.equal(listItems.length, 8, 'Should render all 8 items');

  const textContent = container.textContent || '';
  // Check that the individual song titles are present
  assert.ok(textContent.includes('Song One'));
  assert.ok(textContent.includes('Song Eight'));

  // Assert that "+ 2 more in Practice Player" or any variants are NOT rendered
  assert.ok(
    !textContent.includes('more in Practice Player'),
    'Should not contain more in Practice Player text'
  );
});

test('EventCard hides RSVP options if parent performance is declined', () => {
  const rehearsalEvent = {
    id: 'reh-456',
    title: 'Weekly Rehearsal',
    type: 'Rehearsal' as const,
    date: '2026-12-25T19:00:00Z',
    parentPerformanceId: 'perf-123',
  } as unknown as Event;

  const myRosters = {
    'perf-123': { rsvp: 'No' as const },
  } as unknown as Record<string, EventRoster>;

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: rehearsalEvent,
        rsvp: 'Pending',
        onRSVP: async () => {},
        allEvents: [rehearsalEvent],
        myRosters: myRosters,
      })
    )
  );

  const textContent = container.textContent || '';
  // The RSVP options should not be shown
  assert.ok(!textContent.includes("I'll be there"), "Should not show 'I'll be there' button");
  assert.ok(!textContent.includes('Report absence'), "Should not show 'Report absence' button");

  // Instead, the excuse message should be rendered
  assert.ok(
    textContent.includes('Excused (Parent Performance Declined)'),
    'Should show excused message'
  );
});

test('EventCard shows RSVP options if parent performance is attending', () => {
  const rehearsalEvent = {
    id: 'reh-456',
    title: 'Weekly Rehearsal',
    type: 'Rehearsal' as const,
    date: '2026-12-25T19:00:00Z',
    parentPerformanceId: 'perf-123',
  } as unknown as Event;

  const myRosters = {
    'perf-123': { rsvp: 'Yes' as const },
  } as unknown as Record<string, EventRoster>;

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: rehearsalEvent,
        rsvp: 'Pending',
        onRSVP: async () => {},
        allEvents: [rehearsalEvent],
        myRosters: myRosters,
      })
    )
  );

  const textContent = container.textContent || '';
  // The RSVP options should be shown
  assert.ok(textContent.includes("I'll be there"), "Should show 'I'll be there' button");
  assert.ok(textContent.includes('Report absence'), "Should show 'Report absence' button");
  assert.ok(
    !textContent.includes('Excused (Parent Performance Declined)'),
    'Should not show excused message'
  );
});

test('EventCard does not show seating button if the performance is declined', () => {
  const testEvent = {
    id: 'perf-123',
    title: 'Grand Concert',
    type: 'Performance' as const,
    date: '2026-12-25T19:00:00Z',
  } as unknown as Event;

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: testEvent,
        rsvp: 'No', // Declined
        onRSVP: async () => {},
        allEvents: [testEvent],
        myRosters: {},
      })
    )
  );

  const textContent = container.textContent || '';
  assert.ok(!textContent.includes('Seating'), "Should not show 'Seating' button");
});

test('EventCard shows seating button if the performance is attending or pending', () => {
  const testEvent = {
    id: 'perf-123',
    title: 'Grand Concert',
    type: 'Performance' as const,
    date: '2026-12-25T19:00:00Z',
  } as unknown as Event;

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: testEvent,
        rsvp: 'Yes', // Attending
        onRSVP: async () => {},
        allEvents: [testEvent],
        myRosters: {},
      })
    )
  );

  const textContent = container.textContent || '';
  assert.ok(textContent.includes('Seating'), "Should show 'Seating' button");
});

test('EventCard shows a personal featured assignment for Pending and No RSVPs', () => {
  for (const rsvp of ['Pending', 'No'] as const) {
    const performance = {
      id: `perf-${rsvp}`,
      title: 'Featured Concert',
      type: 'Performance' as const,
      date: '2026-12-25T19:00:00Z',
      setListApproved: true,
      setList: [
        {
          id: 'featured-song',
          title: 'Featured Song',
          isFeaturedNumber: true,
          performerCredits: [
            { kind: 'profile' as const, profileId: 'my-profile', displayName: 'Captured Name' },
          ],
        },
      ],
    } as unknown as Event;

    const { container, unmount } = render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(EventCard, {
          event: performance,
          rsvp,
          onRSVP: async () => {},
          allEvents: [performance],
          myProfileId: 'my-profile',
        })
      )
    );
    const textContent = container.textContent || '';
    assert.ok(textContent.includes('You’re featured'));
    assert.ok(textContent.includes('Solo — Featured Song'));
    assert.equal(container.querySelectorAll('ol').length, 0, 'Full set list remains RSVP-gated');
    unmount();
  }
});

test('EventCard hides personal featured assignments until the effective list is approved', () => {
  const performance = {
    id: 'perf-unapproved',
    title: 'Draft Concert',
    type: 'Performance' as const,
    date: '2026-12-25T19:00:00Z',
    setListApproved: false,
    setList: [
      {
        id: 'featured-song',
        title: 'Draft Solo',
        isFeaturedNumber: true,
        performerCredits: [
          { kind: 'profile' as const, profileId: 'my-profile', displayName: 'Captured Name' },
        ],
      },
    ],
  } as unknown as Event;

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: performance,
        rsvp: 'Yes',
        onRSVP: async () => {},
        allEvents: [performance],
        myProfileId: 'my-profile',
      })
    )
  );
  assert.ok(!(container.textContent || '').includes('You’re featured'));
});

test('EventCard includes approved performer credits in the singer set list', () => {
  const performance = {
    id: 'perf-approved-credit',
    title: 'Published Concert',
    type: 'Performance' as const,
    date: '2026-12-25T19:00:00Z',
    setListApproved: true,
    setList: [
      {
        id: 'featured-song',
        title: 'Published Group',
        isFeaturedNumber: true,
        performerCredits: [
          { kind: 'profile' as const, profileId: 'p1', displayName: 'First Singer' },
          { kind: 'guest' as const, displayName: 'Guest Artist' },
        ],
      },
    ],
  } as unknown as Event;
  const myRosters = {
    'perf-approved-credit': { rsvp: 'Yes' as const },
  } as unknown as Record<string, EventRoster>;

  const { container } = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(EventCard, {
        event: performance,
        rsvp: 'Yes',
        onRSVP: async () => {},
        allEvents: [performance],
        myRosters,
      })
    )
  );
  assert.ok((container.textContent || '').includes('Group — First Singer, Guest Artist'));
});
