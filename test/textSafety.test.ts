import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/lib/textSafety.ts';

describe('escapeHtml', () => {
  test('handles null, undefined, and empty strings', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(''), '');
  });

  test('returns safe string unchanged', () => {
    assert.equal(escapeHtml('Hello World'), 'Hello World');
    assert.equal(escapeHtml('abc 123'), 'abc 123');
  });

  test('escapes HTML entities', () => {
    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml('<'), '&lt;');
    assert.equal(escapeHtml('>'), '&gt;');
    assert.equal(escapeHtml('"'), '&quot;');
    assert.equal(escapeHtml("'"), '&#39;');

    assert.equal(
      escapeHtml('<script>alert("XSS & fun\'s")</script>'),
      '&lt;script&gt;alert(&quot;XSS &amp; fun&#39;s&quot;)&lt;/script&gt;'
    );
  });

  test('works with numbers and booleans correctly', () => {
    assert.equal(escapeHtml(0), '0');
    assert.equal(escapeHtml(123), '123');
    assert.equal(escapeHtml(true), 'true');
    assert.equal(escapeHtml(false), 'false');
  });
});
