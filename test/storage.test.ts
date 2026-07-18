import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLocalStorage } from '../src/lib/storage.ts';

test('safeLocalStorage', async (t) => {
  const originalLocalStorage = global.localStorage;

  t.afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  await t.test('setItem error path does not crash', () => {
    global.localStorage = {
      setItem: () => { throw new Error('QuotaExceededError'); }
    } as unknown as Storage;

    assert.doesNotThrow(() => {
      safeLocalStorage.setItem('test_key', 'test_value');
    });
  });

  await t.test('getItem error path does not crash and returns null', () => {
    global.localStorage = {
      getItem: () => { throw new Error('Access denied'); }
    } as unknown as Storage;

    let result;
    assert.doesNotThrow(() => {
      result = safeLocalStorage.getItem('test_key');
    });
    assert.equal(result, null);
  });

  await t.test('removeItem error path does not crash', () => {
    global.localStorage = {
      removeItem: () => { throw new Error('Access denied'); }
    } as unknown as Storage;

    assert.doesNotThrow(() => {
      safeLocalStorage.removeItem('test_key');
    });
  });

  await t.test('happy paths work as expected with encryption', () => {
    const store = new Map<string, string>();
    global.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k)
    } as unknown as Storage;

    // Test normal save & load
    safeLocalStorage.setItem('key1', 'val1');
    assert.equal(safeLocalStorage.getItem('key1'), 'val1');

    // Verify it's actually encrypted in the underlying storage
    const storedValue = store.get('key1');
    assert.ok(storedValue?.startsWith('ENC:1:'), 'Stored value should have encryption prefix');
    assert.notEqual(storedValue, 'val1', 'Stored value should not be plaintext');

    // Test remove
    safeLocalStorage.removeItem('key1');
    assert.equal(safeLocalStorage.getItem('key1'), null);
    assert.equal(store.has('key1'), false);
  });

  await t.test('encryption handles special characters correctly', () => {
    const store = new Map<string, string>();
    global.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k)
    } as unknown as Storage;

    const specialString = 'Hello World! 🌍 ñ ♠ © %20 & < > " \'';
    safeLocalStorage.setItem('special_key', specialString);
    assert.equal(safeLocalStorage.getItem('special_key'), specialString);
  });

  await t.test('reads unencrypted legacy data successfully', () => {
    const store = new Map<string, string>();
    global.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k)
    } as unknown as Storage;

    // Simulate pre-existing unencrypted data
    store.set('legacy_key', 'unencrypted_legacy_value');

    // Should read it perfectly without failing
    assert.equal(safeLocalStorage.getItem('legacy_key'), 'unencrypted_legacy_value');
  });
});
