import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { Textarea } from './Textarea';

test('Textarea renders with default props', () => {
  const { container } = render(React.createElement(Textarea));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'TEXTAREA');
});

test('Textarea passes through native props', () => {
  const { container } = render(React.createElement(Textarea, {
    placeholder: 'Enter bio',
    rows: 4,
    onChange: () => {},
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.getAttribute('placeholder'), 'Enter bio');
  assert.equal(el.getAttribute('rows'), '4');
});
