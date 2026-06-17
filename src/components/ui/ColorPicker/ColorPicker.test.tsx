import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ColorPicker } from './ColorPicker';

afterEach(() => {
  cleanup();
});

test('ColorPicker renders a native <input type="color"> in test environment', () => {
  const { container } = render(
    React.createElement(ColorPicker, { value: '#ff0000', onChange: () => {} })
  );
  const input = container.querySelector('input[type="color"]') as HTMLInputElement;
  assert.ok(input, 'renders a color input');
  assert.equal(input.value.toLowerCase(), '#ff0000', 'has the value prop');
});

test('ColorPicker passes through className', () => {
  const { container } = render(
    React.createElement(ColorPicker, {
      value: '#000000',
      onChange: () => {},
      className: 'extra-class',
    })
  );
  const input = container.firstElementChild as HTMLElement;
  assert.ok(input, 'renders an element');
  assert.ok(input.classList.contains('extra-class'), 'has the passed className');
});

test('ColorPicker calls onChange when the input value changes', () => {
  let captured: string | undefined;
  const handleChange = (val: string) => {
    captured = val;
  };
  const { container } = render(
    React.createElement(ColorPicker, { value: '#000000', onChange: handleChange })
  );
  const input = container.querySelector('input[type="color"]') as HTMLInputElement;
  assert.ok(input, 'renders a color input');
  // Use the prototype's value setter so the change event fires correctly under jsdom
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, '#abcdef');
  fireEvent.change(input);
  assert.equal(captured, '#abcdef', 'onChange is called with the new value');
});
