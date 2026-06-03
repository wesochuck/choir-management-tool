import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { parsePocketBaseDate } from '../../pocketbase/pb_hooks_src/rsvpValidation.ts';

describe('parsePocketBaseDate', () => {
    test('parses 2026-06-03 19:00:00.000Z (space separator, Z suffix)', () => {
        const parsed = parsePocketBaseDate('2026-06-03 19:00:00.000Z');
        assert.ok(parsed instanceof Date);
        assert.strictEqual(parsed.toISOString(), '2026-06-03T19:00:00.000Z');
    });

    test('parses 2026-06-03 19:00:00 (space separator, no timezone suffix -> falls back to UTC)', () => {
        const parsed = parsePocketBaseDate('2026-06-03 19:00:00');
        assert.ok(parsed instanceof Date);
        assert.strictEqual(parsed.toISOString(), '2026-06-03T19:00:00.000Z');
    });

    test('parses 2026-06-03T19:00:00Z (ISO-8601 string)', () => {
        const parsed = parsePocketBaseDate('2026-06-03T19:00:00Z');
        assert.ok(parsed instanceof Date);
        assert.strictEqual(parsed.toISOString(), '2026-06-03T19:00:00.000Z');
    });

    test('returns null for invalid-date', () => {
        const parsed = parsePocketBaseDate('invalid-date');
        assert.strictEqual(parsed, null);
    });

    test('returns null for empty or nullish inputs', () => {
        assert.strictEqual(parsePocketBaseDate(''), null);
        assert.strictEqual(parsePocketBaseDate(null), null);
        assert.strictEqual(parsePocketBaseDate(undefined), null);
    });
});
