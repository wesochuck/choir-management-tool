import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { Icon } from './Icon';

test('Icon renders as a <span> with the icon name as content in test environment', () => {
  const { container } = render(React.createElement(Icon, { name: 'key' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'SPAN');
  assert.equal(el.textContent, 'key', 'renders the icon name as text');
});

test('Icon passes through className', () => {
  const { container } = render(React.createElement(Icon, { name: 'gear', className: 'text-xs' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.classList.contains('text-xs'), 'has the passed className');
});
