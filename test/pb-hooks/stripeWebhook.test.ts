import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isStripePaymentModuleEnabled } from '../../pocketbase/pb_hooks_src/checkout/stripeWebhook';

describe('stripe webhook module enforcement', () => {
  it('only enables a payment module when it is explicitly persisted', () => {
    const app = {
      findFirstRecordByFilter: () => ({
        get: () => JSON.stringify({ version: 1, enabled: ['ticketSales'] }),
      }),
    };

    assert.strictEqual(isStripePaymentModuleEnabled(app, 'ticketSales'), true);
    assert.strictEqual(isStripePaymentModuleEnabled(app, 'donations'), false);
    assert.strictEqual(isStripePaymentModuleEnabled(app, 'roster'), false);
  });
});
