import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { Checkbox } from './Checkbox';

test('Checkbox renders label wrapper and input', () => {
  const { container } = render(React.createElement(Checkbox, { name: 'test-check' }, 'Check Label'));
  const label = container.firstElementChild;
  assert.ok(label, 'renders label element');
  assert.equal(label.tagName, 'LABEL');
  
  const input = label.querySelector('input');
  assert.ok(input, 'renders input element inside label');
  assert.equal(input.type, 'checkbox');
  assert.equal(input.name, 'test-check');
  assert.equal(label.textContent, 'Check Label');
});
