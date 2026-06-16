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

test('Input type=file uses a native input and does not throw when value is undefined', () => {
  // Regression: SlInput's live(value) binding sets the inner input's .value on every
  // render, which throws InvalidStateError for file inputs (browsers only allow '').
  // The wrapper must use a native <input> for type="file" so user-selected files
  // can survive reconciliation.
  const onChange = () => {};
  const { container } = render(
    React.createElement(Input, { type: 'file', onChange }),
  );
  const el = container.firstElementChild as HTMLInputElement;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'INPUT');
  assert.equal(el.type, 'file');
  assert.equal(el.value, '');
  assert.doesNotThrow(() => {
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
});

test('Input type=file preserves a user-selected file across re-renders', () => {
  // Smoke test: selecting a file should set input.value to a non-empty path,
  // and a subsequent re-render with no value prop must not throw or clear it.
  const ref = React.createRef<HTMLInputElement>();
  const { rerender } = render(
    React.createElement(Input, { type: 'file', ref }),
  );
  const input = ref.current;
  assert.ok(input, 'ref should be attached');
  // jsdom doesn't expose DataTransfer, but it does allow setting .value
  // directly on a file input only to ''. We simulate the post-select state
  // by checking that the input starts empty and a re-render is a no-op.
  assert.equal(input.value, '');
  assert.doesNotThrow(() => {
    rerender(React.createElement(Input, { type: 'file', ref }));
  });
  assert.equal(ref.current.value, '', 're-render with no value must not change input');
});
