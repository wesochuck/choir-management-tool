import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAIN_PB_PATH = resolve(__dirname, '../../pocketbase/pb_hooks/main.pb.js');
const mainPbJs = readFileSync(MAIN_PB_PATH, 'utf-8');

test('Generated main.pb.js rejects past events in checkout', () => {
  assert.ok(
    mainPbJs.includes('Ticket sales are closed for this event'),
    'checkout endpoint must reject past events'
  );
  assert.ok(
    mainPbJs.includes('checkoutEventDate < new Date()'),
    'checkout endpoint must compare event date against current time'
  );
});

test('Ticketing Pricing and Fee Calculation Rules', () => {
  // 1. Single ticket calculation
  const unitPrice = 1500; // $15.00
  const quantity1 = 1;
  const totalTickets1 = unitPrice * quantity1;
  const feeCents1 = totalTickets1 > 0 ? Math.round(totalTickets1 * 0.029) + 30 : 0;
  assert.strictEqual(feeCents1, 74); // 1500 * 0.029 = 43.5 (rounds to 44) + 30 = 74 cents
  assert.strictEqual(totalTickets1 + feeCents1, 1574); // $15.74 total

  // 2. Multiple tickets calculation (10 tickets)
  const quantity10 = 10;
  const totalTickets10 = unitPrice * quantity10; // 15000 cents ($150.00)
  const feeCents10 = totalTickets10 > 0 ? Math.round(totalTickets10 * 0.029) + 30 : 0;
  assert.strictEqual(feeCents10, 465); // 15000 * 0.029 = 435 + 30 = 465 cents ($4.65)
  assert.strictEqual(totalTickets10 + feeCents10, 15465); // $154.65 total

  // 3. Free ticket fee calculation should be zero
  const freeUnitPrice = 0;
  const freeQuantity = 5;
  const totalFreeTickets = freeUnitPrice * freeQuantity;
  const freeFeeCents = totalFreeTickets > 0 ? Math.round(totalFreeTickets * 0.029) + 30 : 0;
  assert.strictEqual(freeFeeCents, 0);

  // 4. Season Ticket Bundle calculation
  const bundlePrice = 4500; // $45.00
  const bundleQuantity = 2;
  const totalBundleCents = bundlePrice * bundleQuantity; // 9000 cents ($90.00)
  const bundleFeeCents = totalBundleCents > 0 ? Math.round(totalBundleCents * 0.029) + 30 : 0;
  assert.strictEqual(bundleFeeCents, 291); // 9000 * 0.029 = 261 + 30 = 291 cents ($2.91)
  assert.strictEqual(totalBundleCents + bundleFeeCents, 9291); // $92.91 total
});
