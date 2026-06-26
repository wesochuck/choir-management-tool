import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  expirePendingPaymentRecord,
  type ExpireResult,
} from '../../pocketbase/pb_hooks_src/checkout/stripeWebhook.ts';

interface FakeRecord {
  id: string;
  data: Record<string, unknown>;
  get(field: string): unknown;
  set(field: string, value: unknown): void;
  saveCalls: number;
}

function makeRecord(data: Record<string, unknown>): FakeRecord {
  const rec: FakeRecord = {
    id: data.id as string,
    data,
    saveCalls: 0,
    get(field: string): unknown {
      return data[field];
    },
    set(field: string, value: unknown): void {
      data[field] = value;
    },
  };
  return rec;
}

interface FakeAppOptions {
  record?: FakeRecord | null;
  records?: FakeRecord[];
  findFirstError?: Error;
  saveError?: Error;
}

function makeApp(opts: FakeAppOptions = {}) {
  const findFirstRecordByFilter = mock.fn((collection: string, filter: string) => {
    if (opts.findFirstError) throw opts.findFirstError;
    if (opts.record !== undefined) {
      if (opts.record === null) {
        throw new Error('not found');
      }
      return opts.record;
    }
    return null;
  });

  const findRecordsByFilter = mock.fn(
    (collection: string, filter: string, sort: string, limit: number, offset: number) => {
      return opts.records ?? [];
    }
  );

  const save = mock.fn((record: unknown) => {
    if (opts.saveError) throw opts.saveError;
    if (record && typeof record === 'object' && 'saveCalls' in record) {
      (record as FakeRecord).saveCalls += 1;
    }
  });

  return { findFirstRecordByFilter, findRecordsByFilter, save };
}

describe('expirePendingPaymentRecord', () => {
  it('pending ticket: marks row expired, sets expiredAt, saves', () => {
    const record = makeRecord({ id: 't1', status: 'pending' });
    const app = makeApp({ record });
    const result = expirePendingPaymentRecord(
      app as never,
      'ticketPurchases',
      'cs_test_1',
      'webhook'
    );
    assert.strictEqual(result, 'expired');
    assert.strictEqual(record.data.status, 'expired');
    assert.ok(typeof record.data.expiredAt === 'string');
    assert.strictEqual(record.saveCalls, 1);
  });

  it('pending bundle: marks row expired', () => {
    const record = makeRecord({ id: 'b1', status: 'pending' });
    const app = makeApp({ record });
    const result = expirePendingPaymentRecord(
      app as never,
      'ticketPurchases',
      'cs_test_bundle',
      'webhook'
    );
    assert.strictEqual(result, 'expired');
    assert.strictEqual(record.data.status, 'expired');
  });

  it('pending donation: marks row expired', () => {
    const record = makeRecord({ id: 'd1', status: 'pending' });
    const app = makeApp({ record });
    const result = expirePendingPaymentRecord(
      app as never,
      'donations',
      'cs_test_donate',
      'webhook'
    );
    assert.strictEqual(result, 'expired');
    assert.strictEqual(record.data.status, 'expired');
  });

  it('paid: no-op, no save', () => {
    const record = makeRecord({ id: 't1', status: 'paid' });
    const app = makeApp({ record });
    const result = expirePendingPaymentRecord(
      app as never,
      'ticketPurchases',
      'cs_test_paid',
      'webhook'
    );
    assert.strictEqual(result, 'noop-already-paid');
    assert.strictEqual(record.data.status, 'paid');
    assert.strictEqual(record.saveCalls, 0);
    assert.strictEqual(record.data.expiredAt, undefined);
  });

  it('refunded: no-op, no save', () => {
    const record = makeRecord({ id: 't1', status: 'refunded' });
    const app = makeApp({ record });
    const result = expirePendingPaymentRecord(
      app as never,
      'ticketPurchases',
      'cs_test_refund',
      'webhook'
    );
    assert.strictEqual(result, 'noop-already-refunded');
    assert.strictEqual(record.data.status, 'refunded');
    assert.strictEqual(record.saveCalls, 0);
  });

  it('expired (duplicate event): no-op, no save, expiredAt unchanged', () => {
    const existingExpiredAt = '2026-06-26T07:00:00.000Z';
    const record = makeRecord({
      id: 't1',
      status: 'expired',
      expiredAt: existingExpiredAt,
    });
    const app = makeApp({ record });
    const result = expirePendingPaymentRecord(
      app as never,
      'ticketPurchases',
      'cs_test_dup',
      'webhook'
    );
    assert.strictEqual(result, 'noop-already-expired');
    assert.strictEqual(record.saveCalls, 0);
    assert.strictEqual(record.data.expiredAt, existingExpiredAt);
  });

  it('no matching row: noop-not-found, no save', () => {
    const app = makeApp({ record: null });
    const result = expirePendingPaymentRecord(
      app as never,
      'ticketPurchases',
      'cs_test_missing',
      'webhook'
    );
    assert.strictEqual(result, 'noop-not-found');
    assert.strictEqual(app.save.mock.callCount(), 0);
  });

  it('missing stripeSessionId: noop-missing-id, no save', () => {
    const result = expirePendingPaymentRecord(
      makeApp({}) as never,
      'ticketPurchases',
      '',
      'webhook'
    );
    assert.strictEqual(result, 'noop-missing-id');
  });

  it('findFirst throws (e.g. 404): noop-not-found, no save', () => {
    const app = makeApp({ findFirstError: new Error('not found') });
    const result = expirePendingPaymentRecord(
      app as never,
      'ticketPurchases',
      'cs_test_404',
      'webhook'
    );
    assert.strictEqual(result, 'noop-not-found');
    assert.strictEqual(app.save.mock.callCount(), 0);
  });

  it('save throws: returns noop-error, does not throw', () => {
    const record = makeRecord({ id: 't1', status: 'pending' });
    const app = makeApp({ record, saveError: new Error('save failed') });
    let result: ExpireResult = 'noop-error';
    assert.doesNotThrow(() => {
      result = expirePendingPaymentRecord(
        app as never,
        'ticketPurchases',
        'cs_test_save_fail',
        'cron'
      );
    });
    assert.strictEqual(result, 'noop-error');
  });
});
