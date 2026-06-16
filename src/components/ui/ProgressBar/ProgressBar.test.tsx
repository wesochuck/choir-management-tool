import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

test('ProgressBar renders with the correct structure in test environment', () => {
  const { container } = render(React.createElement(ProgressBar, { value: 50 }));
  const track = container.firstElementChild as HTMLElement;
  assert.ok(track, 'renders a track element');
  // Outer track
  assert.equal(track.tagName, 'DIV');
  assert.ok(track.className.includes('h-3'), 'has h-3 class for height');
  assert.ok(track.className.includes('bg-gray-200'), 'has gray background for the track');
  // Inner fill
  const fill = track.firstElementChild as HTMLElement;
  assert.ok(fill, 'renders a fill element');
  assert.ok(fill.className.includes('bg-primary'), 'has primary color for the fill');
  assert.ok((fill as HTMLElement).style.width === '50%', 'fill width matches value');
});

test('ProgressBar clamps value to 0-100 range', () => {
  const { container: c1 } = render(React.createElement(ProgressBar, { value: -20 }));
  const fill1 = c1.firstElementChild?.firstElementChild as HTMLElement;
  assert.equal(fill1.style.width, '0%', 'negative values clamp to 0%');

  const { container: c2 } = render(React.createElement(ProgressBar, { value: 150 }));
  const fill2 = c2.firstElementChild?.firstElementChild as HTMLElement;
  assert.equal(fill2.style.width, '100%', 'values over 100 clamp to 100%');
});

test('ProgressBar merges className', () => {
  const { container } = render(
    React.createElement(ProgressBar, { value: 10, className: 'extra-class' }),
  );
  const track = container.firstElementChild as HTMLElement;
  assert.ok(track, 'renders an element');
  assert.ok(track.classList.contains('extra-class'), 'has the passed className');
});
