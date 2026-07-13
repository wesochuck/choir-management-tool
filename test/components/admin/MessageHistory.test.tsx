// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MessageHistory } from '../../../src/components/admin/MessageHistory';
import type { DeliverySummary } from '../../../src/services/communicationService';
import type { DeliveryStatusFilter } from '../../../src/views/admin/communications/deliveryPresentation';

afterEach(() => {
  cleanup();
});

const baseMessage = {
  id: 'msg-1',
  subject: 'Rehearsal Reminder',
  content: 'Reminder content',
  type: 'Email' as const,
  recipients: [
    {
      id: 'r1',
      name: 'Test',
      email: 'test@example.com',
      phone: '',
      voicePart: 'Soprano',
      globalStatus: 'Active',
    },
  ],
  filters: {},
  status: 'Sent' as const,
  created: '2026-07-13T12:00:00Z',
  collectionId: 'c1',
  collectionName: 'messages',
  updated: '',
};

const partialSummary: DeliverySummary = {
  messageId: 'msg-1',
  state: 'partial',
  total: { total: 3, pending: 0, processing: 0, sent: 2, failed: 1 },
  email: { total: 3, pending: 0, processing: 0, sent: 2, failed: 1 },
  sms: { total: 0, pending: 0, processing: 0, sent: 0, failed: 0 },
  failures: [
    {
      maskedDestination: 'r***@example.com',
      channel: 'email',
      attempts: 2,
      category: 'rate-limit',
      lastSeen: '2026-07-13T12:00:00Z',
    },
  ],
  hasMoreFailures: false,
  lastActivity: '2026-07-13T12:00:00Z',
  truncated: false,
};

const defaultProps = {
  history: [] as (typeof baseMessage)[],
  currentPage: 1,
  totalPages: 1,
  onPageChange: mock.fn(),
  historySearchQuery: '',
  onHistorySearchChange: mock.fn(),
  sourceFilter: 'all' as const,
  onSourceFilterChange: mock.fn(),
  statusFilter: 'all' as DeliveryStatusFilter,
  onStatusFilterChange: mock.fn(),
  summaries: {} as Record<string, DeliverySummary>,
  isSummariesLoading: false,
  onViewDetails: mock.fn(),
  onCopyDraft: mock.fn(),
  onRetryFailed: mock.fn(),
  onViewRecipients: mock.fn(),
  onNewMessage: mock.fn(),
  events: [],
  commSettings: { mailingAddress: '123 St' } as any,
};

describe('MessageHistory', () => {
  it('hides search and source filter and shows empty action when completely empty', () => {
    render(<MessageHistory {...defaultProps} />);

    assert.ok(screen.getByRole('button', { name: '+ New Message' }));

    assert.ok(!screen.queryByPlaceholderText('Search message history (subject, content, type)...'));
    assert.ok(!screen.queryByLabelText('Message source'));
  });

  it('shows search and source filter when there are no results but a search query exists', () => {
    render(<MessageHistory {...defaultProps} historySearchQuery="test query" />);

    assert.ok(screen.getByPlaceholderText('Search message history (subject, content, type)...'));
    assert.ok(screen.getByLabelText('Message source'));
  });

  it('renders delivery status badge and progress for a partial message', () => {
    render(
      <MessageHistory
        {...defaultProps}
        history={[baseMessage]}
        summaries={{ 'msg-1': partialSummary }}
      />
    );

    // Partial appears in both the badge and the Select option
    assert.ok(screen.getAllByText('Partial').length > 0);
    // Progress text appears in desktop table + mobile card (one hidden)
    assert.ok(screen.getAllByText('2 of 3 sent · 1 failed').length >= 1);
  });

  it('shows delivery status filter select on the page', () => {
    render(
      <MessageHistory
        {...defaultProps}
        history={[baseMessage]}
        summaries={{ 'msg-1': partialSummary }}
      />
    );

    assert.ok(screen.getByLabelText('Delivery status'));
  });

  it('shows Checking… while summaries are loading for a non-archived message', () => {
    render(<MessageHistory {...defaultProps} history={[baseMessage]} isSummariesLoading={true} />);

    assert.ok(screen.getByText('Checking…'));
  });

  it('filters out partial message when status filter is set to failed', () => {
    const onStatusFilterChange = mock.fn();
    const ariaLabel = 'Delivery status: Partial — 2 of 3 sent · 1 failed';

    const { rerender } = render(
      <MessageHistory
        {...defaultProps}
        history={[baseMessage]}
        summaries={{ 'msg-1': partialSummary }}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
      />
    );

    // Badges are visible when filter is 'all' (desktop + mobile)
    assert.ok(screen.getAllByLabelText(ariaLabel).length > 0);

    rerender(
      <MessageHistory
        {...defaultProps}
        history={[baseMessage]}
        summaries={{ 'msg-1': partialSummary }}
        statusFilter="failed"
        onStatusFilterChange={onStatusFilterChange}
      />
    );

    // Badges are hidden when filter is 'failed'
    assert.equal(screen.queryAllByLabelText(ariaLabel).length, 0);
  });

  it('renders archived and tracking-unavailable display states', () => {
    const archivedMessage = { ...baseMessage, id: 'msg-archived', status: 'Archived' as const };
    const legacyMessage = { ...baseMessage, id: 'msg-legacy', status: 'Sent' as const };

    render(
      <MessageHistory {...defaultProps} history={[archivedMessage, legacyMessage]} summaries={{}} />
    );

    // Archived messages always show as Archived regardless of summaries
    const archivedBadges = screen.getAllByText('Archived');
    assert.ok(archivedBadges.length > 0);

    // Legacy messages without summary show Tracking unavailable
    const untracked = screen.getAllByText('Tracking unavailable');
    assert.ok(untracked.length > 0);
  });

  it('renders Message details button in mobile card', () => {
    render(
      <MessageHistory
        {...defaultProps}
        history={[baseMessage]}
        summaries={{ 'msg-1': partialSummary }}
      />
    );

    const detailsButtons = screen.getAllByRole('button', { name: 'Message details' });
    assert.ok(detailsButtons.length > 0);
  });
});
