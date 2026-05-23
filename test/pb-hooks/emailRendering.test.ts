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
