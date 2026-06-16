import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TabGroup, Tab, TabPanel } from './TabGroup';

test('TabGroup renders children inside a wrapper in test environment', () => {
  const { container } = render(
    React.createElement(
      TabGroup,
      { value: 'profile', onTabChange: () => {} },
      React.createElement(Tab, { panel: 'profile' }, 'Profile'),
      React.createElement(Tab, { panel: 'rsvps' }, 'RSVPs'),
      React.createElement(TabPanel, { name: 'profile' }, 'Profile content'),
      React.createElement(TabPanel, { name: 'rsvps' }, 'RSVPs content'),
    ),
  );
  const wrapper = container.firstElementChild;
  assert.ok(wrapper, 'renders a wrapper');
  assert.equal(wrapper.tagName, 'DIV');
  assert.ok(wrapper.textContent?.includes('Profile'), 'includes tab text');
  assert.ok(wrapper.textContent?.includes('RSVPs'), 'includes second tab text');
  assert.ok(wrapper.textContent?.includes('Profile content'), 'includes panel text');
});

test('TabGroup passes className to the wrapper', () => {
  const { container } = render(
    React.createElement(
      TabGroup,
      { value: 'a', onTabChange: () => {}, className: 'mt-4' },
      React.createElement(Tab, { panel: 'a' }, 'A'),
    ),
  );
  const wrapper = container.firstElementChild;
  assert.ok(wrapper, 'renders a wrapper');
  assert.ok(wrapper.classList.contains('mt-4'), 'has the passed className');
});

test('Tab renders its children as content', () => {
  const { container } = render(
    React.createElement(Tab, { panel: 'profile' }, 'Profile Info'),
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'DIV');
  assert.ok(el.textContent?.includes('Profile Info'));
});

test('TabPanel renders its children as content', () => {
  const { container } = render(
    React.createElement(TabPanel, { name: 'profile' }, 'Panel body'),
  );
  const el = container.firstElementChild;
  assert.ok(el, 'renders an element');
  assert.equal(el.tagName, 'DIV');
  assert.ok(el.textContent?.includes('Panel body'));
});

test('TabPanel does not crash when clicked (smoke test for change handling)', () => {
  // The test-mode renderer doesn't wire onTabChange (the production path
  // routes Shoelace's sl-tab-show event). This is a smoke test only —
  // verifying the test-mode components render without throwing.
  let crashed = false;
  try {
    const { container } = render(
      React.createElement(
        TabGroup,
        { value: 'a', onTabChange: () => {} },
        React.createElement(Tab, { panel: 'a' }, 'A'),
        React.createElement(TabPanel, { name: 'a' }, 'Body'),
      ),
    );
    fireEvent.click(container.firstElementChild as HTMLElement);
  } catch {
    crashed = true;
  }
  assert.equal(crashed, false, 'click on test-mode tab group must not throw');
});
