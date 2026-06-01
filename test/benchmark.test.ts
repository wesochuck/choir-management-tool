import test from 'node:test';
import { musicLibraryWorkflows } from '../src/services/musicLibraryWorkflows.ts';
import { pb } from '../src/lib/pocketbase.ts';
import type { MusicPiece } from '../src/types/musicLibrary.ts';

test('benchmark createPieceWithMovementsAndTutti', async (t) => {
  const originalCollection = pb.collection;

  // mock create with delay
  pb.collection = function (name: string) {
    if (name === 'musicLibrary') {
      return {
        create: async (data: Record<string, unknown>) => {
          await new Promise(r => setTimeout(r, 10)); // 10ms artificial delay
          return { id: 'dummy', ...data } as unknown as MusicPiece;
        }
      } as any;
    }
    return originalCollection.call(pb, name);
  };

  const movements = Array.from({ length: 50 }, (_, i) => ({
    title: `Movement ${i}`,
    duration: '1:00'
  }));

  const start = performance.now();
  await musicLibraryWorkflows.createPieceWithMovementsAndTutti({
    title: 'Parent Piece'
  }, {
    movements
  });
  const end = performance.now();

  console.log(`\n=== BENCHMARK RESULT ===\nExecution time: ${end - start} ms\n========================\n`);

  pb.collection = originalCollection;
});
