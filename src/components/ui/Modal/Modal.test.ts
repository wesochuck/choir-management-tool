// Suppress React 19 dev-mode attachEvent polyfill error in JSDOM
Object.defineProperty(Element.prototype, 'attachEvent', {
  value: () => {},
  writable: true,
  configurable: true,
});

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, within, cleanup } from '@testing-library/react';
import { Modal, type ModalProps } from './Modal';
import { DialogProvider } from '../../../contexts/DialogProvider';

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

test('Ctrl+Enter submits a form with a submit button', () => {
  let submitted = false;
  const form = React.createElement('form', { onSubmit: (e: React.FormEvent) => { e.preventDefault(); submitted = true; } },
    React.createElement('button', { type: 'submit' }, 'Submit')
  );
  renderModal({ isOpen: true, onClose: () => {} }, form);
  fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
  assert.equal(submitted, true);
});

test('Cmd+Enter submits a form with a submit button', () => {
  let submitted = false;
  const form = React.createElement('form', { onSubmit: (e: React.FormEvent) => { e.preventDefault(); submitted = true; } },
    React.createElement('button', { type: 'submit' }, 'Submit')
  );
  renderModal({ isOpen: true, onClose: () => {} }, form);
  fireEvent.keyDown(document, { key: 'Enter', metaKey: true });
  assert.equal(submitted, true);
});

test('Ctrl+Enter falls back to form submit when no submit button exists', () => {
  let submitted = false;
  const form = React.createElement('form', { onSubmit: (e: React.FormEvent) => { e.preventDefault(); submitted = true; } },
    React.createElement('input', { type: 'text' })
  );
  renderModal({ isOpen: true, onClose: () => {} }, form);
  fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
  assert.equal(submitted, true);
});

test('Ctrl+Enter does nothing when there is no form', () => {
  let onCloseCalled = false;
  renderModal({ isOpen: true, onClose: () => { onCloseCalled = true; } });
  fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
  assert.equal(onCloseCalled, false);
});

test('Plain Enter without Ctrl/Cmd does not trigger submission', () => {
  let submitted = false;
  const form = React.createElement('form', { onSubmit: (e: React.FormEvent) => { e.preventDefault(); submitted = true; } },
    React.createElement('button', { type: 'submit' }, 'Submit')
  );
  renderModal({ isOpen: true, onClose: () => {} }, form);
  fireEvent.keyDown(document, { key: 'Enter' });
  assert.equal(submitted, false);
});

test('Ctrl+Enter does not submit when modal is closed', () => {
  let submitted = false;
  const form = React.createElement('form', { onSubmit: (e: React.FormEvent) => { e.preventDefault(); submitted = true; } },
    React.createElement('button', { type: 'submit' }, 'Submit')
  );
  renderModal({ isOpen: false, onClose: () => {} }, form);
  fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
  assert.equal(submitted, false);
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
