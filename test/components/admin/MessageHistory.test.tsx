// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, render, screen } from '@testing-library/react';
import { MessageHistory } from '../../../src/components/admin/MessageHistory';

afterEach(() => {
  cleanup();
});

const defaultProps = {
  history: [],
  currentPage: 1,
  totalPages: 1,
  onPageChange: mock.fn(),
  historySearchQuery: '',
  onHistorySearchChange: mock.fn(),
  sourceFilter: 'all' as const,
  onSourceFilterChange: mock.fn(),
  onViewDetails: mock.fn(),
  onCopyDraft: mock.fn(),
  onViewRecipients: mock.fn(),
  onNewMessage: mock.fn(),
  events: [],
  commSettings: {} as any,
};

describe('MessageHistory', () => {
  it('hides search and source filter and shows empty action when completely empty', () => {
    render(<MessageHistory {...defaultProps} />);

    // Assert empty CTA is visible
    assert.ok(screen.getByRole('button', { name: '+ New Message' }));

    // Assert search and filter are absent
    assert.ok(!screen.queryByPlaceholderText('Search message history (subject, content, type)...'));
    assert.ok(!screen.queryByLabelText('Message source'));
  });

  it('shows search and source filter when there are no results but a search query exists', () => {
    render(<MessageHistory {...defaultProps} historySearchQuery="test query" />);

    // Assert search and filter remain visible to allow clearing
    assert.ok(screen.getByPlaceholderText('Search message history (subject, content, type)...'));
    assert.ok(screen.getByLabelText('Message source'));
  });
});
