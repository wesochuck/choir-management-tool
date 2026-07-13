// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, render, screen } from '@testing-library/react';
import { LivePreview } from '../../src/components/LivePreview';

afterEach(() => cleanup());

describe('LivePreview', () => {
  it('defaults to Mobile when matches is true for max-width: 767px', () => {
    window.matchMedia = mock.fn((query: string) => ({
      matches: query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addListener: mock.fn(),
      removeListener: mock.fn(),
      addEventListener: mock.fn(),
      removeEventListener: mock.fn(),
      dispatchEvent: mock.fn(),
    })) as unknown as typeof window.matchMedia;

    render(
      <LivePreview channel="Email" subject="Test Subject" bodyHtml="<p>Test Body</p>" smsBody="" />
    );

    const mobileBtn = screen.getByRole('button', { name: /Mobile/i });
    const desktopBtn = screen.getByRole('button', { name: /Desktop/i });

    // Assert mobile is selected (bg-primary-light variant in test mode) and desktop is outline
    assert.ok(mobileBtn.className.includes('bg-primary-light'));
    assert.ok(desktopBtn.className.includes('border-border'));
  });
});
