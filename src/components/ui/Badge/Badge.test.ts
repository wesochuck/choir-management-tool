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
import { Badge } from './Badge';

test('Badge renders children', () => {
  const { container } = render(React.createElement(Badge, null, 'Test Label'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.textContent?.includes('Test Label'), 'includes children text');
});

test('Badge defaults to neutral tone', () => {
  const { container } = render(React.createElement(Badge, null, 'Neutral'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'SPAN');
});

test('Badge renders each tone', () => {
  const tones = ['performance', 'rehearsal', 'concert', 'success', 'danger', 'neutral'] as const;
  for (const tone of tones) {
    const { container } = render(React.createElement(Badge, { tone }, tone));
    const el = container.firstElementChild;
    assert.ok(el, `renders an element for tone "${tone}"`);
    assert.ok(el.textContent?.includes(tone), `includes "${tone}" text`);
  }
});
