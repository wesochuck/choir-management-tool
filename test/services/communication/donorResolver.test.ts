import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDonors } from '../../../src/services/communication/donorResolver';
import { pb } from '../../../src/lib/pocketbase';

const mockDonations = [
  {
    id: 'don1',
    donorName: 'Alice Smith',
    donorEmail: 'alice@example.com',
    amountPaidCents: 5000,
    tributeType: 'none',
    isAnonymous: false,
    status: 'paid',
    stripeSessionId: 'sess_1',
    stripePaymentIntentId: 'pi_1',
    marketingOptIn: true,
    created: '2026-05-19T00:00:00Z',
    updated: '2026-05-19T00:00:00Z',
  },
  {
    id: 'don2',
    donorName: 'Bob Jones',
    donorEmail: 'bob@example.com',
    amountPaidCents: 10000,
    tributeType: 'none',
    isAnonymous: false,
    status: 'paid',
    stripeSessionId: 'sess_2',
    stripePaymentIntentId: 'pi_2',
    marketingOptIn: false,
    created: '2026-05-19T00:00:00Z',
    updated: '2026-05-19T00:00:00Z',
  },
  // Duplicate email check
  {
    id: 'don3',
    donorName: 'Alice Smith Again',
    donorEmail: 'alice@example.com',
    amountPaidCents: 2000,
    tributeType: 'none',
    isAnonymous: false,
    status: 'paid',
    stripeSessionId: 'sess_3',
    stripePaymentIntentId: 'pi_3',
    marketingOptIn: true,
    created: '2026-05-20T00:00:00Z',
    updated: '2026-05-20T00:00:00Z',
  },
];

let originalCollection: typeof pb.collection;

beforeEach(() => {
  originalCollection = pb.collection;

  pb.collection = ((name: string) => {
    if (name === 'donations') {
      return {
        getFullList: async (options: Record<string, unknown>) => {
          const filterStr = options.filter as string;
          return mockDonations.filter((d) => {
            if (filterStr.includes('marketingOptIn')) {
              return d.status === 'paid' && d.marketingOptIn === true;
            }
            return d.status === 'paid';
          });
        },
      };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;
});

afterEach(() => {
  pb.collection = originalCollection;
});

describe('resolveDonors', () => {
  it('resolves only opted-in donors when optInOnly is true', async () => {
    const recipients = await resolveDonors(true);
    assert.equal(recipients.length, 1);
    assert.equal(recipients[0].email, 'alice@example.com');
    assert.equal(recipients[0].name, 'Alice Smith');
  });

  it('does not include non-opted-in donors when optInOnly is true', async () => {
    const recipients = await resolveDonors(true);
    const emails = recipients.map((r) => r.email);
    assert.ok(!emails.includes('bob@example.com'));
  });

  it('includes all paid donors when optInOnly is false', async () => {
    const recipients = await resolveDonors(false);
    assert.equal(recipients.length, 2);
    const emails = recipients.map((r) => r.email);
    assert.ok(emails.includes('alice@example.com'));
    assert.ok(emails.includes('bob@example.com'));
  });

  it('deduplicates by email, keeping the first entry', async () => {
    const recipients = await resolveDonors(false);
    const alice = recipients.find((r) => r.email === 'alice@example.com');
    assert.ok(alice);
    // First entry (don1) has name 'Alice Smith', not 'Alice Smith Again'
    assert.equal(alice.name, 'Alice Smith');
  });

  it('returns correct CommunicationRecipient shape', async () => {
    const recipients = await resolveDonors(true);
    assert.equal(recipients.length, 1);
    const r = recipients[0];
    assert.ok(r.id);
    assert.equal(typeof r.email, 'string');
    assert.equal(typeof r.name, 'string');
    assert.equal(r.phone, '');
    assert.equal(r.voicePart, 'Donor');
    assert.equal(r.globalStatus, 'Paid');
  });
});
