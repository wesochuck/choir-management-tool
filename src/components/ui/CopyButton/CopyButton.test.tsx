import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { CopyButton } from './CopyButton';

afterEach(() => {
  cleanup();
});

test('CopyButton renders a <button type="button"> in test environment', () => {
  const { container } = render(
    React.createElement(CopyButton, { value: 'https://example.com' }, 'Copy Link'),
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'BUTTON');
  assert.equal(el.getAttribute('type'), 'button');
  assert.ok(el.textContent?.includes('Copy Link'), 'includes children text');
});

test('CopyButton is disabled when disabled prop is true', () => {
  const { container } = render(
    React.createElement(CopyButton, { value: 'x', disabled: true }, 'Copy'),
  );
  const el = container.firstElementChild as HTMLButtonElement;
  assert.ok(el, 'renders an element');
  assert.equal(el.disabled, true);
});

test('CopyButton writes its value to the clipboard on click', () => {
  let captured: string | undefined;
  const fakeClipboard = {
    writeText: async (text: string) => { captured = text; },
  };
  Object.defineProperty(navigator, 'clipboard', {
    value: fakeClipboard,
    writable: true,
    configurable: true,
  });

  const { container } = render(
    React.createElement(CopyButton, { value: 'https://choir.test/x' }, 'Copy'),
  );
  const el = container.firstElementChild as HTMLButtonElement;
  assert.ok(el, 'renders an element');
  fireEvent.click(el);
  // The click handler is synchronous and invokes clipboard.writeText with the value
  // prop. The promise it returns is intentionally not awaited by the handler.
  assert.equal(captured, 'https://choir.test/x', 'clipboard.writeText called with the value prop');
});
