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
import { ConfirmDialog } from './ConfirmDialog';

function getDialog() {
  return document.body.querySelector('[role="dialog"]');
}

test('ConfirmDialog does not render when isOpen is false', () => {
  render(React.createElement(ConfirmDialog, {
    isOpen: false,
    onClose: () => {},
    onConfirm: () => {},
    title: 'Test',
    message: 'message',
  }));
  assert.equal(getDialog(), null);
});

test('ConfirmDialog renders when isOpen is true', () => {
  render(React.createElement(ConfirmDialog, {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    title: 'Confirm Title',
    message: 'Are you sure?',
  }));
  const dialog = getDialog();
  assert.ok(dialog);
  const body = within(document.body);
  assert.ok(body.getByText('Confirm Title'));
  assert.ok(body.getByText('Are you sure?'));
});

test('ConfirmDialog calls onConfirm', () => {
  let confirmed = false;
  render(React.createElement(ConfirmDialog, {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => { confirmed = true; },
    title: 'Test',
    message: 'message',
  }));
  const confirmBtn = within(document.body).getByText('Confirm');
  assert.ok(confirmBtn);
  fireEvent.click(confirmBtn);
  assert.equal(confirmed, true);
});

test('ConfirmDialog calls onClose on cancel', () => {
  let closed = false;
  render(React.createElement(ConfirmDialog, {
    isOpen: true,
    onClose: () => { closed = true; },
    onConfirm: () => {},
    title: 'Test',
    message: 'message',
  }));
  const cancelBtn = within(document.body).getByText('Cancel');
  assert.ok(cancelBtn);
  fireEvent.click(cancelBtn);
  assert.equal(closed, true);
});

test('ConfirmDialog renders custom labels', () => {
  render(React.createElement(ConfirmDialog, {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    title: 'Test',
    message: 'message',
    confirmLabel: 'Yes, Delete',
    cancelLabel: 'No, Keep',
  }));
  const body = within(document.body);
  assert.ok(body.getByText('Yes, Delete'));
  assert.ok(body.getByText('No, Keep'));
});
