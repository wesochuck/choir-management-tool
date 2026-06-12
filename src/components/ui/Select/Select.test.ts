import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Select } from './Select';

test('Select renders with default props', () => {
  const { container } = render(React.createElement(Select, null));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'SELECT');
});

test('Select renders with invalid state', () => {
  const { container } = render(React.createElement(Select, { invalid: true }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'SELECT');
});

test('Select passes through native props (onChange with option children)', () => {
  let value = '';
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => { value = e.target.value; };
  const options = [
    React.createElement('option', { value: 'a', key: 'a' }, 'A'),
    React.createElement('option', { value: 'b', key: 'b' }, 'B'),
  ];
  const { container } = render(React.createElement(Select, { onChange: handleChange }, ...options));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'SELECT');
  assert.equal(el.children.length, 2, 'has two option children');
  fireEvent.change(el, { target: { value: 'b' } });
  assert.equal(value, 'b', 'onChange was called with new value');
});

test('Select merges className', () => {
  const { container } = render(React.createElement(Select, { className: 'custom-class' }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.classList.contains('custom-class'), 'has custom class');
});

test('Select applies default size class', () => {
  const { container } = render(React.createElement(Select, null));
  const el = container.firstElementChild;
  assert.ok(el.classList.contains('h-[44px]'), 'default size has 44px height');
});

test('Select applies small size class', () => {
  const { container } = render(React.createElement(Select, { size: 'small' }));
  const el = container.firstElementChild;
  assert.ok(el.classList.contains('h-10'), 'small size has h-10 height');
});

test('Select applies compact size class', () => {
  const { container } = render(React.createElement(Select, { size: 'compact' }));
  const el = container.firstElementChild;
  assert.ok(el.classList.contains('h-8'), 'compact size has h-8 height');
});

test('Select visuallyHidden strips chevron background', () => {
  const { container } = render(React.createElement(Select, { visuallyHidden: true }));
  const el = container.firstElementChild as HTMLElement;
  assert.equal(el.style.backgroundImage, 'none', 'visuallyHidden removes chevron SVG');
  assert.ok(el.classList.contains('!opacity-0'), 'visuallyHidden adds opacity-0');
});
