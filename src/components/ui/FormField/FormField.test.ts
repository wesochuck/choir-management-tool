import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { FormField } from './FormField';
import { Input } from '../Input/Input';

test('FormField renders label and children', () => {
  const { container } = render(
    React.createElement(FormField, { label: 'Name' },
      React.createElement('input')
    )
  );
  const label = container.querySelector('label');
  assert.ok(label, 'renders a label');
  assert.ok(label.textContent.includes('Name'), 'label contains text');
  const input = container.querySelector('input');
  assert.ok(input, 'renders child input');
});

test('FormField renders required asterisk', () => {
  const { container } = render(
    React.createElement(FormField, { label: 'Name', required: true },
      React.createElement('input')
    )
  );
  assert.ok(container.textContent.includes('*'), 'renders asterisk');
});

test('FormField renders error message', () => {
  const { container } = render(
    React.createElement(FormField, { label: 'Name', error: 'This field is required' },
      React.createElement('input')
    )
  );
  const alert = container.querySelector('[role="alert"]');
  assert.ok(alert, 'renders alert element');
  assert.ok(alert.textContent.includes('This field is required'), 'alert contains error message');
});

test('FormField renders helpText', () => {
  const { container } = render(
    React.createElement(FormField, { label: 'Name', helpText: 'Enter your full name' },
      React.createElement('input')
    )
  );
  assert.ok(container.textContent.includes('Enter your full name'), 'help text is rendered');
});

test('FormField injects invalid into library Input child', () => {
  const { container } = render(
    React.createElement(FormField, { label: 'Name', error: 'Required' },
      React.createElement(Input)
    )
  );
  const input = container.querySelector('input');
  assert.ok(input, 'renders an input element');
  assert.ok(input.classList.contains('border-danger-text'), 'input has invalid class');
});
