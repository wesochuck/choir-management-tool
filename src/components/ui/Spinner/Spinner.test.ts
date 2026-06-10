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
import { Spinner } from './Spinner';

test('Spinner renders with default size (medium)', () => {
  const { container } = render(React.createElement(Spinner));
  const div = container.firstChild as HTMLElement;
  assert.equal(div.tagName, 'DIV');
  assert.equal(div.getAttribute('role'), 'status');
  assert.equal(div.getAttribute('aria-label'), 'Loading');
});

test('Spinner renders small size', () => {
  const { container } = render(React.createElement(Spinner, { size: 'small' }));
  const div = container.firstChild as HTMLElement;
  assert.equal(div.tagName, 'DIV');
  assert.equal(div.getAttribute('role'), 'status');
  assert.equal(div.getAttribute('aria-label'), 'Loading');
});

test('Spinner renders large size', () => {
  const { container } = render(React.createElement(Spinner, { size: 'large' }));
  const div = container.firstChild as HTMLElement;
  assert.equal(div.tagName, 'DIV');
  assert.equal(div.getAttribute('role'), 'status');
  assert.equal(div.getAttribute('aria-label'), 'Loading');
});

test('Spinner merges className prop', () => {
  const { container } = render(React.createElement(Spinner, { className: 'custom-class' }));
  const div = container.firstChild as HTMLElement;
  assert.ok(div.className.includes('custom-class'));
});
