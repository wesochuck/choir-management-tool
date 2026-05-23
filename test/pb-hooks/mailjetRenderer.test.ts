import test from 'node:test';
import assert from 'node:assert/strict';
import { compileMailjetHtml } from '../../pocketbase/pb_hooks_src/email/mailjetRenderer';

test('compileMailjetHtml structures valid responsive layout', () => {
    const content = '<p>Hello world</p>';
    const address = '456 Sing Way';
    const unsub = 'https://choir.app/unsubscribe?token=abc';

    const html = compileMailjetHtml(content, address, unsub);
    
    assert.ok(html.includes('<!DOCTYPE html>'), 'Should have DOCTYPE');
    assert.ok(html.includes(content), 'Should include the body content');
    assert.ok(html.includes(address), 'Should include the mailing address');
    assert.ok(html.includes(unsub), 'Should include the unsubscribe URL');
    assert.ok(html.includes('#4a7c59'), 'Should use green branding color');
});
