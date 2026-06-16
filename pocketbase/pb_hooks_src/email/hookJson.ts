/**
 * Safely converts Go byte slices (uint8 arrays) to JS strings.
 * Defensive against already-parsed JS objects or arrays.
 */
export const decodeGoBytes = (val: unknown): string | unknown => {
    if (!val) return "";
    if (typeof val === 'string') return val;

    if (typeof val === 'object') {
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
            try {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            } catch {
                // Ignore decoding errors
            }
        }
        return val;
    }

    return String(val);
};

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
