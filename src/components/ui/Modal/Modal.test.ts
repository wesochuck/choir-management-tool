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
import { render, fireEvent, within } from '@testing-library/react';
import { Modal } from './Modal';

function getDialog() {
  return document.body.querySelector('[role="dialog"]');
}

test('Modal does not render when isOpen is false', () => {
  render(React.createElement(Modal, { isOpen: false, onClose: () => {} },
    React.createElement('p', null, 'content')
  ));
  assert.equal(getDialog(), null);
});

test('Modal renders when isOpen is true', () => {
  render(React.createElement(Modal, { isOpen: true, onClose: () => {}, title: 'Test Title' },
    React.createElement('p', null, 'body content')
  ));
  const dialog = getDialog();
  assert.ok(dialog);
  const body = within(document.body);
  assert.ok(body.getByText('Test Title'));
  assert.ok(body.getByText('body content'));
});

test('Modal renders footer', () => {
  const footerEl = React.createElement('button', null, 'Save');
  render(React.createElement(Modal, { isOpen: true, onClose: () => {}, footer: footerEl },
    React.createElement('p', null, 'content')
  ));
  assert.ok(within(document.body).getByText('Save'));
});

test('Modal calls onClose on Escape key', () => {
  let called = false;
  const onClose = () => { called = true; };
  render(React.createElement(Modal, { isOpen: true, onClose },
    React.createElement('p', null, 'content')
  ));
  fireEvent.keyDown(document, { key: 'Escape' });
  assert.equal(called, true);
});

test('Modal has aria-modal and role dialog', () => {
  render(React.createElement(Modal, { isOpen: true, onClose: () => {} },
    React.createElement('p', null, 'content')
  ));
  const dialog = getDialog();
  assert.ok(dialog);
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.equal(dialog.getAttribute('role'), 'dialog');
});
