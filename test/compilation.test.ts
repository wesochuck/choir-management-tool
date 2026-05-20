import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

test('codebase compiles cleanly without TypeScript or syntax errors', () => {
  try {
    execSync('npx tsc -b', { stdio: 'pipe' });
    assert.ok(true);
  } catch (error: unknown) {
    const commandError = error as { stdout?: Buffer; stderr?: Buffer; message?: string };
    const output = commandError.stdout?.toString() || commandError.stderr?.toString() || commandError.message;
    assert.fail(`TypeScript compilation failed:\n${output}`);
  }
});
