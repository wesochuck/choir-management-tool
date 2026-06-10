import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
});
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Toast } from './Toast';

test('Toast renders children', () => {
  const { container } = render(React.createElement(Toast, { tone: 'info' }, 'Hello'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.textContent?.includes('Hello'), 'includes children text');
});

test('Toast renders each tone', () => {
  const tones = ['success', 'error', 'warning', 'info'] as const;
  for (const tone of tones) {
    const { container } = render(React.createElement(Toast, { tone }, tone));
    const el = container.firstElementChild;
    assert.ok(el, `renders element for tone "${tone}"`);
  }
});

test('Toast calls onDismiss on close button click', () => {
  let dismissed = false;
  const { container } = render(
    React.createElement(Toast, { tone: 'info', onDismiss: () => { dismissed = true; } }, 'Dismiss me'),
  );
  const el = container.firstElementChild;
  assert.ok(el);
  const closeButton = el.querySelector('button[aria-label="Dismiss"]');
  assert.ok(closeButton, 'close button exists');
  fireEvent.click(closeButton);
  assert.equal(dismissed, true, 'onDismiss was called');
});

test('Toast auto-dismisses after duration', async () => {
  let dismissed = false;
  render(
    React.createElement(Toast, { tone: 'info', onDismiss: () => { dismissed = true; }, duration: 10 }, 'Auto dismiss'),
  );
  await waitFor(() => assert.equal(dismissed, true), { timeout: 200 });
});

test('Toast does not auto-dismiss when duration is 0', async () => {
  let dismissed = false;
  render(
    React.createElement(Toast, { tone: 'info', onDismiss: () => { dismissed = true; }, duration: 0 }, 'No dismiss'),
  );
  // Wait a small amount of time to ensure no auto-dismiss fires
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(dismissed, false, 'should not have been dismissed');
});
