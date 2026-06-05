import { test } from 'node:test';
import assert from 'node:assert';

test('Ticketing Pricing and Fee Calculation Rules', () => {
  // 1. Advance ticket logic validation
  const unitPrice = 1500; // $15.00
  const grossCents = Math.round((unitPrice + 30) / (1 - 0.029));
  const feeCents = grossCents - unitPrice;
  assert.strictEqual(grossCents, 1576); // $15.76
  assert.strictEqual(feeCents, 76); // 76 cents

  // 2. Free ticket fee calculation should be zero
  const freeUnitPrice = 0;
  const freeGross = Math.round((freeUnitPrice + 0) / (1 - 0.029));
  assert.strictEqual(freeGross, 0);
});
