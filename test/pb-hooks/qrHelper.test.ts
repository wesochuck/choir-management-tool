import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('qrHelper', () => {
    it('renderQrSvg produces valid SVG output', async () => {
        const { renderQrSvg } = await import('../../pocketbase/pb_hooks_src/email/qrHelper.ts');
        const result = await renderQrSvg('https://example.com/test');
        assert.ok(result.includes('<svg'), 'Should contain SVG opening tag');
        assert.ok(result.includes('</svg>'), 'Should contain SVG closing tag');
        assert.ok(result.includes('viewBox'), 'Should contain viewBox attribute');
    });
});
