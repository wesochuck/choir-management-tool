import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { RadioGroup, Radio } from './RadioGroup';

test('RadioGroup renders children inside a wrapper in test environment', () => {
  const { container } = render(
    React.createElement(
      RadioGroup,
      { value: 'a', onChange: () => {} },
      React.createElement(Radio, { value: 'a' }, 'Option A'),
      React.createElement(Radio, { value: 'b' }, 'Option B')
    )
  );
  const wrapper = container.firstElementChild;
  assert.ok(wrapper, 'renders a wrapper');
  assert.equal(wrapper.tagName, 'DIV');
  const radios = wrapper.querySelectorAll('input[type="radio"]');
  assert.equal(radios.length, 2, 'renders the two radio inputs');
  assert.equal((radios[0] as HTMLInputElement).value, 'a');
  assert.equal((radios[1] as HTMLInputElement).value, 'b');
});

test('RadioGroup passes className to the wrapper', () => {
  const { container } = render(
    React.createElement(
      RadioGroup,
      { value: 'a', onChange: () => {}, className: 'flex gap-2' },
      React.createElement(Radio, { value: 'a' }, 'A')
    )
  );
  const wrapper = container.firstElementChild;
  assert.ok(wrapper, 'renders a wrapper');
  assert.ok(wrapper.classList.contains('flex'), 'has the passed className');
});

test('Radio renders an <input type="radio"> with the value attribute', () => {
  const { container } = render(React.createElement(Radio, { value: 'yes' }, 'Yes'));
  const input = container.querySelector('input[type="radio"]') as HTMLInputElement;
  assert.ok(input, 'renders a radio input');
  assert.equal(input.value, 'yes');
  assert.ok(container.firstElementChild?.textContent?.includes('Yes'), 'includes children text');
});
