import test from 'node:test';
import assert from 'node:assert/strict';

// Replicating the visibleEvents filter logic from src/views/admin/TicketingView.tsx
function filterVisibleEvents(
  events: { date: string; isTicketingEnabled: boolean; id: string }[],
  showPastAndInactive: boolean,
  now: number
) {
  const cutoffTime = now - 3 * 60 * 60 * 1000;
  return events.filter(ev => {
    if (showPastAndInactive) return true;
    const isUpcoming = new Date(ev.date).getTime() >= cutoffTime;
    const isActive = ev.isTicketingEnabled;
    return isUpcoming && isActive;
  });
}

test('TicketingView visibleEvents logic', () => {
  const now = new Date('2026-06-05T12:00:00Z').getTime();

  const events = [
    {
      id: 'active-upcoming',
      title: 'Active Upcoming Concert',
      date: '2026-06-05T15:00:00Z', // 3 hours ahead (upcoming)
      isTicketingEnabled: true,
    },
    {
      id: 'active-recent',
      title: 'Active Recent Concert',
      date: '2026-06-05T10:00:00Z', // 2 hours past (upcoming because within 3-hour cutoff)
      isTicketingEnabled: true,
    },
    {
      id: 'active-past',
      title: 'Active Past Concert',
      date: '2026-06-05T08:00:00Z', // 4 hours past (past)
      isTicketingEnabled: true,
    },
    {
      id: 'inactive-upcoming',
      title: 'Inactive Upcoming Concert',
      date: '2026-06-05T15:00:00Z',
      isTicketingEnabled: false,
    },
    {
      id: 'inactive-past',
      title: 'Inactive Past Concert',
      date: '2026-06-05T08:00:00Z',
      isTicketingEnabled: false,
    },
  ];

  // Test with showPastAndInactive = false (default)
  // Only 'active-upcoming' and 'active-recent' (within 3h cutoff) should be shown
  const visibleDefault = filterVisibleEvents(events, false, now);
  assert.equal(visibleDefault.length, 2);
  assert.ok(visibleDefault.some(e => e.id === 'active-upcoming'));
  assert.ok(visibleDefault.some(e => e.id === 'active-recent'));
  assert.ok(!visibleDefault.some(e => e.id === 'active-past'));
  assert.ok(!visibleDefault.some(e => e.id === 'inactive-upcoming'));
  assert.ok(!visibleDefault.some(e => e.id === 'inactive-past'));

  // Test with showPastAndInactive = true
  // All events should be visible
  const visibleAll = filterVisibleEvents(events, true, now);
  assert.equal(visibleAll.length, 5);
  assert.ok(visibleAll.some(e => e.id === 'active-upcoming'));
  assert.ok(visibleAll.some(e => e.id === 'active-recent'));
  assert.ok(visibleAll.some(e => e.id === 'active-past'));
  assert.ok(visibleAll.some(e => e.id === 'inactive-upcoming'));
  assert.ok(visibleAll.some(e => e.id === 'inactive-past'));
});
