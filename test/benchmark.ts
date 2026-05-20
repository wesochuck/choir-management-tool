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

async function runBenchmark() {
  const configCount = 20;
  const rehearsals = Array.from({ length: configCount }, (_, i) => ({ title: `Rehearsal ${i}` }));

  console.log(`Starting benchmark for ${configCount} rehearsals with ${mockDelay}ms simulated network latency...`);

  // Warmup
  await originalBulkCreateRehearsals([...rehearsals]);
  await optimizedBulkCreateRehearsals([...rehearsals]);

  console.log('--- Original Implementation (Sequential) ---');
  const start1 = performance.now();
  await originalBulkCreateRehearsals([...rehearsals]);
  const end1 = performance.now();
  const timeOriginal = end1 - start1;
  console.log(`Time: ${timeOriginal.toFixed(2)}ms`);

  console.log('--- Optimized Implementation (Parallel Promise.all) ---');
  const start2 = performance.now();
  await optimizedBulkCreateRehearsals([...rehearsals]);
  const end2 = performance.now();
  const timeOptimized = end2 - start2;
  console.log(`Time: ${timeOptimized.toFixed(2)}ms`);

  console.log(`\nImprovement: ${timeOriginal.toFixed(2)}ms -> ${timeOptimized.toFixed(2)}ms`);
  console.log(`Speedup: ${(timeOriginal / timeOptimized).toFixed(2)}x faster`);
}

runBenchmark().catch(console.error);
