// @vitest-environment jsdom
import { vi } from 'vitest';
import { describe, it } from 'node:test';
import assert from 'node:assert';

vi.mock('../../src/lib/pocketbase', () => ({
  pb: {
    authStore: {
      onChange: () => undefined,
      token: '',
      clear: () => {},
      record: null,
    },
    collection: () => ({
      getFirstListItem: async () => { throw { status: 404 }; },
      update: async () => ({}),
      create: async () => ({}),
    }),
    filter: (s: string) => s,
    files: { getURL: () => '' },
    autoCancellation: () => {},
    beforeSend: (url: string) => ({ url, options: {} }),
    afterSend: async (r: unknown) => r,
  },
  formatPocketBaseError: (err: unknown) => 'error',
}));

describe('LandingPageSettings', () => {
  describe('DEFAULT_LANDING_SETTINGS', () => {
    it('has all required fields with default values', async () => {
      const { DEFAULT_LANDING_SETTINGS } = await import('../../src/services/settingsService');
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.heroHeadline, 'Welcome to Our Choir');
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.heroSubtitle, 'Voices united in harmony.');
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.aboutUsText, '');
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.historyText, '');
      assert.strictEqual(DEFAULT_LANDING_SETTINGS.contactEmail, '');
    });

    it('has the correct keys', async () => {
      const { DEFAULT_LANDING_SETTINGS } = await import('../../src/services/settingsService');
      const keys = Object.keys(DEFAULT_LANDING_SETTINGS).sort();
      assert.deepStrictEqual(keys, [
        'aboutUsText',
        'contactEmail',
        'heroHeadline',
        'heroSubtitle',
        'historyText',
      ]);
    });
  });

  describe('type safety', () => {
    it('allows valid LandingPageSettings', async () => {
      const mod = await import('../../src/services/settingsService');
      const valid: mod.LandingPageSettings = {
        heroHeadline: 'Test',
        heroSubtitle: 'Test',
        aboutUsText: '# About',
        historyText: '# History',
        contactEmail: 'test@example.com',
      };
      assert.strictEqual(valid.contactEmail, 'test@example.com');
    });
  });
});

describe('markdown sanitization with marked + DOMPurify', () => {
  it('renders bold markdown safely', async () => {
    const { marked } = await import('marked');
    const dompurifyMod = await import('dompurify');
    const html = marked.parse('**bold text**', { async: false }) as string;
    const result = dompurifyMod.default.sanitize(html);
    assert.ok(result.includes('<strong>bold text</strong>') || result.includes('<b>bold text</b>'));
  });

  it('renders italic markdown safely', async () => {
    const { marked } = await import('marked');
    const dompurifyMod = await import('dompurify');
    const html = marked.parse('*italic text*', { async: false }) as string;
    const result = dompurifyMod.default.sanitize(html);
    assert.ok(result.includes('<em>italic text</em>') || result.includes('<i>italic text</i>'));
  });

  it('renders links safely', async () => {
    const { marked } = await import('marked');
    const dompurifyMod = await import('dompurify');
    const html = marked.parse('[Click here](https://example.com)', { async: false }) as string;
    const result = dompurifyMod.default.sanitize(html);
    assert.ok(result.includes('href="https://example.com"'));
  });

  it('strips script tags from input', async () => {
    const { marked } = await import('marked');
    const dompurifyMod = await import('dompurify');
    const html = marked.parse('<script>alert("xss")</script>', { async: false }) as string;
    const result = dompurifyMod.default.sanitize(html);
    assert.strictEqual(result.includes('<script>'), false);
  });

  it('renders headings', async () => {
    const { marked } = await import('marked');
    const dompurifyMod = await import('dompurify');
    const html = marked.parse('# Hello World', { async: false }) as string;
    const result = dompurifyMod.default.sanitize(html);
    assert.ok(result.includes('Hello World'));
  });

  it('handles empty string', async () => {
    const { marked } = await import('marked');
    const dompurifyMod = await import('dompurify');
    const html = marked.parse('', { async: false }) as string;
    const result = dompurifyMod.default.sanitize(html);
    assert.strictEqual(typeof result, 'string');
  });
});
