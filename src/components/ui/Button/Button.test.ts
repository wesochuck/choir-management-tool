import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
});
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Button } from './Button';

test('Button renders with default variant (primary)', () => {
  const { container } = render(React.createElement(Button, null, 'Click me'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'BUTTON');
  assert.ok(el.textContent?.includes('Click me'), 'includes children text');
});

test('Button renders secondary variant', () => {
  const { container } = render(React.createElement(Button, { variant: 'secondary' }, 'Secondary'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'BUTTON');
});

test('Button renders ghost variant', () => {
  const { container } = render(React.createElement(Button, { variant: 'ghost' }, 'Ghost'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'BUTTON');
});

test('Button renders danger variant', () => {
  const { container } = render(React.createElement(Button, { variant: 'danger' }, 'Danger'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'BUTTON');
});

test('Button renders small size', () => {
  const { container } = render(React.createElement(Button, { size: 'small' }, 'Small'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'BUTTON');
});

test('Button shows spinner when loading', () => {
  const { container } = render(React.createElement(Button, { loading: true }, 'Loading'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const spinner = el.querySelector('[role="status"]');
  assert.ok(spinner, 'renders spinner with role="status"');
  assert.ok((el as HTMLButtonElement).disabled, 'button is disabled');
});

test('Button renders icon slot', () => {
  const icon = React.createElement('span', { 'data-testid': 'icon' }, '🔔');
  const { container } = render(React.createElement(Button, { icon }, 'Notify'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const iconEl = el.querySelector('[data-testid="icon"]');
  assert.ok(iconEl, 'renders icon element');
  assert.ok(el.textContent?.includes('Notify'), 'includes children text');
});

test('Button calls onClick', () => {
  let clicked = false;
  const handleClick = () => { clicked = true; };
  const { container } = render(React.createElement(Button, { onClick: handleClick }, 'Click'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  fireEvent.click(el);
  assert.equal(clicked, true, 'onClick was called');
});

test('Button does NOT call onClick when loading', () => {
  let clicked = false;
  const handleClick = () => { clicked = true; };
  const { container } = render(React.createElement(Button, { onClick: handleClick, loading: true }, 'Click'));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  fireEvent.click(el);
  assert.equal(clicked, false, 'onClick was not called');
});
