import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLocalStorage } from '../src/lib/storage.ts';

test('safeLocalStorage', async (t) => {
  const originalLocalStorage = global.localStorage;
  const originalWarn = console.warn;

  t.afterEach(() => {
    global.localStorage = originalLocalStorage;
    console.warn = originalWarn;
  });

  await t.test('setItem error path does not crash', () => {
    global.localStorage = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;

    assert.doesNotThrow(() => {
      safeLocalStorage.setItem('test_key', 'test_value');
    });
  });

  await t.test('getItem error path does not crash and returns null', () => {
    global.localStorage = {
      getItem: () => {
        throw new Error('Access denied');
      },
    } as unknown as Storage;

    let result;
    assert.doesNotThrow(() => {
      result = safeLocalStorage.getItem('test_key');
    });
    assert.equal(result, null);
  });

  await t.test('removeItem error path does not crash', () => {
    global.localStorage = {
      removeItem: () => {
        throw new Error('Access denied');
      },
    } as unknown as Storage;

    assert.doesNotThrow(() => {
      safeLocalStorage.removeItem('test_key');
    });
  });

  await t.test('happy paths work as expected', () => {
    const store = new Map<string, string>();
    global.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    } as unknown as Storage;

    safeLocalStorage.setItem('key1', 'val1');
    assert.equal(safeLocalStorage.getItem('key1'), 'val1');
    assert.equal(store.get('key1'), 'val1');

    safeLocalStorage.removeItem('key1');
    assert.equal(safeLocalStorage.getItem('key1'), null);
    assert.equal(store.has('key1'), false);
  });

  await t.test('special characters round trip unchanged', () => {
    const store = new Map<string, string>();
    global.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    } as unknown as Storage;

    const specialString = 'Hello World! 🌍 ñ ♠ © %20 & < > " \'';
    safeLocalStorage.setItem('display_preference', specialString);
    assert.equal(safeLocalStorage.getItem('display_preference'), specialString);
  });

  await t.test('refuses to store or return sensitive keys', () => {
    const store = new Map<string, string>();
    const warnings: string[] = [];
    console.warn = (message?: unknown) => warnings.push(String(message));
    global.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    } as unknown as Storage;

    store.set('auth_token', 'legacy-secret');
    safeLocalStorage.setItem('session_token', 'new-secret');

    assert.equal(safeLocalStorage.getItem('auth_token'), null);
    assert.equal(store.has('session_token'), false);
    assert.equal(warnings.length, 1);
  });
});
