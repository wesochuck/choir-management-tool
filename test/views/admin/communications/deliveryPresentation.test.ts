import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDeliveryProgress,
  resolveDeliveryDisplayState,
} from '../../../../src/views/admin/communications/deliveryPresentation';
import type { DeliverySummary, MessageRecord } from '../../../../src/services/communicationService';

const message = (status: 'Sent' | 'Archived') => ({ status }) as MessageRecord;

const summary = (state: DeliverySummary['state']): DeliverySummary => ({
  messageId: 'message-1',
  state,
  total: { total: 3, pending: 0, processing: 0, sent: 2, failed: 1 },
  email: { total: 2, pending: 0, processing: 0, sent: 2, failed: 0 },
  sms: { total: 1, pending: 0, processing: 0, sent: 0, failed: 1 },
  lastActivity: '2026-07-13T12:00:00Z',
  failures: [],
  hasMoreFailures: false,
  truncated: false,
});

describe('delivery presentation', () => {
  it('prefers archived lifecycle and handles legacy messages', () => {
    assert.equal(resolveDeliveryDisplayState(message('Archived'), summary('failed')), 'archived');
    assert.equal(resolveDeliveryDisplayState(message('Sent'), undefined), 'tracking-unavailable');
  });

  it('resolves queue states correctly', () => {
    assert.equal(resolveDeliveryDisplayState(message('Sent'), summary('queued')), 'queued');
    assert.equal(resolveDeliveryDisplayState(message('Sent'), summary('sending')), 'sending');
    assert.equal(resolveDeliveryDisplayState(message('Sent'), summary('sent')), 'sent');
    assert.equal(resolveDeliveryDisplayState(message('Sent'), summary('partial')), 'partial');
    assert.equal(resolveDeliveryDisplayState(message('Sent'), summary('failed')), 'failed');
  });

  it('formats queued progress', () => {
    assert.equal(formatDeliveryProgress(summary('queued')), 'Queued');
  });

  it('formats sending progress', () => {
    const sending: DeliverySummary = {
      ...summary('sending'),
      total: { total: 3, pending: 1, processing: 0, sent: 2, failed: 0 },
    };
    assert.equal(formatDeliveryProgress(sending), 'Sending: 2 of 3 sent');
  });

  it('formats terminal progress', () => {
    assert.equal(formatDeliveryProgress(summary('partial')), '2 of 3 sent · 1 failed');
  });

  it('formats sent progress', () => {
    const allSent: DeliverySummary = {
      ...summary('sent'),
      total: { total: 3, pending: 0, processing: 0, sent: 3, failed: 0 },
    };
    assert.equal(formatDeliveryProgress(allSent), '3 of 3 sent');
  });

  it('formats failed-only progress', () => {
    const allFailed: DeliverySummary = {
      ...summary('failed'),
      total: { total: 3, pending: 0, processing: 0, sent: 0, failed: 3 },
    };
    assert.equal(formatDeliveryProgress(allFailed), '3 failed');
  });

  it('formats tracking-unavailable', () => {
    assert.equal(formatDeliveryProgress(summary('tracking-unavailable')), 'Tracking unavailable');
  });
});
