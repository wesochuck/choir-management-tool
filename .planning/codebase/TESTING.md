# Testing Patterns

**Analysis Date:** 2026-05-26

## Test Framework

**Runner:**
- Node.js Native Test Runner (`node:test`)
- Config: Managed via CLI flags in `package.json` scripts.

**Assertion Library:**
- `node:assert` (Strict mode)

**Run Commands:**
```bash
npm test               # Run all tests in test/ and test/pb-hooks/
npm run check:pb-hooks # Generate pb_hooks and run integrity tests
```

## Test File Organization

**Location:**
- Separate directory: `test/`
- Backend hook tests: `test/pb-hooks/`

**Naming:**
- `[module].test.ts` (e.g., `eventService.test.ts`, `playerService.test.ts`)

**Structure:**
```
test/
├── pb-hooks/             # Tests for PocketBase JS hooks
├── helpers.ts            # Test utilities and fixtures
├── loader.js             # Custom loader for Node.js tests
├── register.js           # Register hooks for Node.js tests
└── [module].test.ts      # Unit tests for services, hooks, and utils
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { myService } from '../src/services/myService';

describe('myService', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  describe('myMethod', () => {
    it('should perform a specific action', async () => {
      const result = await myService.myMethod();
      assert.strictEqual(result, expectedValue);
    });
  });
});
```

**Patterns:**
- **Setup pattern:** `beforeEach` is used to reset mocks and initialize common test data.
- **Teardown pattern:** `afterEach` for cleaning up global overrides (like `pb.send`).
- **Assertion pattern:** Use `node:assert` strict methods (`strictEqual`, `deepStrictEqual`).

## Mocking

**Framework:** `node:test` built-in `mock` utility.

**Patterns:**
```typescript
// Mocking a method on a global/shared instance
mock.method(pb.files, 'getURL', (piece: any, filename: string) => {
  return `https://mock-url/${filename}`;
});

// Mocking the pb.send method for API calls
let originalSend = pb.send;
pb.send = (async (path: string, options?: any) => {
  // Mock implementation
}) as typeof pb.send;
// Restore in afterEach
pb.send = originalSend;
```

**What to Mock:**
- Network requests (PocketBase API calls).
- Browser APIs (if running in Node environment).
- File system operations.

**What NOT to Mock:**
- Pure utility functions.
- Domain logic that can be tested in isolation.

## Fixtures and Factories

**Test Data:**
```typescript
export function createMusicPieceFixture(overrides: Partial<MusicPiece> = {}): MusicPiece {
  return {
    id: 'piece-' + Math.random().toString(36).substr(2, 9),
    title: 'Default Piece Title',
    collectionId: 'pbc_music_library_001',
    collectionName: 'musicLibrary',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...overrides
  } as MusicPiece;
}
```

**Location:**
- Shared fixtures live in `test/helpers.ts`.

## Coverage

**Requirements:** None enforced in `package.json` scripts, but the codebase has extensive test coverage for core services and utilities.

**View Coverage:**
Not explicitly configured in `package.json`. Standard Node.js coverage tools (like `c8`) would be required.

## Test Types

**Unit Tests:**
- Focus on services (`src/services/`), hooks (`src/hooks/`), and utilities (`src/lib/`).
- Extensive use of mocks for the PocketBase SDK.

**Integration Tests:**
- `test/pb-hooks/integrity.test.ts` checks the generated PocketBase hooks.
- `test/codebaseIntegrity.test.ts` performs cross-module consistency checks.

**E2E Tests:**
- Not explicitly detected in the current structure.

## Common Patterns

**Async Testing:**
- Use `async` in `it` blocks and `await` for service calls.

**Error Testing:**
- Assert that functions throw or return error states when given invalid input or when services fail.

**PocketBase Specifics:**
- Testing defensive parsing of Goja VM `[]uint8` byte arrays.
- Testing `parseJsonField` with various input types (strings, objects, byte arrays).

---

*Testing analysis: 2026-05-26*
