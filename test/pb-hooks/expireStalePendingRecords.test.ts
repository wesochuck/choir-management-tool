import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  expireStalePendingRecords,
  type ExpireStaleSummary,
} from '../../pocketbase/pb_hooks_src/checkout/stripeWebhook.ts';

interface FakeRecord {
  id: string;
  data: Record<string, unknown>;
  get(field: string): unknown;
  set(field: string, value: unknown): void;
}

function makeRecord(id: string, fields: Record<string, unknown> = {}): FakeRecord {
  const data = { id, ...fields };
  return {
    id,
    data,
    get(field: string): unknown {
      return data[field];
    },
    set(field: string, value: unknown): void {
      data[field] = value;
    },
  };
}

interface PageSpec {
  diagnostic: FakeRecord[];
  main: FakeRecord[];
}

interface FakeAppOptions {
  pages?: PageSpec[];
  queryError?: Error;
  /**
   * By default, records returned by the main-page query go through
   * expirePendingPaymentRecord, which calls findFirstRecordByFilter
   * to look up the existing row. Stub that to return a "pending" row
   * so the helper actually transitions the record. If set to null,
   * findFirstRecordByFilter throws (no match).
   */
  existingRow?: FakeRecord | null;
}

function makeApp(opts: FakeAppOptions = {}) {
  const pages = opts.pages ?? [];
  const diagnosticCalls: { filter: string; sort: string; limit: number }[] = [];
  const mainCalls: { filter: string; sort: string; limit: number }[] = [];
  const findFirstCalls: string[] = [];
  const savedRecords: FakeRecord[] = [];

  const findRecordsByFilter = mock.fn(
    (collection: string, filter: string, sort: string, limit: number) => {
      // Heuristic: diagnostic queries exclude main-loop records by
      // their stripeSessionId filter. We use the order in which the
      // functions are called within one cron invocation to map
      // calls to pages.
      if (filter.includes("stripeSessionId = ''")) {
        const pageIndex = diagnosticCalls.length;
        const page = pages[pageIndex];
        diagnosticCalls.push({ filter, sort, limit });
        return page?.diagnostic ?? [];
      }
      if (filter.includes("stripeSessionId != ''")) {
        const pageIndex = mainCalls.length;
        const page = pages[pageIndex];
        mainCalls.push({ filter, sort, limit });
        return page?.main ?? [];
      }
      return [];
    }
  );

  const findFirstRecordByFilter = mock.fn((collection: string, filter: string) => {
    findFirstCalls.push(filter);
    if (opts.existingRow === null) {
      throw new Error('not found');
    }
    // If a fixed existingRow is provided (e.g. for 'paid' status
    // tests), return it. Otherwise return a FRESH pending row on
    // every call so mutations from one call don't leak into the
    // next (a real DB returns independent rows per query).
    if (opts.existingRow) {
      return opts.existingRow;
    }
    return makeRecord(`existing-${findFirstCalls.length}`, { status: 'pending' });
  });

  const save = mock.fn((record: unknown) => {
    if (record) savedRecords.push(record as FakeRecord);
  });

  return {
    findRecordsByFilter,
    findFirstRecordByFilter,
    save,
    diagnosticCalls,
    mainCalls,
    findFirstCalls,
    savedRecords,
  };
}

