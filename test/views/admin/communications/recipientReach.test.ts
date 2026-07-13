import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CommunicationRecipient } from '../../../../src/services/communicationService';
import {
  buildSendConfirmation,
  getReachableRecipients,
  summarizeRecipientReach,
} from '../../../../src/views/admin/communications/recipientReach';

const recipient = (id: string, email: string, phone: string): CommunicationRecipient => ({
  id,
  name: `Recipient ${id}`,
  email,
  phone,
  voicePart: 'Alto',
  globalStatus: 'Active',
});

const recipients = [
  recipient('both', 'both@example.com', '5551234567'),
  recipient('email', 'email@example.com', ''),
  recipient('sms', '', '5559876543'),
  recipient('none', '', ''),
];

describe('recipient reach', () => {
  it('counts unique people and per-channel deliveries', () => {
    assert.deepEqual(summarizeRecipientReach(recipients, 'Both'), {
      totalSelected: 4,
      reachablePeople: 3,
      excludedPeople: 1,
      emailDeliveries: 2,
      smsDeliveries: 2,
    });
  });

  it('filters recipients for a single channel', () => {
    assert.deepEqual(
      getReachableRecipients(recipients, 'SMS').map((item) => item.id),
      ['both', 'sms']
    );
  });

  it('builds subject, channel, delivery, and exclusion confirmation copy', () => {
    const summary = summarizeRecipientReach(recipients, 'Both');
    assert.equal(
      buildSendConfirmation('Concert Update', 'Both', summary),
      [
        'Send “Concert Update” by email and SMS to 3 recipients?',
        '2 email deliveries · 2 SMS deliveries.',
        '1 selected recipient will be excluded because neither channel is available.',
      ].join('\n')
    );
  });
});
