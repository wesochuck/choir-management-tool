// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

import { CommunicationTabs } from '../src/components/CommunicationTabs';
import type { CommunicationTab } from '../src/types/Communication';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('CommunicationTabs', () => {
  it('renders Automated, Drafts, History, Settings', () => {
    render(<CommunicationTabs activeTab="automated" onTabChange={mock.fn()} draftsCount={0} />);

    assert.ok(screen.getByText('Automated'));
    assert.ok(screen.getByText('Drafts'));
    assert.ok(screen.getByText('History'));
    assert.ok(screen.getByText('Settings'));
  });

  it('does not render New Message', () => {
    render(<CommunicationTabs activeTab="automated" onTabChange={mock.fn()} draftsCount={0} />);

    assert.equal(screen.queryByText('New Message'), null);
  });

  it('active tab gets aria-current="page"', () => {
    render(<CommunicationTabs activeTab="drafts" onTabChange={mock.fn()} draftsCount={0} />);

    const draftsTab = screen.getByText('Drafts').closest('button');
    assert.ok(draftsTab);
    assert.equal(draftsTab.getAttribute('aria-current'), 'page');

    const automatedTab = screen.getByText('Automated').closest('button');
    assert.ok(automatedTab);
    assert.equal(automatedTab.getAttribute('aria-current'), null);
  });

  it('clicking a tab calls onTabChange', () => {
    const onTabChange = mock.fn();

    render(<CommunicationTabs activeTab="automated" onTabChange={onTabChange} draftsCount={0} />);

    act(() => {
      screen.getByText('History').click();
    });

    assert.equal(onTabChange.mock.callCount(), 1);
    assert.equal(onTabChange.mock.calls[0].arguments[0], 'history');
  });

  it('shows drafts badge when draftsCount > 0', () => {
    render(<CommunicationTabs activeTab="automated" onTabChange={mock.fn()} draftsCount={5} />);

    const badge = screen.getByText('5');
    assert.ok(badge);

    const badgeContainer = badge.closest('span');
    assert.ok(badgeContainer);
    assert.ok(badgeContainer.className.includes('rounded-full'));
  });

  it('hides drafts badge when draftsCount is 0', () => {
    render(<CommunicationTabs activeTab="automated" onTabChange={mock.fn()} draftsCount={0} />);

    assert.equal(screen.queryByText('0'), null);
  });
});
