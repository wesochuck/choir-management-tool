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

test('Input setCustomValidity sets validation message', () => {
  const { container } = render(React.createElement(Input));
  const el = container.firstElementChild as HTMLInputElement;
  assert.ok(el);
  el.setCustomValidity('custom error');
  assert.equal(el.validationMessage, 'custom error');
});

test('Input ref exposes setCustomValidity as a function (smoke test)', () => {
  const ref = React.createRef<HTMLInputElement>();
  render(React.createElement(Input, { ref }));
  assert.ok(ref.current, 'ref should be attached');
  assert.equal(typeof ref.current.setCustomValidity, 'function', 'ref must expose setCustomValidity');
  // Verify the method is callable and the call does not throw.
  assert.doesNotThrow(() => ref.current.setCustomValidity('test'));
});
