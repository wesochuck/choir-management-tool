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
