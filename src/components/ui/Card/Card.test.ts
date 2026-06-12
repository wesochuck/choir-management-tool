import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { Card } from './Card';

test('Card renders children', () => {
  const { container } = render(React.createElement(Card, null, 'Hello'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.textContent?.includes('Hello'), 'includes children text');
});

test('Card renders title', () => {
  const { container } = render(React.createElement(Card, { title: 'My Title' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.textContent?.includes('My Title'), 'includes title text');
});

test('Card renders actions', () => {
  const action = React.createElement('button', null, 'Action');
  const { container } = render(React.createElement(Card, { actions: action }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const actionEl = el.querySelector('button');
  assert.ok(actionEl, 'renders action element');
  assert.equal(actionEl.textContent, 'Action');
});

test('Card renders without title or actions (no header)', () => {
  const { container } = render(React.createElement(Card, null, 'Just content'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.children.length, 0, 'no header when no title or actions');
});

test('Card applies noPadding', () => {
  const { container } = render(React.createElement(Card, { noPadding: true }, 'Content'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.textContent?.includes('Content'), 'renders content with noPadding');
});

test('Card merges className', () => {
  const { container } = render(React.createElement(Card, { className: 'custom-class' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.classList.contains('custom-class'), 'merges custom class');
});
