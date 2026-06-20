import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { MultiSelectDropdown } from '../src/views/admin/music-library/MultiSelectDropdown';

const options = [
  { id: '1', label: 'Option A' },
  { id: '2', label: 'Option B' },
  { id: '3', label: 'Option C' },
];

describe('MultiSelectDropdown', () => {
  it('renders default variant with chevron', () => {
    const { container } = render(
      React.createElement(MultiSelectDropdown, {
        options,
        selectedIds: [],
        onChange: () => {},
      })
    );
    const chevron = container.querySelector('[data-testid="dropdown-chevron"]');
    assert.ok(chevron, 'default variant renders a chevron icon');
  });

  it('renders chips variant with chevron', () => {
    const { container } = render(
      React.createElement(MultiSelectDropdown, {
        options,
        selectedIds: [],
        onChange: () => {},
        variant: 'chips',
      })
    );
    const chevron = container.querySelector('[data-testid="dropdown-chevron"]');
    assert.ok(chevron, 'chips variant renders a chevron icon');
  });

  it('does not render text glyph carets', () => {
    render(
      React.createElement(MultiSelectDropdown, {
        options,
        selectedIds: [],
        onChange: () => {},
      })
    );
    assert.equal(screen.queryByText('▾'), null);
    assert.equal(screen.queryByText('▴'), null);
  });

  it('rotates chevron when open', () => {
    const { container } = render(
      React.createElement(MultiSelectDropdown, {
        options,
        selectedIds: [],
        onChange: () => {},
      })
    );
    const trigger = container.querySelector('button');
    assert.ok(trigger);

    const chevron = container.querySelector('[data-testid="dropdown-chevron"]');
    assert.ok(chevron);

    assert.ok(
      chevron.className.includes('rotate-180') === false,
      'chevron not rotated when closed'
    );

    fireEvent.click(trigger);
    assert.ok(chevron.className.includes('rotate-180'), 'chevron rotated when open');
  });

  it('sets aria-expanded on trigger', () => {
    const { container } = render(
      React.createElement(MultiSelectDropdown, {
        options,
        selectedIds: [],
        onChange: () => {},
      })
    );
    const trigger = container.querySelector('button');
    assert.ok(trigger);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');

    fireEvent.click(trigger);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  });
});
