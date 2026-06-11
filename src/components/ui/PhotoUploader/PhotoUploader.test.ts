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
import { DialogProvider } from '../../../contexts/DialogProvider';
import { PhotoUploader } from './PhotoUploader';

function renderWithProvider(element: React.ReactElement) {
  return render(React.createElement(DialogProvider, null, element));
}

test('PhotoUploader renders upload trigger', () => {
  const { container } = renderWithProvider(
    React.createElement(PhotoUploader, { profileId: '1', profileName: 'Test' })
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
});

test('PhotoUploader shows initials fallback', () => {
  const { container: c1 } = renderWithProvider(
    React.createElement(PhotoUploader, { profileId: '1', profileName: 'Alice' })
  );
  assert.ok(c1.textContent?.includes('A'), 'shows initial for single name');

  const { container: c2 } = renderWithProvider(
    React.createElement(PhotoUploader, { profileId: '2', profileName: 'Bob Smith' })
  );
  assert.ok(c2.textContent?.includes('BS'), 'shows initials for two names');
});

test('PhotoUploader renders size variants', () => {
  const { container: cSm } = renderWithProvider(
    React.createElement(PhotoUploader, { profileId: '1', profileName: 'Test', size: 'sm' })
  );
  assert.ok(cSm.firstElementChild, 'sm renders');

  const { container: cMd } = renderWithProvider(
    React.createElement(PhotoUploader, { profileId: '1', profileName: 'Test', size: 'md' })
  );
  assert.ok(cMd.firstElementChild, 'md renders');

  const { container: cLg } = renderWithProvider(
    React.createElement(PhotoUploader, { profileId: '1', profileName: 'Test', size: 'lg' })
  );
  assert.ok(cLg.firstElementChild, 'lg renders');
});
