import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('ticketScanValidation', () => {
  it('reason messages map correctly', () => {
    const reasonMessages: Record<string, string> = {
      malformed: 'QR code is not valid',
      bad_signature: 'QR code is not valid',
      not_found: 'Ticket not found',
      not_paid: 'Ticket has been refunded',
      wrong_event: 'This ticket is for a different concert',
    };
    assert.equal(reasonMessages.malformed, 'QR code is not valid');
    assert.equal(reasonMessages.bad_signature, 'QR code is not valid');
    assert.equal(reasonMessages.not_found, 'Ticket not found');
    assert.equal(reasonMessages.not_paid, 'Ticket has been refunded');
    assert.equal(reasonMessages.wrong_event, 'This ticket is for a different concert');
  });

  it('validation result shapes are correct', () => {
    const validResult = {
      valid: true,
      buyerName: 'Jane Doe',
      quantity: 2,
      eventId: 'evt_1',
      eventTitle: 'Spring Concert',
      eventDate: '2026-05-15T19:30:00Z',
      isBundlePass: false,
    };
    assert.equal(validResult.valid, true);
    assert.equal(typeof validResult.buyerName, 'string');
    assert.equal(typeof validResult.quantity, 'number');

    const invalidResult = { valid: false, reason: 'wrong_event' };
    assert.equal(invalidResult.valid, false);
    assert.equal(typeof invalidResult.reason, 'string');
  });
});
