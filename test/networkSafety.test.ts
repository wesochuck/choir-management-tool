import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkArray, getHttpStatus, isRateLimitError, mapWithConcurrency, retryOn429 } from '../src/lib/networkSafety.ts';

test('chunkArray splits values into stable chunks', () => {
  assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunkArray([1, 2, 3], 0), [[1], [2], [3]]);
});

test('getHttpStatus reads common error shapes', () => {
  assert.equal(getHttpStatus({ status: 429 }), 429);
  assert.equal(getHttpStatus({ response: { status: 503 } }), 503);
  assert.equal(getHttpStatus({ data: { status: 401 } }), 401);
  assert.equal(getHttpStatus({}), null);
});

test('getHttpStatus handles edge cases and invalid shapes', () => {
  // Primitives and falsy values
  assert.equal(getHttpStatus(null), null);
  assert.equal(getHttpStatus(undefined), null);
  assert.equal(getHttpStatus('error string'), null);
  assert.equal(getHttpStatus(123), null);
  assert.equal(getHttpStatus(true), null);
  assert.equal(getHttpStatus([]), null);

  // Invalid direct status values
  assert.equal(getHttpStatus({ status: '404' }), null);
  assert.equal(getHttpStatus({ status: null }), null);
  assert.equal(getHttpStatus({ status: undefined }), null);
  assert.equal(getHttpStatus({ status: {} }), null);
  assert.equal(getHttpStatus({ status: NaN }), null);
  assert.equal(getHttpStatus({ status: Infinity }), null);
  assert.equal(getHttpStatus({ status: -Infinity }), null);

  // Invalid nested status values
  assert.equal(getHttpStatus({ data: 'string' }), null);
  assert.equal(getHttpStatus({ data: null }), null);
  assert.equal(getHttpStatus({ data: { status: '404' } }), null);
  assert.equal(getHttpStatus({ response: null }), null);
  assert.equal(getHttpStatus({ response: { status: NaN } }), null);

  // Arrays
  assert.equal(getHttpStatus([404]), null);
});

test('isRateLimitError detects 429 status and message fallback', () => {
  assert.equal(isRateLimitError({ status: 429 }), true);
  assert.equal(isRateLimitError(new Error('rate limit exceeded')), true);
  assert.equal(isRateLimitError(new Error('network timeout')), false);
});

test('retryOn429 retries with backoff then succeeds', async () => {
  let attempts = 0;
  const waits: number[] = [];

  const result = await retryOn429(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw { status: 429 };
      }
      return 'ok';
    },
    {
      baseDelayMs: 100,
      maxRetries: 4,
      jitterRatio: 0,
      sleep: async (ms: number) => {
        waits.push(ms);
      },
      random: () => 0.5,
    },
  );

  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [100, 200]);
});

test('retryOn429 does not retry non-429 errors', async () => {
  let attempts = 0;

  await assert.rejects(
    () =>
      retryOn429(
        async () => {
          attempts += 1;
          throw new Error('boom');
        },
        {
          sleep: async () => {},
        },
      ),
    /boom/,
  );

  assert.equal(attempts, 1);
});

test('mapWithConcurrency enforces in-flight cap and preserves order', async () => {
  const items = [1, 2, 3, 4, 5, 6];
  let inFlight = 0;
  let maxInFlight = 0;

  const results = await mapWithConcurrency(
    items,
    async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      await new Promise<void>((resolve) => setTimeout(resolve, 5));

      inFlight -= 1;
      return item * 10;
    },
    { concurrency: 3 },
  );

  assert.deepEqual(results, [10, 20, 30, 40, 50, 60]);
  assert.equal(maxInFlight <= 3, true);
});
