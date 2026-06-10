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
import { EmptyState } from './EmptyState';

test('EmptyState renders title', () => {
  const { container } = render(React.createElement(EmptyState, { title: 'No items found' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const heading = el.querySelector('h3');
  assert.ok(heading, 'renders heading');
  assert.equal(heading.textContent, 'No items found');
});

test('EmptyState renders description', () => {
  const { container } = render(React.createElement(EmptyState, { title: 'Empty', description: 'Nothing to show' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const desc = el.querySelector('p');
  assert.ok(desc, 'renders description paragraph');
  assert.equal(desc.textContent, 'Nothing to show');
});

test('EmptyState renders icon', () => {
  const icon = React.createElement('span', { 'data-testid': 'icon' }, '📭');
  const { container } = render(React.createElement(EmptyState, { title: 'Empty', icon }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const iconEl = el.querySelector('[data-testid="icon"]');
  assert.ok(iconEl, 'renders icon element');
});

test('EmptyState renders action', () => {
  const btn = React.createElement('button', null, 'Retry');
  const { container } = render(React.createElement(EmptyState, { title: 'Empty', action: btn }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const actionEl = el.querySelector('button');
  assert.ok(actionEl, 'renders action button');
  assert.equal(actionEl.textContent, 'Retry');
});

test('EmptyState does not render description when not provided', () => {
  const { container } = render(React.createElement(EmptyState, { title: 'Empty' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const desc = el.querySelector('p');
  assert.equal(desc, null, 'no description paragraph');
});
