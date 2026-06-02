import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { zonedInputValueToUtcLocal } from '../../pocketbase/pb_hooks_src/timezone';

describe('zonedInputValueToUtcLocal', () => {
    test('converts standard Eastern Time to UTC', () => {
        // Standard time: Nov 2026 is EST (-5)
        // 7:00 PM local -> 12:00 AM UTC next day
        const local = '2026-11-20T19:00';
        const tz = 'America/New_York';
        const result = zonedInputValueToUtcLocal(local, tz);
        assert.strictEqual(result, '2026-11-21T00:00:00.000Z');
    });

    test('converts Daylight Saving Eastern Time to UTC', () => {
        // DST time: June 2026 is EDT (-4)
        // 7:00 PM local -> 11:00 PM UTC
        const local = '2026-06-15T19:00';
        const tz = 'America/New_York';
        const result = zonedInputValueToUtcLocal(local, tz);
        assert.strictEqual(result, '2026-06-15T23:00:00.000Z');
    });

    test('converts Central Time (Chicago) correctly', () => {
        // June: CDT (-5)
        // 7:00 PM local -> 12:00 AM UTC next day
        const local = '2026-06-15T19:00';
        const tz = 'America/Chicago';
        const result = zonedInputValueToUtcLocal(local, tz);
        assert.strictEqual(result, '2026-06-16T00:00:00.000Z');
    });

    test('converts Phoenix Time (No DST) correctly', () => {
        // Phoenix is always MST (-7)
        const local = '2026-06-15T19:00';
        const tz = 'America/Phoenix';
        const result = zonedInputValueToUtcLocal(local, tz);
        assert.strictEqual(result, '2026-06-16T02:00:00.000Z');
    });

    test('handles iterative refinement near DST transition (Spring Forward)', () => {
        // Spring Forward 2026: March 8 at 2:00 AM moves to 3:00 AM
        // Entering 2:30 AM local is technically "missing", but logic should converge
        const local = '2026-03-08T02:30';
        const tz = 'America/New_York';
        const result = zonedInputValueToUtcLocal(local, tz);
        
        // It should converge to either 2:30 EDT or fall back to something sensible.
        // 2:30 AM EDT is 6:30 AM UTC.
        assert.ok(result.endsWith('Z'));
        const date = new Date(result);
        assert.ok(!isNaN(date.getTime()));
    });

    test('handles iterative refinement near DST transition (Fall Back)', () => {
        // Fall Back 2026: Nov 1 at 2:00 AM moves back to 1:00 AM
        const local = '2026-11-01T01:30';
        const tz = 'America/New_York';
        const result = zonedInputValueToUtcLocal(local, tz);
        
        // 1:30 AM is repeated.
        assert.ok(result.endsWith('Z'));
    });

    test('handles non-T strings by falling back to standard Date parsing', () => {
        const local = '2026-06-15 19:00';
        const tz = 'America/New_York';
        const result = zonedInputValueToUtcLocal(local, tz);
        assert.ok(result.includes('T'));
        assert.ok(result.endsWith('.000Z'));
    });

    test('returns empty string for empty input', () => {
        assert.strictEqual(zonedInputValueToUtcLocal('', 'America/New_York'), '');
    });
});
