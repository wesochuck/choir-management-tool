// @vitest-environment jsdom
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { stripHtml } from '../src/lib/textSafety';

describe('stripHtml', () => {
  test('handles null, undefined, and empty strings', () => {
    // @ts-expect-error testing defensive runtime handling
    assert.equal(stripHtml(null), '');
    // @ts-expect-error testing defensive runtime handling
    assert.equal(stripHtml(undefined), '');
    assert.equal(stripHtml(''), '');
  });

  test('returns safe string unchanged', () => {
    assert.equal(stripHtml('Hello World'), 'Hello World');
    assert.equal(stripHtml('abc 123'), 'abc 123');
  });

  test('decodes HTML entities for safe text rendering', () => {
    assert.equal(stripHtml('&amp;'), '&');
    assert.equal(stripHtml('AT&amp;T'), 'AT&T');
  });

  test('removes basic HTML tags', () => {
    assert.equal(stripHtml('<p>Hello <b>World</b></p>'), 'Hello World');
    assert.equal(stripHtml('<div>foo<span>bar</span></div>'), 'foobar');
  });

  test('removes malicious tags and attributes', () => {
    assert.equal(stripHtml('<script>alert(1)</script>'), '');
    assert.equal(stripHtml('<a href="javascript:alert(1)">click here</a>'), 'click here');
    assert.equal(stripHtml('<img src=x onerror=alert(1)>'), '');
  });

  test('uses the non-DOM fallback without returning markup', () => {
    const originalDOMParser = window.DOMParser;
    // @ts-expect-error testing environments without DOMParser
    window.DOMParser = undefined;

    try {
      assert.equal(stripHtml('<p>Hello <strong>World</strong></p>'), 'Hello World');
      assert.equal(stripHtml('<img src=x onerror=alert(1)>Visible'), 'Visible');
    } finally {
      window.DOMParser = originalDOMParser;
    }
  });
});
