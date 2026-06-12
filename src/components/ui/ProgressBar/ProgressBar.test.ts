import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

test('ProgressBar renders with correct aria attributes', () => {
  const { container } = render(React.createElement(ProgressBar, { value: 75 }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.getAttribute('role'), 'progressbar');
  assert.equal(el.getAttribute('aria-valuenow'), '75');
  assert.equal(el.getAttribute('aria-valuemin'), '0');
  assert.equal(el.getAttribute('aria-valuemax'), '100');
});

test('ProgressBar renders fill at correct width', () => {
  const { container } = render(React.createElement(ProgressBar, { value: 60 }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const fill = el.firstElementChild;
  assert.ok(fill, 'renders fill element');
  assert.equal((el as HTMLElement).style.width, '');
  assert.equal((fill as HTMLElement).style.width, '60%');
});

test('ProgressBar renders label', () => {
  const { container } = render(React.createElement(ProgressBar, { value: 50, label: 'Loading progress' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.getAttribute('aria-label'), 'Loading progress');
});

test('ProgressBar clamps value to 0-100', () => {
  const { container } = render(React.createElement(ProgressBar, { value: 150 }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const fill = el.firstElementChild;
  assert.ok(fill, 'renders fill element');
  assert.equal((fill as HTMLElement).style.width, '100%');
});

test('ProgressBar merges className', () => {
  const { container } = render(React.createElement(ProgressBar, { value: 50, className: 'custom-class' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.classList.contains('custom-class'), 'has custom class');
});
