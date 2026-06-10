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

import { describe, it } from 'node:test';
import { render } from '@testing-library/react';
import assert from 'node:assert/strict';
import React from 'react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders with default props', () => {
    const { container } = render(React.createElement(Spinner));
    const el = container.firstElementChild;
    assert.ok(el, 'renders an element');
    assert.equal(el.tagName, 'DIV');
    assert.equal(el.getAttribute('role'), 'status');
  });

  it('renders small size', () => {
    const { container } = render(React.createElement(Spinner, { size: 'small' }));
    const el = container.firstElementChild;
    assert.ok(el, 'renders');
    assert.equal(el.getAttribute('aria-label'), 'Loading');
  });

  it('renders large size', () => {
    const { container } = render(React.createElement(Spinner, { size: 'large' }));
    const el = container.firstElementChild;
    assert.ok(el, 'renders');
  });

  it('merges className prop', () => {
    const { container } = render(React.createElement(Spinner, { className: 'custom' }));
    const el = container.firstElementChild;
    assert.ok(el, 'renders');
    assert.ok(el.classList.contains('custom'), 'has custom class');
  });
});
