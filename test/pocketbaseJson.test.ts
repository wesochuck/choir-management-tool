import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeGoBytes, parseJsonField } from '../src/lib/pocketbaseJson.ts';

describe('PocketBase JSON Parsing Helpers', () => {
  describe('decodeGoBytes', () => {
    it('returns empty string for null/undefined', () => {
      assert.strictEqual(decodeGoBytes(null), '');
      assert.strictEqual(decodeGoBytes(undefined), '');
    });

    it('returns string as-is', () => {
      assert.strictEqual(decodeGoBytes('hello'), 'hello');
    });

    it('decodes numeric byte array', () => {
      const input = [72, 101, 108, 108, 111]; // "Hello"
      assert.strictEqual(decodeGoBytes(input), 'Hello');
    });

    it('returns empty string for non-numeric arrays', () => {
      assert.strictEqual(decodeGoBytes(['a', 'b']), '');
    });

    it('handles empty array', () => {
      assert.strictEqual(decodeGoBytes([]), '');
    });

    it('returns empty string when conversion throws', () => {
      assert.strictEqual(decodeGoBytes([1, Symbol()]), '');
    });
  });

  describe('parseJsonField', () => {
    it('returns null for null/undefined', () => {
      assert.strictEqual(parseJsonField(null), null);
      assert.strictEqual(parseJsonField(undefined), null);
    });

    it('returns object input as-is', () => {
      const obj = { foo: 'bar' };
      assert.deepStrictEqual(parseJsonField(obj), obj);
    });

    it('parses JSON string input', () => {
      const json = '{"foo":"bar"}';
      assert.deepStrictEqual(parseJsonField(json), { foo: 'bar' });
    });

    it('decodes and parses byte array input', () => {
      const obj = { key: 'value' };
      const bytes = Array.from(JSON.stringify(obj)).map(c => c.charCodeAt(0));
      assert.deepStrictEqual(parseJsonField(bytes), obj);
    });

    it('returns null for invalid JSON string', () => {
      assert.strictEqual(parseJsonField('{invalid}'), null);
    });

    it('returns null for parse error on badly formed string', () => {
      // Explicitly verifies the catch block returning null
      assert.strictEqual(parseJsonField('bad json string'), null);
    });

    it('returns array as-is if it cannot be decoded as string (fallback for standard lists)', () => {
      const list = ['a', 'b'];
      assert.deepStrictEqual(parseJsonField(list), list);
    });

    it('returns null for malformed byte array that decodes to invalid JSON', () => {
      const malformedBytes = [123, 45, 67]; // "{ - C"
      assert.strictEqual(parseJsonField(malformedBytes), null);
    });

    it('returns null for non-string, non-object, non-array inputs', () => {
      assert.strictEqual(parseJsonField(123), null);
      assert.strictEqual(parseJsonField(true), null);
    });
  });
});
