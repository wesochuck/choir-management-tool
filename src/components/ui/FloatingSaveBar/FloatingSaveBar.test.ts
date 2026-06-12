import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { FloatingSaveBar } from './FloatingSaveBar';

test('FloatingSaveBar returns null when visible is false', () => {
  const { container } = render(
    React.createElement(FloatingSaveBar, { visible: false, onSave: () => {} }),
  );
  assert.equal(container.firstElementChild, null);
});

test('FloatingSaveBar renders when visible', () => {
  const { container } = render(
    React.createElement(FloatingSaveBar, { visible: true, onSave: () => {}, onDiscard: () => {} }),
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.textContent?.includes('Save Changes'), 'shows save label');
  assert.ok(el.textContent?.includes('Discard'), 'shows discard button');
});

test('FloatingSaveBar shows saving state', () => {
  const { container } = render(
    React.createElement(FloatingSaveBar, { visible: true, onSave: () => {}, saving: true }),
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.textContent?.includes('Saving...'), 'shows saving text');
});

test('FloatingSaveBar calls onSave', () => {
  let called = false;
  const { container } = render(
    React.createElement(FloatingSaveBar, { visible: true, onSave: () => { called = true; } }),
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const buttons = el.querySelectorAll('button');
  const saveBtn = buttons[buttons.length - 1];
  fireEvent.click(saveBtn);
  assert.equal(called, true, 'onSave was called');
});

test('FloatingSaveBar calls onDiscard', () => {
  let called = false;
  const { container } = render(
    React.createElement(FloatingSaveBar, { visible: true, onSave: () => {}, onDiscard: () => { called = true; } }),
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const buttons = el.querySelectorAll('button');
  const discardBtn = buttons[0];
  fireEvent.click(discardBtn);
  assert.equal(called, true, 'onDiscard was called');
});
