/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    projects: [
      {
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: [path.resolve(import.meta.dirname, './test/setup-dom.ts')],
          testTimeout: 30000,
          include: [
            'src/components/ui/**/*.test.{ts,tsx}',
            'src/components/admin/**/*.test.{ts,tsx}',
            'src/hooks/**/*.test.{ts,tsx}',
            'test/views/**/*.test.{ts,tsx}',
            'test/**/*.test.tsx',
            'test/eventCardSetList.test.ts',
            'test/useVoiceParts.test.ts',
            'test/attendanceRsvpSync.test.ts',
            'test/eventRosterTable.test.ts',
            'test/usePublicBundle.test.ts',
            'test/useEvents.test.ts',
            'test/usePublicEvent.test.ts',
          ],
          globals: true,
          alias: {
            'node:test': path.resolve(import.meta.dirname, './test/vitest-node-test-compat.ts'),
          },
        },
      },
      {
        test: {
          name: 'node',
          environment: 'node',
          testTimeout: 30000,
          include: ['test/**/*.test.ts'],
          exclude: [
            'test/views/**/*.test.ts',
            'test/eventCardSetList.test.ts',
            'test/useVoiceParts.test.ts',
            'test/attendanceRsvpSync.test.ts',
            'test/eventRosterTable.test.ts',
            'test/usePublicBundle.test.ts',
            'test/useEvents.test.ts',
            'test/usePublicEvent.test.ts',
          ],
          globals: true,
          alias: {
            'node:test': path.resolve(import.meta.dirname, './test/vitest-node-test-compat.ts'),
          },
        },
      },
    ],
    testTimeout: 30000,
  },
});