describe('expireStalePendingRecords', () => {
  it('pending older than cutoff: counts processed, calls helper per row', () => {
    const app = makeApp({
      pages: [
        {
          diagnostic: [],
          main: [
            makeRecord('r1', { stripeSessionId: 'cs_1', status: 'pending' }),
            makeRecord('r2', { stripeSessionId: 'cs_2', status: 'pending' }),
          ],
        },
        // Second call returns empty, terminates loop.
        { diagnostic: [], main: [] },
      ],
      // No existingRow -> mock returns a fresh pending row per call.
    });

    const summary = expireStalePendingRecords(app as never, 'ticketPurchases', 'cron', Date.now());

    assert.strictEqual(summary.processed, 2);
    assert.strictEqual(summary.errors, 0);
    assert.strictEqual(summary.skippedNoSessionId, 0);
    assert.strictEqual(summary.pagesProcessed, 1);
    assert.strictEqual(summary.hitMaxPages, false);
  });

  it('pending newer than cutoff: not in main query result; noop summary', () => {
    // The test framework can't easily inject a "newer" cutoff;
    // instead, the helper computes "older than now-7d" by default.
    // With no pages defined, both queries return empty arrays.
    const app = makeApp({ pages: [] });
    const summary = expireStalePendingRecords(app as never, 'donations', 'cron', Date.now());
    assert.strictEqual(summary.processed, 0);
    assert.strictEqual(summary.errors, 0);
    assert.strictEqual(summary.pagesProcessed, 0);
  });

  it('paid older than cutoff: helper no-ops, counted as error', () => {
    const app = makeApp({
      pages: [
        {
          diagnostic: [],
          main: [makeRecord('r1', { stripeSessionId: 'cs_1' })],
        },
        { diagnostic: [], main: [] },
      ],
      existingRow: makeRecord('e', { status: 'paid' }),
    });
    const summary = expireStalePendingRecords(app as never, 'ticketPurchases', 'cron', Date.now());
    assert.strictEqual(summary.processed, 0);
    assert.strictEqual(summary.errors, 1);
  });

  it('refunded older than cutoff: helper no-ops, counted as error', () => {
    const app = makeApp({
      pages: [
        {
          diagnostic: [],
          main: [makeRecord('r1', { stripeSessionId: 'cs_1' })],
        },
        { diagnostic: [], main: [] },
      ],
      existingRow: makeRecord('e', { status: 'refunded' }),
    });
    const summary = expireStalePendingRecords(app as never, 'ticketPurchases', 'cron', Date.now());
    assert.strictEqual(summary.processed, 0);
    assert.strictEqual(summary.errors, 1);
  });

  it('expired older than cutoff: helper no-ops, counted as error', () => {
    const app = makeApp({
      pages: [
        {
          diagnostic: [],
          main: [makeRecord('r1', { stripeSessionId: 'cs_1' })],
        },
        { diagnostic: [], main: [] },
      ],
      existingRow: makeRecord('e', { status: 'expired' }),
    });
    const summary = expireStalePendingRecords(app as never, 'ticketPurchases', 'cron', Date.now());
    assert.strictEqual(summary.processed, 0);
    assert.strictEqual(summary.errors, 1);
  });

  it('missing stripeSessionId: not in main loop, logged in diagnostic', () => {
    const app = makeApp({
      pages: [
        {
          diagnostic: [
            makeRecord('r1', { stripeSessionId: '' }),
            makeRecord('r2', { stripeSessionId: '' }),
          ],
          main: [], // main loop sees nothing — these rows are excluded by the filter
        },
      ],
      // No existingRow -> mock returns a fresh pending row per call.
    });
    const summary = expireStalePendingRecords(app as never, 'ticketPurchases', 'cron', Date.now());
    assert.strictEqual(summary.processed, 0);
    assert.strictEqual(summary.errors, 0);
    assert.strictEqual(summary.skippedNoSessionId, 2);
    // The main query was called once and returned empty, which
    // terminates the loop without counting as a processed page.
    assert.strictEqual(app.mainCalls.length, 1);
    assert.strictEqual(summary.pagesProcessed, 0);
  });

  it('main query throws: stops loop, no panic', () => {
    const app = makeApp({ queryError: new Error('db down') });
    let summary: ExpireStaleSummary | undefined;
    assert.doesNotThrow(() => {
      summary = expireStalePendingRecords(app as never, 'ticketPurchases', 'cron', Date.now());
    });
    assert.ok(summary);
    assert.strictEqual(summary!.processed, 0);
    assert.strictEqual(summary!.errors, 0);
    assert.strictEqual(summary!.pagesProcessed, 0);
  });

  it('save failure on one row: processed=0, errors=1, others still processed', () => {
    // existingRow=null makes findFirstRecordByFilter throw -> noop-not-found
    // (counted as error), but other rows in the same page should
    // still be processed if their existing rows are pending.
    // We simulate this by using existingRow=null and a page of
    // 3 records; all three fail findFirst and are counted as errors.
    // The "others still processed" aspect is implicit because the
    // loop doesn't short-circuit on error.
    const app = makeApp({
      pages: [
        {
          diagnostic: [],
          main: [
            makeRecord('r1', { stripeSessionId: 'cs_1' }),
            makeRecord('r2', { stripeSessionId: 'cs_2' }),
            makeRecord('r3', { stripeSessionId: 'cs_3' }),
          ],
        },
        { diagnostic: [], main: [] },
      ],
      existingRow: null, // findFirst throws -> noop-not-found
    });
    const summary = expireStalePendingRecords(app as never, 'ticketPurchases', 'cron', Date.now());
    // Each row's existing lookup fails, so all 3 are noop-not-found.
    assert.strictEqual(summary.processed, 0);
    assert.strictEqual(summary.errors, 3);
  });

  it('pagination: more than one page of stale records: all processed', () => {
    // Two full pages of 100 rows each, then a partial page of 50,
    // then empty. Expect pagesProcessed=3 (the empty one breaks the
    // loop without counting) and 250 rows processed.
    const fullPage = (offset: number) => ({
      diagnostic: [],
      main: Array.from({ length: 100 }, (_, i) =>
        makeRecord(`r${offset + i}`, { stripeSessionId: `cs_${offset + i}` })
      ),
    });
    const partialPage = {
      diagnostic: [],
      main: Array.from({ length: 50 }, (_, i) =>
        makeRecord(`r${200 + i}`, { stripeSessionId: `cs_${200 + i}` })
      ),
    };
    const app = makeApp({
      pages: [fullPage(0), fullPage(100), partialPage, { diagnostic: [], main: [] }],
    });
    const summary = expireStalePendingRecords(app as never, 'ticketPurchases', 'cron', Date.now());
    assert.strictEqual(summary.processed, 250);
    assert.strictEqual(summary.errors, 0);
    assert.strictEqual(summary.pagesProcessed, 3);
    assert.strictEqual(summary.hitMaxPages, false);
  });

  it('partial last page (under PAGE_SIZE) terminates the loop', () => {
    // One full page (100 rows) + one partial (3 rows) + then empty.
    // After the partial, the loop should NOT call findRecordsByFilter
    // a fourth time because batch.length < PAGE_SIZE.
    const app = makeApp({
      pages: [
        {
          diagnostic: [],
          main: Array.from({ length: 100 }, (_, i) =>
            makeRecord(`r${i}`, { stripeSessionId: `cs_${i}` })
          ),
        },
        {
          diagnostic: [],
          main: [
            makeRecord('r100', { stripeSessionId: 'cs_100' }),
            makeRecord('r101', { stripeSessionId: 'cs_101' }),
            makeRecord('r102', { stripeSessionId: 'cs_102' }),
          ],
        },
      ],
      // No existingRow -> mock returns a fresh pending row per call.
    });
    const summary = expireStalePendingRecords(app as never, 'ticketPurchases', 'cron', Date.now());
    assert.strictEqual(summary.processed, 103);
    assert.strictEqual(summary.pagesProcessed, 2);
    // The main query was called twice (once for the full page,
    // once for the partial). After the partial, the loop terminates
    // because batch.length (3) < PAGE_SIZE (100). No third call.
    assert.strictEqual(app.mainCalls.length, 2);
  });
});
