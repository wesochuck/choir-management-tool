import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, sanitizeEmailSubject, normalizeBaseUrl, getTimezoneOffsetInfo } from '../../pocketbase/pb_hooks_src/email/hookText';

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

test('getTimezoneOffsetInfo covers configured common timezone choices', () => {
    const summer = new Date('2026-05-30T14:00:00Z');
    const winter = new Date('2026-12-30T15:00:00Z');

    assert.deepStrictEqual(getTimezoneOffsetInfo(summer, 'America/New_York'), { offsetMinutes: -240, abbreviation: 'EDT' });
    assert.deepStrictEqual(getTimezoneOffsetInfo(winter, 'America/New_York'), { offsetMinutes: -300, abbreviation: 'EST' });
    assert.deepStrictEqual(getTimezoneOffsetInfo(summer, 'America/Anchorage'), { offsetMinutes: -480, abbreviation: 'AKDT' });
    assert.deepStrictEqual(getTimezoneOffsetInfo(summer, 'Pacific/Honolulu'), { offsetMinutes: -600, abbreviation: 'HST' });
    assert.deepStrictEqual(getTimezoneOffsetInfo(summer, 'Europe/London'), { offsetMinutes: 60, abbreviation: 'BST' });
    assert.deepStrictEqual(getTimezoneOffsetInfo(summer, 'Europe/Paris'), { offsetMinutes: 120, abbreviation: 'CEST' });
    assert.deepStrictEqual(getTimezoneOffsetInfo(summer, 'Asia/Tokyo'), { offsetMinutes: 540, abbreviation: 'JST' });
    assert.deepStrictEqual(getTimezoneOffsetInfo(winter, 'Australia/Sydney'), { offsetMinutes: 660, abbreviation: 'AEDT' });
});
