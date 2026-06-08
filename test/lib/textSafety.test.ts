import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeEmailSubject } from '../../src/lib/textSafety';

test('sanitizeEmailSubject returns empty string for null or undefined', () => {
    assert.strictEqual(sanitizeEmailSubject(null), '');
    assert.strictEqual(sanitizeEmailSubject(undefined), '');
});

test('sanitizeEmailSubject returns regular strings unchanged', () => {
    assert.strictEqual(sanitizeEmailSubject('Hello World'), 'Hello World');
    assert.strictEqual(sanitizeEmailSubject('A normal subject line'), 'A normal subject line');
});

test('sanitizeEmailSubject replaces newlines with spaces', () => {
    assert.strictEqual(sanitizeEmailSubject('Line 1\nLine 2'), 'Line 1 Line 2');
    assert.strictEqual(sanitizeEmailSubject('Line 1\rLine 2'), 'Line 1 Line 2');
    assert.strictEqual(sanitizeEmailSubject('Line 1\r\nLine 2'), 'Line 1 Line 2');
});

test('sanitizeEmailSubject collapses multiple contiguous newlines into a single space', () => {
    assert.strictEqual(sanitizeEmailSubject('Line 1\n\nLine 2'), 'Line 1 Line 2');
    assert.strictEqual(sanitizeEmailSubject('Line 1\r\n\r\nLine 2'), 'Line 1 Line 2');
    assert.strictEqual(sanitizeEmailSubject('Line 1\r\n\n\rLine 2'), 'Line 1 Line 2');
});

test('sanitizeEmailSubject trims leading and trailing spaces and newlines', () => {
    assert.strictEqual(sanitizeEmailSubject('  Hello World  '), 'Hello World');
    assert.strictEqual(sanitizeEmailSubject('\nHello World\n'), 'Hello World');
    assert.strictEqual(sanitizeEmailSubject(' \r\n Hello World \n '), 'Hello World');
});

test('sanitizeEmailSubject converts non-string inputs to strings', () => {
    assert.strictEqual(sanitizeEmailSubject(123), '123');
    assert.strictEqual(sanitizeEmailSubject(true), 'true');
    assert.strictEqual(sanitizeEmailSubject(false), 'false');
    assert.strictEqual(sanitizeEmailSubject({}), '[object Object]');
});
