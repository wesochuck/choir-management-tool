import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateReadiness, type ReadinessSnapshot } from '../src/lib/readiness';

describe('Readiness Registry', () => {
  const baseSnapshot: ReadinessSnapshot = {
    hasAdmin: true,
    choirName: 'Test Choir',
    hasVoiceParts: true,
    hasSections: true,
    modulesSelected: true,
    enabledModules: new Set(['roster', 'communications']),
    emailVerified: true,
    stripeConfigured: false,
    websiteConfigured: false,
    auditionsConfigured: false,
    hasSingers: false,
  };

  it('determines readyForLaunch when all applicable required items are complete', () => {
    const res = evaluateReadiness(baseSnapshot);
    assert.strictEqual(res.readyForLaunch, true);

    const adminItem = res.items.find((i) => i.id === 'admin-claimed');
    assert.strictEqual(adminItem?.applicable, true);
    assert.strictEqual(adminItem?.completed, true);
  });

  it('blocks readyForLaunch when a required item is incomplete', () => {
    const incompleteSnapshot: ReadinessSnapshot = {
      ...baseSnapshot,
      hasAdmin: false,
    };
    const res = evaluateReadiness(incompleteSnapshot);
    assert.strictEqual(res.readyForLaunch, false);

    const adminItem = res.items.find((i) => i.id === 'admin-claimed');
    assert.strictEqual(adminItem?.applicable, true);
    assert.strictEqual(adminItem?.completed, false);
  });

  it('marks disabled-module tasks as not applicable', () => {
    const res = evaluateReadiness(baseSnapshot);
    const stripeItem = res.items.find((i) => i.id === 'stripe-configured');
    assert.strictEqual(stripeItem?.applicable, false);
    assert.strictEqual(stripeItem?.completed, false);
  });

  it('marks enabled-module tasks as applicable', () => {
    const snapshotWithStripe: ReadinessSnapshot = {
      ...baseSnapshot,
      enabledModules: new Set(['roster', 'communications', 'ticketSales']),
      stripeConfigured: true,
    };
    const res = evaluateReadiness(snapshotWithStripe);
    const stripeItem = res.items.find((i) => i.id === 'stripe-configured');
    assert.strictEqual(stripeItem?.applicable, true);
    assert.strictEqual(stripeItem?.completed, true);
  });
});
