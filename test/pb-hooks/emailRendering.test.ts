import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../../pocketbase/pb_hooks_src/email/emailRendering';

test('renderMarkdown - basic formatting', () => {
    const md = '**Bold** and *Italic* with a [Link](https://google.com)';
    const html = renderMarkdown(md);
    assert.ok(html.includes('<strong>Bold</strong>'));
    assert.ok(html.includes('<em>Italic</em>'));
    assert.ok(html.includes('<a href="https://google.com"'));
});

test('renderMarkdown - lists', () => {
    const md = '* Item 1\n* Item 2';
    const html = renderMarkdown(md);
    assert.ok(html.includes('<ul'));
    assert.ok(html.includes('<li>Item 1</li>'));
    assert.ok(html.includes('<li>Item 2</li>'));
});

test('renderMarkdown - paragraphs', () => {
    const md = 'Para 1\n\nPara 2';
    const html = renderMarkdown(md);
    assert.strictEqual(html.split('<p').length - 1, 2);
});

test('renderMarkdown - link security whitelisting and escaping', () => {
    // Safe protocols should render as links
    const safeHttps = renderMarkdown('[Google](https://google.com)');
    assert.ok(safeHttps.includes('<a href="https://google.com"'));

    const safeMailto = renderMarkdown('[Mail Us](mailto:info@choir.org)');
    assert.ok(safeMailto.includes('<a href="mailto:info@choir.org"'));

    // Unsafe protocols should be stripped, rendering only the text
    const unsafeJs = renderMarkdown('[Attack](javascript:alert(1))');
    assert.ok(!unsafeJs.includes('<a href='));
    assert.ok(unsafeJs.includes('Attack'));

    const unsafeData = renderMarkdown('[Data Link](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)');
    assert.ok(!unsafeData.includes('<a href='));
    assert.ok(unsafeData.includes('Data Link'));

    // Attribute escaping
    const escapeQuotes = renderMarkdown('[Injection](https://google.com" onclick="alert(1))');
    assert.ok(escapeQuotes.includes('&quot;'));
    assert.ok(!escapeQuotes.includes('onclick="alert(1)"'));
});

