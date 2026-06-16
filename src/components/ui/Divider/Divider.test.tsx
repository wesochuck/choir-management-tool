import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { Divider } from './Divider';

test('Divider renders as an <hr> in test environment', () => {
  const { container } = render(React.createElement(Divider));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'HR');
  assert.ok(el.className.includes('border-t'), 'has border-t class');
  assert.ok(el.className.includes('border-border'), 'has border-border class');
  assert.ok(el.className.includes('my-4'), 'has my-4 class');
});
