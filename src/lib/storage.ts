const ENCRYPTION_PREFIX = 'ENC:1:';
// Simple lightweight obfuscation wrapper, enough to prevent casual inspection
const ENCRYPTION_KEY = 'vocal-chorus-app-local-storage-key-2024';

function encrypt(value: string): string {
  try {
    const encoded = encodeURIComponent(value);
    let result = '';
    for (let i = 0; i < encoded.length; i++) {
      result += String.fromCharCode(
        encoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return ENCRYPTION_PREFIX + btoa(result);
  } catch {
    return value;
  }
}

function decrypt(value: string): string {
  if (!value.startsWith(ENCRYPTION_PREFIX)) {
    return value;
  }

  try {
    const encryptedPart = value.slice(ENCRYPTION_PREFIX.length);
    const decoded = atob(encryptedPart);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return decodeURIComponent(result);
  } catch {
    return value;
  }
}

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      return decrypt(value);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      const encryptedValue = encrypt(value);
      localStorage.setItem(key, encryptedValue);
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
