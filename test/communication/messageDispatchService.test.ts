import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeSmsBody } from '../../src/services/communication/messageDispatchService.ts';

test('encodeSmsBody', async (t) => {
  await t.test('url-encodes a normal string', () => {
    const input = 'Hello world!';
    const result = encodeSmsBody(input);
    assert.equal(result, 'Hello%20world!');
  });

  await t.test('truncates strings longer than 1500 characters', () => {
    const input = 'a'.repeat(2000);
    const result = encodeSmsBody(input);
    assert.equal(result.length, 1500); // Because 'a' encodes to 'a'
    assert.equal(result, 'a'.repeat(1500));
  });

  await t.test('truncates before url-encoding', () => {
    // If we encode first, a 1500 char string full of spaces becomes 4500 chars.
    // We want to slice the raw string first, then encode.
    // So 1500 spaces should become 1500 * 3 = 4500 characters of '%20'.
    const input = ' '.repeat(2000);
    const result = encodeSmsBody(input);
    assert.equal(result, '%20'.repeat(1500));
    assert.equal(result.length, 1500 * 3);
  });

  await t.test('handles empty strings', () => {
    const input = '';
    const result = encodeSmsBody(input);
    assert.equal(result, '');
  });

  await t.test('properly encodes special characters', () => {
    const input = 'Hello & welcome\nLine 2! 🚀';
    const result = encodeSmsBody(input);
    assert.equal(result, encodeURIComponent(input));
    // Verify specific parts are encoded
    assert.ok(result.includes('%26')); // &
    assert.ok(result.includes('%0A')); // \n
  });
});
