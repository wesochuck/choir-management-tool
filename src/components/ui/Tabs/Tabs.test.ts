import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Tabs, TabPanel } from './Tabs';

const tabs = [
  { id: 'a', label: 'Tab A' },
  { id: 'b', label: 'Tab B' },
  { id: 'c', label: 'Tab C' },
];

test('Tabs renders all tab buttons', () => {
  const { container } = render(React.createElement(Tabs, { tabs, activeTab: 'a', onTabChange: () => {} }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const buttons = el.querySelectorAll('[role="tab"]');
  assert.equal(buttons.length, 3, 'renders 3 tab buttons');
  assert.ok(buttons[0].textContent?.includes('Tab A'));
  assert.ok(buttons[1].textContent?.includes('Tab B'));
  assert.ok(buttons[2].textContent?.includes('Tab C'));
});

test('Tabs marks active tab', () => {
  const { container } = render(React.createElement(Tabs, { tabs, activeTab: 'b', onTabChange: () => {} }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const buttons = el.querySelectorAll('[role="tab"]');
  assert.equal(buttons[0].getAttribute('aria-selected'), 'false');
  assert.equal(buttons[1].getAttribute('aria-selected'), 'true');
  assert.equal(buttons[2].getAttribute('aria-selected'), 'false');
});

test('Tabs calls onTabChange on click', () => {
  let changedId = '';
  const handleChange = (id: string) => { changedId = id; };
  const { container } = render(React.createElement(Tabs, { tabs, activeTab: 'a', onTabChange: handleChange }));
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  const buttons = el.querySelectorAll('[role="tab"]');
  fireEvent.click(buttons[2]);
  assert.equal(changedId, 'c', 'onTabChange was called with correct id');
});

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
