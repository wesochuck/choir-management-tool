import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, sanitizeEmailSubject, normalizeBaseUrl } from '../../pocketbase/pb_hooks_src/email/hookText';

test('escapeHtml', () => {
    assert.strictEqual(escapeHtml('<b>"test" & \'rest\'</b>'), '&lt;b&gt;&quot;test&quot; &amp; &#39;rest&#39;&lt;/b&gt;');
    assert.strictEqual(escapeHtml(''), '');
});

test('sanitizeEmailSubject', () => {
    assert.strictEqual(sanitizeEmailSubject('Line 1\r\nLine 2  '), 'Line 1 Line 2');
    assert.strictEqual(sanitizeEmailSubject(''), '');
});

test('normalizeBaseUrl', () => {
    assert.strictEqual(normalizeBaseUrl('http://localhost:5173/'), 'http://localhost:5173');
    assert.strictEqual(normalizeBaseUrl('  https://choir.app/// '), 'https://choir.app');
    assert.strictEqual(normalizeBaseUrl(''), 'http://localhost:5173');
    assert.strictEqual(normalizeBaseUrl(undefined), 'http://localhost:5173');
});
