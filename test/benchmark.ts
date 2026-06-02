import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'perf_hooks';

// Simulate network latency
const mockDelay = 50;

interface RehearsalInput {
  title: string;
}

async function mockCreate<T extends object>(data: T): Promise<T & { id: string }> {
  await new Promise(resolve => setTimeout(resolve, mockDelay));
  return { id: Math.random().toString(), ...data };
}

async function originalBulkCreateRehearsals(rehearsals: RehearsalInput[]) {
    const results = [];
    for (const r of rehearsals.reverse()) {
       const res = await mockCreate(r);
       results.push(res);
    }
    return results;
}

async function optimizedBulkCreateRehearsals(rehearsals: RehearsalInput[]) {
    // We reverse here so it matches original behavior
    const reversedRehearsals = [...rehearsals].reverse();
    return await Promise.all(reversedRehearsals.map(r => mockCreate(r)));
}

test('Benchmark: Optimized bulk create should be faster than sequential', async (t) => {
  const configCount = 20;
  const rehearsals = Array.from({ length: configCount }, (_, i) => ({ title: `Rehearsal ${i}` }));

  t.diagnostic(`Starting benchmark for ${configCount} rehearsals with ${mockDelay}ms simulated network latency...`);

  // Warmup
  await originalBulkCreateRehearsals([...rehearsals]);
  await optimizedBulkCreateRehearsals([...rehearsals]);

  t.diagnostic('--- Original Implementation (Sequential) ---');
  const start1 = performance.now();
  await originalBulkCreateRehearsals([...rehearsals]);
  const end1 = performance.now();
  const timeOriginal = end1 - start1;
  t.diagnostic(`Time: ${timeOriginal.toFixed(2)}ms`);

  t.diagnostic('--- Optimized Implementation (Parallel Promise.all) ---');
  const start2 = performance.now();
  await optimizedBulkCreateRehearsals([...rehearsals]);
  const end2 = performance.now();
  const timeOptimized = end2 - start2;
  t.diagnostic(`Time: ${timeOptimized.toFixed(2)}ms`);

  t.diagnostic(`Improvement: ${timeOriginal.toFixed(2)}ms -> ${timeOptimized.toFixed(2)}ms`);
  t.diagnostic(`Speedup: ${(timeOriginal / timeOptimized).toFixed(2)}x faster`);

  assert.ok(timeOptimized < timeOriginal, 'Optimized version should be faster than sequential');
  assert.ok((timeOriginal / timeOptimized) > 1.5, 'Optimized version should be at least 1.5x faster');
});
