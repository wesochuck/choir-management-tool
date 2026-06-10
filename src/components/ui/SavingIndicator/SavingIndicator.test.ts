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
import { render } from '@testing-library/react';
import { SavingIndicator } from './SavingIndicator';

test('SavingIndicator returns null in idle state', () => {
  const { container } = render(React.createElement(SavingIndicator, { state: 'idle' }));
  assert.equal(container.firstElementChild, null);
});

test('SavingIndicator shows spinner when saving', () => {
  const { container } = render(React.createElement(SavingIndicator, { state: 'saving' }));
  const el = container.firstElementChild;
  assert.ok(el);
  const spinner = el.querySelector('[role="status"]');
  assert.ok(spinner, 'should render a Spinner with role="status"');
});

test('SavingIndicator shows checkmark when saved', () => {
  const { container } = render(React.createElement(SavingIndicator, { state: 'saved' }));
  const el = container.firstElementChild;
  assert.ok(el);
  assert.ok(el.textContent!.includes('\u2713'));
  assert.ok(el.textContent!.includes('Saved'));
});

test('SavingIndicator shows lastSavedAt when saved', () => {
  const date = new Date('2025-01-15T10:30:00');
  const { container } = render(React.createElement(SavingIndicator, { state: 'saved', lastSavedAt: date }));
  const el = container.firstElementChild;
  assert.ok(el);
  assert.ok(el.textContent!.includes(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
});

test('SavingIndicator shows error', () => {
  const { container } = render(React.createElement(SavingIndicator, { state: 'error', errorMessage: 'Network error' }));
  const el = container.firstElementChild;
  assert.ok(el);
  assert.ok(el.textContent!.includes('Network error'));
});

test('SavingIndicator calls onRetry', () => {
  let called = false;
  const { container } = render(
    React.createElement(SavingIndicator, { state: 'error', errorMessage: 'Fail', onRetry: () => { called = true; } }),
  );
  const btn = container.querySelector('button');
  assert.ok(btn);
  btn.click();
  assert.equal(called, true);
});
