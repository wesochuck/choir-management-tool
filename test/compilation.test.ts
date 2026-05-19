import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

test('codebase compiles cleanly without TypeScript or syntax errors', () => {
  try {
    execSync('npx tsc -b', { stdio: 'pipe' });
    assert.ok(true);
  } catch (error: any) {
    const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
    assert.fail(`TypeScript compilation failed:\n${output}`);
  }
});
