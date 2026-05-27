import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeGoBytes,
  parseJsonField,
  safeDecodeCollectionBytes,
} from '../../pocketbase/pb_hooks_src/email/hookJson';

test('decodeGoBytes - string', () => {
  assert.strictEqual(decodeGoBytes('test'), 'test');
});

test('decodeGoBytes - Go byte array', () => {
  const bytes = [104, 101, 108, 108, 111];
  assert.strictEqual(decodeGoBytes(bytes), 'hello');
});

test('decodeGoBytes - JS object', () => {
  const obj = { foo: 'bar' };
  assert.deepStrictEqual(decodeGoBytes(obj), obj);
});

test('parseJsonField - valid JSON string', () => {
  assert.deepStrictEqual(parseJsonField('{"a":1}'), { a: 1 });
});

test('parseJsonField - Go byte array', () => {
  const bytes = [123, 34, 97, 34, 58, 49, 125];
  assert.deepStrictEqual(parseJsonField(bytes), { a: 1 });
});

test('parseJsonField - JS object', () => {
  const obj = { a: 1 };
  assert.deepStrictEqual(parseJsonField(obj), obj);
});

test('parseJsonField - invalid JSON', () => {
  assert.strictEqual(parseJsonField('not-json'), null);
});

test('safeDecodeCollectionBytes - invalid bytes returns fallback', () => {
  const output = safeDecodeCollectionBytes([91, 123, 50], { defaultSchema: {} });
  assert.deepStrictEqual(output, {});
});
