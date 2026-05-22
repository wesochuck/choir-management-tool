/**
 * Compares two objects deeply to detect modifications.
 */
export function isDeepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 === 'object') {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) return false;
      for (let i = 0; i < obj1.length; i++) {
        if (!isDeepEqual(obj1[i], obj2[i])) return false;
      }
      return true;
    }
    
    if (!Array.isArray(obj1) && !Array.isArray(obj2)) {
      const keys1 = Object.keys(obj1 as Record<string, unknown>);
      const keys2 = Object.keys(obj2 as Record<string, unknown>);
      if (keys1.length !== keys2.length) return false;
      
      for (const key of keys1) {
        if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;
        if (!isDeepEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key])) return false;
      }
      return true;
    }
  }
  return false;
}

export function calculateSettingsDirty(initial: unknown, current: unknown): boolean {
  if (!initial || !current) return false;
  return !isDeepEqual(initial, current);
}
