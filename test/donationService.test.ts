import { test } from 'node:test';
import assert from 'node:assert';
import { donationService } from '../src/services/donationService';

test('donationService API structure', () => {
  assert.strictEqual(typeof donationService.getDonationSettings, 'function');
  assert.strictEqual(typeof donationService.saveDonationSettings, 'function');
  assert.strictEqual(typeof donationService.createDonationSession, 'function');
  assert.strictEqual(typeof donationService.getDonations, 'function');
  assert.strictEqual(typeof donationService.adminRefundDonation, 'function');
  assert.strictEqual(typeof donationService.pollForDonationRecord, 'function');
});
