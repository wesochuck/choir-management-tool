import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLocalStorage } from '../src/lib/storage.ts';

test('safeLocalStorage.getItem returns value when successful', () => {
  const originalLocalStorage = globalThis.localStorage;

  globalThis.localStorage = {
    ...originalLocalStorage,
    getItem: (key) => key === 'some_key' ? 'some_value' : null
  } as unknown as Storage;

  try {
    const value = safeLocalStorage.getItem('some_key');
    assert.equal(value, 'some_value');
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('safeLocalStorage.getItem returns null and ignores errors silently', () => {
  const originalLocalStorage = globalThis.localStorage;
  let didThrow = false;

  globalThis.localStorage = {
    ...originalLocalStorage,
    getItem: () => {
      didThrow = true;
      throw new Error('Access Denied');
    }
  } as unknown as Storage;

  try {
    let value: string | null = 'not_null';
    assert.doesNotThrow(() => {
      value = safeLocalStorage.getItem('some_key');
    });

    assert.equal(value, null);
    assert.equal(didThrow, true);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('safeLocalStorage.setItem sets value when successful', () => {
  const originalLocalStorage = globalThis.localStorage;
  const store: Record<string, string> = {};

  globalThis.localStorage = {
    ...originalLocalStorage,
    setItem: (key, value) => { store[key] = value; }
  } as unknown as Storage;

  try {
    safeLocalStorage.setItem('some_key', 'some_value');
    assert.equal(store['some_key'], 'some_value');
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('safeLocalStorage.setItem ignores errors silently', () => {
  const originalLocalStorage = globalThis.localStorage;
  let didThrow = false;

  globalThis.localStorage = {
    ...originalLocalStorage,
    setItem: () => {
      didThrow = true;
      throw new Error('Access Denied');
    }
  } as unknown as Storage;

  try {
    assert.doesNotThrow(() => {
      safeLocalStorage.setItem('some_key', 'some_value');
    });

    assert.equal(didThrow, true);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('safeLocalStorage.removeItem removes value when successful', () => {
  const originalLocalStorage = globalThis.localStorage;
  const store: Record<string, string> = { 'some_key': 'some_value' };

  globalThis.localStorage = {
    ...originalLocalStorage,
    removeItem: (key) => { delete store[key]; }
  } as unknown as Storage;

  try {
    safeLocalStorage.removeItem('some_key');
    assert.equal(store['some_key'], undefined);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('safeLocalStorage.removeItem ignores errors silently', () => {
  // Mock localStorage to throw an error on removeItem
  const originalLocalStorage = globalThis.localStorage;
  let didThrow = false;

  globalThis.localStorage = {
    ...originalLocalStorage,
    removeItem: () => {
      didThrow = true;
      throw new Error('Access Denied');
    }
  } as unknown as Storage;

  try {
    // Assert that calling safeLocalStorage.removeItem does NOT throw
    assert.doesNotThrow(() => {
      safeLocalStorage.removeItem('some_key');
    });

    // Assert that the mocked method was actually called
    assert.equal(didThrow, true);
  } finally {
    // Restore global localStorage
    globalThis.localStorage = originalLocalStorage;
  }
});
