const SENSITIVE_KEY_PATTERN = /(auth|token|session|secret|password|credential)/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isSensitiveKey(key)) return null;

    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (isSensitiveKey(key)) {
      console.warn(`Refusing to store sensitive value in localStorage: ${key}`);
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore write errors in private browsing/restricted modes
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};
