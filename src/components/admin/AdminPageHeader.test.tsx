// @vitest-environment jsdom
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { AdminPageHeader } from './AdminPageHeader';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AdminPageHeader', () => {
  it('renders the title', () => {
    render(<AdminPageHeader title="My Page" />);
    assert.ok(screen.getByText('My Page'));
  });

  it('renders the title as an h1', () => {
    render(<AdminPageHeader title="Reports" />);
    const heading = screen.getByRole('heading', { level: 1 });
    assert.equal(heading.textContent, 'Reports');
  });

  it('renders description when provided', () => {
    render(<AdminPageHeader title="X" description="A useful page" />);
    assert.ok(screen.getByText('A useful page'));
  });

  it('does not render description when omitted', () => {
    render(<AdminPageHeader title="X" />);
    assert.equal(screen.queryByText('A useful page'), null);
  });

  it('renders actions when provided', () => {
    render(<AdminPageHeader title="X" actions={<button type="button">Action</button>} />);
    assert.ok(screen.getByRole('button', { name: 'Action' }));
  });

  it('does not render actions container when actions omitted', () => {
    render(<AdminPageHeader title="X" />);
    assert.equal(screen.queryByText('Action'), null);
  });

  it('renders below content when provided', () => {
    render(<AdminPageHeader title="X" below={<p>Extra</p>} />);
    assert.ok(screen.getByText('Extra'));
  });

  it('applies className to the outer div', () => {
    render(<AdminPageHeader title="X" className="mt-4" />);
    const container = screen.getByText('X').closest('div.no-print');
    assert.ok(container);
    assert.ok(container.className.includes('mt-4'));
  });
});
