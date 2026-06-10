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
import { render } from '@testing-library/react';

const { MarkdownEditor } = await import('./MarkdownEditor');

test('MarkdownEditor renders a container element', () => {
  const { container } = render(React.createElement(MarkdownEditor, {
    value: '',
    onChange: () => {},
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders a container element');
});

test('MarkdownEditor passes className', () => {
  const { container } = render(React.createElement(MarkdownEditor, {
    value: '',
    onChange: () => {},
    className: 'custom-class',
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.classList.contains('custom-class'), 'has custom class');
});

test('MarkdownEditor passes placeholder', () => {
  const { container } = render(React.createElement(MarkdownEditor, {
    value: '',
    onChange: () => {},
    placeholder: 'Write markdown...',
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders with placeholder');
});

test('MarkdownEditor passes minHeight', () => {
  const { container } = render(React.createElement(MarkdownEditor, {
    value: '',
    onChange: () => {},
    minHeight: '300px',
  }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders with minHeight');
});
