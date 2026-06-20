export function coercePocketBaseDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'object') {
    const dateLike = value as {
      toISOString?: () => string;
      toString?: () => string;
      valueOf?: () => unknown;
    };

    if (typeof dateLike.toISOString === 'function') {
      try {
        const parsed = new Date(dateLike.toISOString());
        if (!Number.isNaN(parsed.getTime())) return parsed;
      } catch {
        // Fall through.
      }
    }

    if (typeof dateLike.valueOf === 'function') {
      try {
        const valueOfResult = dateLike.valueOf();

        if (typeof valueOfResult === 'string' || typeof valueOfResult === 'number') {
          const parsed = new Date(valueOfResult);
          if (!Number.isNaN(parsed.getTime())) return parsed;
        }

        if (valueOfResult instanceof Date && !Number.isNaN(valueOfResult.getTime())) {
          return valueOfResult;
        }
      } catch {
        // Fall through.
      }
    }

    if (typeof dateLike.toString === 'function') {
      try {
        const stringValue = dateLike.toString();

        // Avoid parsing the default "[object Object]" output.
        if (stringValue && stringValue !== '[object Object]') {
          const parsed = new Date(stringValue);
          if (!Number.isNaN(parsed.getTime())) return parsed;
        }
      } catch {
        // Fall through.
      }
    }
  }

  return null;
}

export function isPocketBaseDateAtOrAfter(value: unknown, comparisonDate: Date): boolean {
  const parsed = coercePocketBaseDate(value);
  return !!parsed && parsed >= comparisonDate;
}

export function isPocketBaseDateBefore(value: unknown, comparisonDate: Date): boolean {
  const parsed = coercePocketBaseDate(value);
  return !!parsed && parsed < comparisonDate;
}
