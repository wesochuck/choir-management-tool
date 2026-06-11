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

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, within, cleanup } from '@testing-library/react';
import { Modal, type ModalProps } from './Modal';
import { DialogProvider } from '../../../contexts/DialogContext';

function getDialog() {
  return document.body.querySelector('[role="dialog"]');
}

function renderModal(
  props: ModalProps,
  children: React.ReactNode = React.createElement('p', null, 'content')
) {
  return render(
    React.createElement(DialogProvider, null,
      React.createElement(Modal, props, children)
    )
  );
}

afterEach(() => {
  cleanup();
});

test('Modal does not render when isOpen is false', () => {
  renderModal({ isOpen: false, onClose: () => {} });
  assert.equal(getDialog(), null);
});

test('Modal renders when isOpen is true', () => {
  renderModal({ isOpen: true, onClose: () => {}, title: 'Test Title' },
    React.createElement('p', null, 'body content')
  );
  const dialog = getDialog();
  assert.ok(dialog);
  const body = within(document.body);
  assert.ok(body.getByText('Test Title'));
  assert.ok(body.getByText('body content'));
});

test('Modal renders footer', () => {
  const footerEl = React.createElement('button', null, 'Save');
  renderModal({ isOpen: true, onClose: () => {}, footer: footerEl });
  assert.ok(within(document.body).getByText('Save'));
});

test('Modal calls onClose on Escape key', () => {
  let called = false;
  const onClose = () => { called = true; };
  renderModal({ isOpen: true, onClose });
  fireEvent.keyDown(document, { key: 'Escape' });
  assert.equal(called, true);
});

test('Modal has aria-modal and role dialog', () => {
  renderModal({ isOpen: true, onClose: () => {} });
  const dialog = getDialog();
  assert.ok(dialog);
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.equal(dialog.getAttribute('role'), 'dialog');
});

test('Modal with isDirty does not close on Escape immediately but prompts confirmation', async () => {
  let onCloseCalled = false;
  const onClose = () => { onCloseCalled = true; };
  
  renderModal({ isOpen: true, onClose, isDirty: true });
  
  // Trigger Escape
  fireEvent.keyDown(document, { key: 'Escape' });
  await Promise.resolve();
  assert.equal(onCloseCalled, false); // should not close yet
  
  const body = within(document.body);
  const discardBtn = body.getByText('Discard Changes');
  assert.ok(discardBtn);
  
  // Click Cancel ("Keep Editing")
  const cancelBtn = body.getByText('Keep Editing');
  fireEvent.click(cancelBtn);
  await Promise.resolve();
  assert.equal(onCloseCalled, false); // should still be open
  
  // Trigger Escape again
  fireEvent.keyDown(document, { key: 'Escape' });
  await Promise.resolve();
  
  // Click "Discard Changes"
  fireEvent.click(body.getByText('Discard Changes'));
  
  // Wait for the async close function to run
  await new Promise(r => setTimeout(r, 15));
  assert.equal(onCloseCalled, true); // should now be closed
});

test('Modal with isDirty does not close on outside click immediately but prompts confirmation', async () => {
  let onCloseCalled = false;
  const onClose = () => { onCloseCalled = true; };
  
  renderModal({ isOpen: true, onClose, isDirty: true });
  
  // Overlay click is triggered on overlay element.
  const overlay = document.body.querySelector('.fixed.inset-0');
  assert.ok(overlay);
  
  // Click overlay
  fireEvent.mouseDown(overlay!);
  await Promise.resolve();
  assert.equal(onCloseCalled, false);
  
  const body = within(document.body);
  const cancelBtn = body.getByText('Keep Editing');
  fireEvent.click(cancelBtn);
  await Promise.resolve();
  
  // Click overlay again
  fireEvent.mouseDown(overlay!);
  await Promise.resolve();
  
  // Click Discard
  fireEvent.click(body.getByText('Discard Changes'));
  await new Promise(r => setTimeout(r, 15));
  assert.equal(onCloseCalled, true);
});
