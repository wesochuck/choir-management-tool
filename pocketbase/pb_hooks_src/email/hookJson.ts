/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
export function decodeGoBytes(val: unknown): string | unknown {
  if (!val) return '';
  if (typeof val === 'string') return val;

  if (typeof val === 'object') {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
      try {
        return val.map((byteCode) => String.fromCharCode(Number(byteCode))).join('');
      } catch {
        return '';
      }
    }
    return val;
  }

  return String(val);
}

export function safeDecodeCollectionBytes(
  rawBytes: unknown,
  fallback: { defaultSchema: Record<string, unknown> },
): Record<string, unknown> {
  if (!rawBytes || !Array.isArray(rawBytes)) {
    return fallback.defaultSchema;
  }

  try {
    const characterString = rawBytes.map((byteCode) => String.fromCharCode(Number(byteCode))).join('');
    if (!characterString.trim()) return fallback.defaultSchema;

    const parsedData: unknown = JSON.parse(characterString);
    if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
      return parsedData;
    }
    return fallback.defaultSchema;
  } catch (_err: unknown) {
    return fallback.defaultSchema;
  }
}

/**
 * Safely parses a JSON field from a PocketBase record.
 */
export function parseJsonField<T = unknown>(val: unknown): T | null {
  if (!val) return null;
  const decoded = decodeGoBytes(val);
  if (!decoded) return null;

  if (typeof decoded === 'object') return decoded as T;

  try {
    return JSON.parse(decoded as string) as T;
  } catch {
    return null;
  }
}
