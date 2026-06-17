// @vitest-environment jsdom
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useRef, useState } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { useClickOutside } from './useClickOutside';

afterEach(() => {
  cleanup();
});

function TestComponent({
  enabled = true,
  escape = false,
}: {
  enabled?: boolean;
  escape?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [closed, setClosed] = useState(false);
  useClickOutside(ref, () => setClosed(true), { enabled, escape });
  return React.createElement(
    'div',
    { ref, 'data-testid': 'inside' },
    React.createElement('span', { 'data-testid': 'status' }, closed ? 'closed' : 'open')
  );
}

test('calls callback on mousedown outside', () => {
  render(React.createElement(TestComponent));
  fireEvent.mouseDown(document.body);
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'closed');
});

test('does not call callback on mousedown inside', () => {
  render(React.createElement(TestComponent));
  const inside = document.querySelector('[data-testid="inside"]');
  assert.ok(inside);
  fireEvent.mouseDown(inside);
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'open');
});

test('does not call callback when disabled', () => {
  render(React.createElement(TestComponent, { enabled: false }));
  fireEvent.mouseDown(document.body);
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'open');
});

test('calls callback on Escape when escape option is true', () => {
  render(React.createElement(TestComponent, { escape: true }));
  fireEvent.keyDown(document, { key: 'Escape' });
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'closed');
});

test('does not call callback on Escape when escape option is false', () => {
  render(React.createElement(TestComponent, { escape: false }));
  fireEvent.keyDown(document, { key: 'Escape' });
  const status = document.querySelector('[data-testid="status"]');
  assert.equal(status?.textContent, 'open');
});
