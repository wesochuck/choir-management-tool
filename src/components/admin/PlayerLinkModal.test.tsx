// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PlayerLinkModal } from './PlayerLinkModal';

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

describe('PlayerLinkModal', () => {
  it('renders the url, the icon, and the word Copy in a single clickable button', () => {
    const writeText = mock.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <PlayerLinkModal
        isOpen
        onClose={() => {}}
        url="https://example.com/practice/abc"
        eventTitle="Spring Concert"
      />
    );

    const copyButton = screen.getByRole('button', { name: /Copy/i });
    assert.ok(copyButton, 'renders a Copy button accessible to screen readers');

    // The icon + "Copy" text must both be inside the same button so the
    // whole control is one click target.
    assert.ok(copyButton.textContent?.includes('Copy'), 'button contains the word Copy');

    // Clicking the button (by text label) copies the URL.
    fireEvent.click(copyButton);
    assert.strictEqual(writeText.mock.callCount(), 1);
    assert.strictEqual(writeText.mock.calls[0].arguments[0], 'https://example.com/practice/abc');
  });
});
