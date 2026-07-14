// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MessageDetailsModal } from '../../../../src/views/admin/communications/MessageDetailsModal';
import type { MessageRecord, DeliverySummary } from '../../../../src/services/communicationService';
import type { ConfirmOptions } from '../../../../src/contexts/DialogContext';

afterEach(() => {
  cleanup();
});

const message: MessageRecord = {
  id: 'msg-123',
  subject: 'Test Subject',
  content: 'Hello World',
  type: 'Email',
  recipients: [
    {
      id: 'r1',
      name: 'Recipient One',
      email: 'r1@example.com',
      phone: '',
      voicePart: 'Soprano',
      globalStatus: 'Active',
    },
  ],
  filters: {},
  status: 'Sent',
  created: '2026-07-13T12:00:00Z',
  collectionId: 'c1',
  collectionName: 'messages',
  updated: '',
};

const partialSummary: DeliverySummary = {
  messageId: 'msg-123',
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

describe('MessageDetailsModal', () => {
  it('renders details, failures, and handles retry confirmation', async () => {
    const captured: { options: ConfirmOptions | null } = { options: null };
    let confirmResult = false;
    const retryCalls: string[] = [];

    const mockOnRetryFailed = async (msg: MessageRecord, failedCount: number) => {
      // mimic dialog confirm
      captured.options = {
        title: 'Retry Failed Deliveries?',
        message: `Retry ${failedCount} failed deliveries for "${msg.subject}"? Successful deliveries will not be resent.`,
        confirmLabel: 'Retry failed deliveries',
        variant: 'danger',
      };
      if (confirmResult) {
        retryCalls.push(msg.id);
      }
    };

    const onClose = mock.fn();
    const onCopyDraft = mock.fn();

    const { rerender } = render(
      <MessageDetailsModal
        message={message}
        summary={partialSummary}
        events={[]}
        commSettings={{ mailingAddress: '123 St' } as any}
        isRetrying={false}
        onClose={onClose}
        onCopyDraft={onCopyDraft}
        onRetryFailed={mockOnRetryFailed}
      />
    );

    // Assert Email/SMS totals
    assert.ok(screen.getByText('Total Enqueued'));
    assert.ok(screen.getByText('Failed'));

    // Assert masked destination and category label
    assert.ok(screen.getByText('r***@example.com'));
    assert.ok(screen.getByText('Rate limited'));

    // Find retry button (labelled "Retry 1 Failed")
    const retryBtn = screen.getByRole('button', { name: 'Retry 1 Failed' });
    assert.ok(retryBtn);

    // 1. Confirm false
    confirmResult = false;
    fireEvent.click(retryBtn);

    const options = captured.options;
    if (!options) {
      throw new Error('captured.options is null');
    }
    assert.equal(options.variant, 'danger');
    assert.equal(options.confirmLabel, 'Retry failed deliveries');
    assert.match(String(options.message), /Successful deliveries will not be resent/);
    assert.equal(retryCalls.length, 0);

    // 2. Confirm true
    confirmResult = true;
    fireEvent.click(retryBtn);
    assert.equal(retryCalls.length, 1);
    assert.equal(retryCalls[0], 'msg-123');

    // Assert Close button remains visible
    assert.ok(screen.getByText('Close'));
  });
});
