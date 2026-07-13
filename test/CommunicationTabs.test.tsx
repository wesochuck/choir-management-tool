// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { CommunicationTabs } from '../src/components/CommunicationTabs';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('CommunicationTabs', () => {
  it('renders all six desktop communication sections', () => {
    render(<CommunicationTabs activeTab="compose" onTabChange={mock.fn()} draftsCount={2} />);

    for (const label of [
      'Compose',
      'Drafts',
      'History',
      'Templates',
      'Upcoming Sends',
      'Settings',
    ]) {
      assert.ok(screen.getAllByText(label).length > 0, `${label} should be present`);
    }
  });

  it('changes sections through the mobile selector', () => {
    const onTabChange = mock.fn();
    render(<CommunicationTabs activeTab="compose" onTabChange={onTabChange} draftsCount={2} />);

    fireEvent.change(screen.getByLabelText('Communications section'), {
      target: { value: 'templates' },
    });

    assert.equal(onTabChange.mock.calls[0].arguments[0], 'templates');
  });

  it('active tab gets aria-current="page"', () => {
    render(<CommunicationTabs activeTab="drafts" onTabChange={mock.fn()} draftsCount={0} />);

    const draftsTab = screen
      .getAllByRole('button')
      .find((el) => el.textContent?.includes('Drafts'));
    assert.ok(draftsTab);
    assert.equal(draftsTab.getAttribute('aria-current'), 'page');

    const composeTab = screen
      .getAllByRole('button')
      .find((el) => el.textContent?.includes('Compose'));
    assert.ok(composeTab);
    assert.equal(composeTab.getAttribute('aria-current'), null);
  });

  it('clicking a tab calls onTabChange with the correct value', () => {
    const onTabChange = mock.fn();

    render(<CommunicationTabs activeTab="compose" onTabChange={onTabChange} draftsCount={0} />);

    act(() => {
      const historyTab = screen
        .getAllByRole('button')
        .find((el) => el.textContent?.includes('History'));
      historyTab?.click();
    });

    assert.equal(onTabChange.mock.callCount(), 1);
    assert.equal(onTabChange.mock.calls[0].arguments[0], 'history');
  });

  it('shows drafts badge when draftsCount > 0', () => {
    render(<CommunicationTabs activeTab="compose" onTabChange={mock.fn()} draftsCount={5} />);

    const badge = screen.getByText('5');
    assert.ok(badge);

    const badgeContainer = badge.closest('span');
    assert.ok(badgeContainer);
    assert.ok(badgeContainer.className.includes('rounded-full'));
  });

  it('hides drafts badge when draftsCount is 0', () => {
    render(<CommunicationTabs activeTab="compose" onTabChange={mock.fn()} draftsCount={0} />);

    assert.equal(screen.queryByText('0'), null);
  });
});
