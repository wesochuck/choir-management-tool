// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

import { AdminPageTabs } from './AdminPageTabs';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AdminPageTabs', () => {
  const tabs = [
    { value: 'catalog', label: 'Music Catalog' },
    { value: 'config', label: 'Library Settings' },
  ];

  it('renders all tabs', () => {
    render(<AdminPageTabs tabs={tabs} activeTab="catalog" onTabChange={mock.fn()} />);
    assert.ok(screen.getByText('Music Catalog'));
    assert.ok(screen.getByText('Library Settings'));
  });

  it('active tab gets aria-current="page"', () => {
    render(<AdminPageTabs tabs={tabs} activeTab="config" onTabChange={mock.fn()} />);
    const configBtn = screen.getByText('Library Settings').closest('button');
    assert.ok(configBtn);
    assert.equal(configBtn.getAttribute('aria-current'), 'page');

    const catalogBtn = screen.getByText('Music Catalog').closest('button');
    assert.ok(catalogBtn);
    assert.equal(catalogBtn.getAttribute('aria-current'), null);
  });

  it('clicking a tab calls onTabChange with its value', () => {
    const onTabChange = mock.fn();
    render(<AdminPageTabs tabs={tabs} activeTab="catalog" onTabChange={onTabChange} />);
    act(() => {
      screen.getByText('Library Settings').click();
    });
    assert.equal(onTabChange.mock.callCount(), 1);
    assert.equal(onTabChange.mock.calls[0].arguments[0], 'config');
  });

  it('does not call onTabChange when clicking the active tab', () => {
    const onTabChange = mock.fn();
    render(<AdminPageTabs tabs={tabs} activeTab="catalog" onTabChange={onTabChange} />);
    act(() => {
      screen.getByText('Music Catalog').click();
    });
    assert.equal(onTabChange.mock.callCount(), 1);
  });

  it('renders actions when provided', () => {
    render(
      <AdminPageTabs
        tabs={tabs}
        activeTab="catalog"
        onTabChange={mock.fn()}
        actions={<button type="button">Export</button>}
      />
    );
    assert.ok(screen.getByRole('button', { name: 'Export' }));
  });

  it('does not render actions container when actions omitted', () => {
    render(<AdminPageTabs tabs={tabs} activeTab="catalog" onTabChange={mock.fn()} />);
    assert.equal(screen.queryByText('Export'), null);
  });

  it('uses ariaLabel on the nav', () => {
    render(
      <AdminPageTabs
        tabs={tabs}
        activeTab="catalog"
        onTabChange={mock.fn()}
        ariaLabel="My sections"
      />
    );
    const nav = screen.getByLabelText('My sections');
    assert.ok(nav);
  });

  it('sets default aria-label on nav', () => {
    render(<AdminPageTabs tabs={tabs} activeTab="catalog" onTabChange={mock.fn()} />);
    const nav = screen.getByLabelText('Page sections');
    assert.ok(nav);
  });
});
