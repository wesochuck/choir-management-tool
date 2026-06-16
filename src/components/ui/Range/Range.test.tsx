import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { Range } from './Range';

afterEach(() => {
  cleanup();
});

test('Range renders a native <input type="range"> in test environment', () => {
  const { container } = render(
    React.createElement(Range, { value: 5, min: 0, max: 10, step: 1 }),
  );
  const input = container.querySelector('input[type="range"]') as HTMLInputElement;
  assert.ok(input, 'renders a range input');
  assert.equal(input.value, '5');
  assert.equal(input.min, '0');
  assert.equal(input.max, '10');
  assert.equal(input.step, '1');
});

test('Range passes through id and className', () => {
  const { container } = render(
    React.createElement(Range, {
      value: 0,
      min: 0,
      max: 1,
      step: 0.1,
      id: 'volume-input',
      className: 'accent-color',
    }),
  );
  const input = container.firstElementChild as HTMLInputElement;
  assert.ok(input, 'renders an element');
  assert.equal(input.id, 'volume-input');
  assert.ok(input.classList.contains('accent-color'), 'has the passed className');
});

test('Range calls onChange and onInput with a parsed number', () => {
  let onChangeVal: number | undefined;
  let onInputVal: number | undefined;
  const { container } = render(
    React.createElement(Range, {
      value: 0,
      min: 0,
      max: 100,
      step: 1,
      onChange: (v) => { onChangeVal = v; },
      onInput: (v) => { onInputVal = v; },
    }),
  );
  const input = container.querySelector('input[type="range"]') as HTMLInputElement;
  assert.ok(input, 'renders a range input');
  // jsdom's HTMLInputElement.prototype value setter for type=range dispatches
  // 'input' and 'change' events, which is what the wrapper listens to.
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, '42');
  fireEvent.change(input);
  assert.equal(onChangeVal, 42, 'onChange receives the parsed number');
  assert.equal(onInputVal, 42, 'onInput receives the parsed number');
});
