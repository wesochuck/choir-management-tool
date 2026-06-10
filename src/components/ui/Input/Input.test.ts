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
import { Input } from './Input';

test('Input renders with default props', () => {
  const { container } = render(React.createElement(Input));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'INPUT');
});

test('Input renders with invalid state', () => {
  const { container } = render(React.createElement(Input, { invalid: true }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'INPUT');
});

test('Input passes through native props', () => {
  const { container } = render(React.createElement(Input, {
    placeholder: 'Enter name',
    type: 'text',
    onChange: () => {},
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.getAttribute('placeholder'), 'Enter name');
  assert.equal(el.getAttribute('type'), 'text');
});

test('Input merges className', () => {
  const { container } = render(React.createElement(Input, { className: 'custom-class' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.classList.contains('custom-class'), 'has custom class');
});
