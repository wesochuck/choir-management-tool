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
  const { container } = render(
    React.createElement(Textarea, {
      placeholder: 'Enter bio',
      rows: 4,
      onChange: () => {},
    })
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.getAttribute('placeholder'), 'Enter bio');
  assert.equal(el.getAttribute('rows'), '4');
});

test('Textarea setCustomValidity sets validation message', () => {
  const { container } = render(React.createElement(Textarea));
  const el = container.firstElementChild as HTMLTextAreaElement;
  assert.ok(el);
  el.setCustomValidity('custom error');
  assert.equal(el.validationMessage, 'custom error');
});

test('Textarea ref exposes setCustomValidity as a function (smoke test)', () => {
  const ref = React.createRef<HTMLTextAreaElement>();
  render(React.createElement(Textarea, { ref }));
  assert.ok(ref.current, 'ref should be attached');
  assert.equal(
    typeof ref.current.setCustomValidity,
    'function',
    'ref must expose setCustomValidity'
  );
  // Verify the method is callable and the call does not throw.
  assert.doesNotThrow(() => ref.current.setCustomValidity('test'));
});
