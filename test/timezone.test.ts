import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import {
  fetchChoirTimezone,
  setCachedTimezone,
  getBrowserTimezone,
  formatInTimezone,
  utcToZonedInputValue,
  zonedInputValueToUtc,
} from '../src/lib/timezone.ts';

type CollectionMock = ReturnType<typeof pb.collection>;

test('fetchChoirTimezone fetches timezone from settings and caches it', async (t) => {
  const originalCollection = pb.collection;
  const mockGetFirstListItem = t.mock.fn(async () => {
    return { key: 'timezone', value: 'America/Los_Angeles' };
  });

  pb.collection = function (name: string) {
    if (name === 'appSettings') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as CollectionMock;
    }
    return originalCollection.call(pb, name);
  };

  try {
    // Clear cache first
    setCachedTimezone('');

    const tz = await fetchChoirTimezone();
    assert.equal(tz, 'America/Los_Angeles');
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);

    // Call again to verify it uses cached timezone
    const tzCached = await fetchChoirTimezone();
    assert.equal(tzCached, 'America/Los_Angeles');
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);
  } finally {
    pb.collection = originalCollection;
  }
});

test('getBrowserTimezone returns standard string', () => {
  const tz = getBrowserTimezone();
  assert.equal(typeof tz, 'string');
  assert.ok(tz.length > 0);
});

test('formatInTimezone formats UTC date correctly in given timezone', () => {
  const dateStr = '2026-11-01T12:00:00Z'; // 12:00 PM UTC
  
  // Format in America/New_York (UTC-5 during standard time, DST ends Nov 1 2026)
  // At 12:00 UTC, it's 7:00 AM EST (standard time) on Nov 1 2026
  const formattedNY = formatInTimezone(dateStr, 'America/New_York', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  assert.ok(formattedNY.includes('7:00'));
  
  // Format in America/Los_Angeles (UTC-8)
  // At 12:00 UTC, it's 4:00 AM PST on Nov 1 2026
  const formattedLA = formatInTimezone(dateStr, 'America/Los_Angeles', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  assert.ok(formattedLA.includes('4:00'));
});

test('utcToZonedInputValue converts UTC strings to zoned YYYY-MM-DDTHH:MM input formats', () => {
  // Nov 1 2026 at 12:00:00 UTC
  const utcString = '2026-11-01T12:00:00Z';
  
  // America/New_York: 7:00 AM
  const zonedInputNY = utcToZonedInputValue(utcString, 'America/New_York');
  assert.equal(zonedInputNY, '2026-11-01T07:00');
  
  // America/Los_Angeles: 4:00 AM
  const zonedInputLA = utcToZonedInputValue(utcString, 'America/Los_Angeles');
  assert.equal(zonedInputLA, '2026-11-01T04:00');
  
  // Empty values
  assert.equal(utcToZonedInputValue('', 'America/New_York'), '');
  assert.equal(utcToZonedInputValue('invalid-date', 'America/New_York'), '');
});

test('zonedInputValueToUtc converts local zoned strings back to UTC ISO strings', () => {
  // Convert 2026-11-01T07:00 back to UTC from America/New_York
  const utcNY = zonedInputValueToUtc('2026-11-01T07:00', 'America/New_York');
  assert.equal(utcNY, '2026-11-01T12:00:00.000Z');

  // Convert 2026-11-01T04:00 back to UTC from America/Los_Angeles
  const utcLA = zonedInputValueToUtc('2026-11-01T04:00', 'America/Los_Angeles');
  assert.equal(utcLA, '2026-11-01T12:00:00.000Z');

  // Empty / fallback values
  assert.equal(zonedInputValueToUtc('', 'America/New_York'), '');
});

test('zonedInputValueToUtc handles DST boundary shift transitions gracefully', () => {
  // DST in New York ends on Sunday, Nov 1, 2026.
  // 1:59 AM EDT -> 1:00 AM EST.
  // Let's verify before and after the shift.
  
  // EDT (UTC-4) Oct 31, 2026 12:00 (noon) EDT -> 16:00 UTC
  const edtToUtc = zonedInputValueToUtc('2026-10-31T12:00', 'America/New_York');
  assert.equal(edtToUtc, '2026-10-31T16:00:00.000Z');
  
  // EST (UTC-5) Nov 2, 2026 12:00 (noon) EST -> 17:00 UTC
  const estToUtc = zonedInputValueToUtc('2026-11-02T12:00', 'America/New_York');
  assert.equal(estToUtc, '2026-11-02T17:00:00.000Z');
});
