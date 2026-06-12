import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { Spinner } from './Spinner';

test('Spinner renders with default size (medium)', () => {
  const { container } = render(React.createElement(Spinner));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'DIV');
  assert.equal(el.getAttribute('role'), 'status');
  assert.equal(el.getAttribute('aria-label'), 'Loading');
});

test('Spinner renders small size', () => {
  const { container } = render(React.createElement(Spinner, { size: 'small' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.getAttribute('role'), 'status');
  assert.equal(el.getAttribute('aria-label'), 'Loading');
});

test('Spinner renders large size', () => {
  const { container } = render(React.createElement(Spinner, { size: 'large' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.getAttribute('role'), 'status');
  assert.equal(el.getAttribute('aria-label'), 'Loading');
});

test('Spinner merges className prop', () => {
  const { container } = render(React.createElement(Spinner, { className: 'custom-class' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.classList.contains('custom-class'), 'has custom class');
});
