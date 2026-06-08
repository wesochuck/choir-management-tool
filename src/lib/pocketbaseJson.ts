/**
 * Decodes a numeric byte array (Goja/PocketBase style) into a UTF-8 string.
 * Returns the input string if already a string, or an empty string for invalid inputs.
 */
export function decodeGoBytes(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    if (val.length === 0) return '';
    if (typeof val[0] === 'number') {
      try {
        return val.map(b => String.fromCharCode(Number(b))).join('');
      } catch {
        return '';
      }
    }
  }
  return '';
}

/**
 * Defensively parses a PocketBase field that might be a standard object,
 * a JSON string, or a Goja numeric byte array.
 */
export function parseJsonField<T>(val: unknown): T | null {
  if (val === null || val === undefined) return null;

  // If it's already an object (and not an array), return it
  if (typeof val === 'object' && !Array.isArray(val)) {
    return val as T;
  }

  // Attempt to decode as string (handles Goja byte arrays or raw strings)
  const str = decodeGoBytes(val);
  
  if (!str) {
    // Pass through standard array relations that fail string conversion
    if (Array.isArray(val)) {
      return val as unknown as T;
    }
    return null;
  }

  // If the result is a JSON string, parse it
  try {
    return JSON.parse(str) as T;
  } catch {
    // If it's not JSON, return null (per requirements)
    return null;
  }
}
