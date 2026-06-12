import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { TabPanel } from './TabPanel';

test('TabPanel shows content when active', () => {
  const { container } = render(
    React.createElement(TabPanel, { tabId: 'a', activeTab: 'a' }, 'Content A')
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.getAttribute('hidden'), null, 'panel is NOT hidden when active');
  assert.ok(el.textContent?.includes('Content A'), 'includes panel content');
});

test('TabPanel hides content when inactive', () => {
  const { container } = render(
    React.createElement(TabPanel, { tabId: 'a', activeTab: 'b' }, 'Content A')
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.ok(el.hasAttribute('hidden'), 'panel HAS hidden attribute when inactive');
});
