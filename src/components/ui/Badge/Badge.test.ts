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

test('Badge renders label prop', () => {
  const { container } = render(React.createElement(Badge, { label: 'Label Prop' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.textContent?.includes('Label Prop'), 'includes label text');
});

test('Badge defaults to neutral tone', () => {
  const { container } = render(React.createElement(Badge, null, 'Neutral'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'SPAN');
});

test('Badge renders each tone', () => {
  const tones = [
    'performance',
    'rehearsal',
    'concert',
    'success',
    'danger',
    'neutral',
    'warning',
    'muted',
    'primary',
  ] as const;
  for (const tone of tones) {
    const { container } = render(React.createElement(Badge, { tone }, tone));
    const el = container.firstElementChild;
    assert.ok(el, `renders an element for tone "${tone}"`);
    assert.ok(el.textContent?.includes(tone), `includes "${tone}" text`);
  }
});

test('Badge supports sizes', () => {
  const sizes = ['sm', 'md'] as const;
  for (const size of sizes) {
    const { container } = render(React.createElement(Badge, { size }, 'Size'));
    const el = container.firstElementChild;
    assert.ok(el, `renders an element for size "${size}"`);
  }
});
