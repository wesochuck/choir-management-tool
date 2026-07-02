import {
  test as viTest,
  it as viIt,
  describe as viDescribe,
  beforeEach as viBeforeEach,
  afterEach as viAfterEach,
  beforeAll as viBeforeAll,
  afterAll as viAfterAll,
  vi,
} from 'vitest';

const mutatingMethods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'reverse',
  'sort',
  'copyWithin',
  'fill',
];

interface NodeCompatMock {
  mock: {
    _isEnhanced?: boolean;
    callCount?: () => number;
    resetCalls?: () => void;
    mockImplementation?: (fn: Function) => unknown;
    calls: Array<{ arguments: unknown[] }>;
  };
  mockClear: () => void;
  mockImplementation: (fn: Function) => unknown;
}

function enhanceVitestMock(vitestMock: unknown): NodeCompatMock {
  const compatMock = vitestMock as NodeCompatMock;
  const originalMock = compatMock.mock;
  if (!originalMock) return compatMock;

  // Prevent double wrapping
  if (originalMock._isEnhanced) return compatMock;
  originalMock._isEnhanced = true;

  Object.defineProperty(originalMock, 'callCount', {
    value() {
      return originalMock.calls.length;
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(originalMock, 'resetCalls', {
    value() {
      compatMock.mockClear();
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(originalMock, 'mockImplementation', {
    value(fn: Function) {
      return compatMock.mockImplementation(fn);
    },
    writable: true,
    configurable: true,
  });

  const rawCalls = originalMock.calls as unknown as unknown[][];
  const callsProxy = new Proxy(rawCalls, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && !isNaN(Number(prop))) {
        const args = target[Number(prop)];
        if (args === undefined) return undefined;
        return { arguments: args };
      }
      const val = Reflect.get(target, prop, receiver);
      if (
        typeof val === 'function' &&
        typeof prop === 'string' &&
        !mutatingMethods.includes(prop)
      ) {
        return function (this: unknown, ...args: unknown[]) {
          const mappedArray = target.map((v) => ({ arguments: v }));
          return (mappedArray as unknown as Record<string, Function>)[prop](...args);
        };
      }
      return val;
    },
  });

  Object.defineProperty(originalMock, 'calls', {
    value: callsProxy,
    writable: true,
    configurable: true,
  });

  return compatMock;
}

function createCompatMockFn(originalFn?: Function) {
  const vitestMock = vi.fn(originalFn as (...args: unknown[]) => unknown);
  return enhanceVitestMock(vitestMock);
}

export const mock = {
  fn: createCompatMockFn,
  method: (object: unknown, methodName: string, mockImplementation?: Function) => {
    const obj = object as Record<string, Function>;
    const spy = vi.spyOn(obj, methodName as never);
    enhanceVitestMock(spy);
    if (mockImplementation) {
      (spy as unknown as { mockImplementation: (fn: Function) => unknown }).mockImplementation(
        mockImplementation
      );
    }
    return spy;
  },
  restoreAll: () => {
    vi.restoreAllMocks();
  },
  reset: () => {
    vi.resetAllMocks();
  },
  timers: {
    enable: () => vi.useFakeTimers(),
    reset: () => vi.useRealTimers(),
    tick: (ms: number) => vi.advanceTimersByTime(ms),
  },
};

function createCompatContext(cleanups: Function[]) {
  const t = {
    mock: {
      fn: createCompatMockFn,
      method: (object: unknown, methodName: string, mockImplementation?: Function) => {
        const obj = object as Record<string, Function>;
        const spy = vi.spyOn(obj, methodName as never);
        enhanceVitestMock(spy);
        if (mockImplementation) {
          (spy as unknown as { mockImplementation: (fn: Function) => unknown }).mockImplementation(
            mockImplementation
          );
        }
        return spy;
      },
    },
    test: async (subName: string, subFn: Function) => {
      return await subFn(t);
    },
    diagnostic: (message: string) => {
      console.log(`[Diagnostic] ${message}`);
    },
    afterEach: (cleanupFn: Function) => {
      cleanups.push(cleanupFn);
    },
    after: (cleanupFn: Function) => {
      cleanups.push(cleanupFn);
    },
  };
  return t;
}

function wrapTestCallback(fn?: Function) {
  if (!fn) return undefined;
  return async (vitestContext: any) => {
    const cleanups: Function[] = [];
    const t = createCompatContext(cleanups);
    try {
      await fn(t);
    } finally {
      for (const cleanup of cleanups) {
        try {
          await cleanup();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      }
    }
  };
}

// Wrap test/it functions
export function test(name: string, fn?: Function, timeout?: number) {
  return viTest(name, wrapTestCallback(fn), timeout);
}

test.only = (name: string, fn?: Function, timeout?: number) => {
  return viTest.only(name, wrapTestCallback(fn), timeout);
};

test.skip = (name: string, fn?: Function, timeout?: number) => {
  return viTest.skip(name, wrapTestCallback(fn), timeout);
};

test.todo = (name: string, fn?: Function, timeout?: number) => {
  return viTest.todo(name, wrapTestCallback(fn), timeout);
};

export const it = function (name: string, fn?: Function, timeout?: number) {
  return viIt(name, wrapTestCallback(fn), timeout);
};

it.only = (name: string, fn?: Function, timeout?: number) => {
  return viIt.only(name, wrapTestCallback(fn), timeout);
};

it.skip = (name: string, fn?: Function, timeout?: number) => {
  return viIt.skip(name, wrapTestCallback(fn), timeout);
};

it.todo = (name: string, fn?: Function, timeout?: number) => {
  return viIt.todo(name, wrapTestCallback(fn), timeout);
};

// Map describe, beforeEach, afterEach, before, after
export const describe = viDescribe;

export const beforeEach = function (fn: Function, timeout?: number) {
  return viBeforeEach(async () => {
    const cleanups: Function[] = [];
    const t = createCompatContext(cleanups);
    try {
      await fn(t);
    } finally {
      for (const cleanup of cleanups) {
        try {
          await cleanup();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      }
    }
  }, timeout);
};

export const afterEach = function (fn: Function, timeout?: number) {
  return viAfterEach(async () => {
    const cleanups: Function[] = [];
    const t = createCompatContext(cleanups);
    try {
      await fn(t);
    } finally {
      for (const cleanup of cleanups) {
        try {
          await cleanup();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      }
    }
  }, timeout);
};

export const before = function (fn: Function, timeout?: number) {
  return viBeforeAll(async () => {
    const cleanups: Function[] = [];
    const t = createCompatContext(cleanups);
    try {
      await fn(t);
    } finally {
      for (const cleanup of cleanups) {
        try {
          await cleanup();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      }
    }
  }, timeout);
};

export const after = function (fn: Function, timeout?: number) {
  return viAfterAll(async () => {
    const cleanups: Function[] = [];
    const t = createCompatContext(cleanups);
    try {
      await fn(t);
    } finally {
      for (const cleanup of cleanups) {
        try {
          await cleanup();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      }
    }
  }, timeout);
};

export default test;
