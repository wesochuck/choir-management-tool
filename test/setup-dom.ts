// test/setup-dom.ts

if (typeof window !== 'undefined') {
  const createMockStorage = () => {
    const store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      }
    };
  };

  // If window.localStorage is missing or doesn't have getItem, we define a standard mock
  if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
    const mockLocalStorage = createMockStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
  }

  // Same for sessionStorage
  if (!window.sessionStorage || typeof window.sessionStorage.getItem !== 'function') {
    const mockSessionStorage = createMockStorage();
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true
    });
  }
}
