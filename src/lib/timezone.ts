import { settingsService } from '../services/settingsService';

let cachedTimezone = '';

/**
 * Gets the current cached timezone or fetches it from settingsService.
 * In a React context, use the `useChoirSettings` hook instead.
 */
export async function fetchChoirTimezone(): Promise<string> {
  if (cachedTimezone) return cachedTimezone;
  try {
    const tz = await settingsService.getTimezone();
    cachedTimezone = tz;
    return tz;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  }
}

/**
 * Sets the local cached timezone.
 */
export function setCachedTimezone(tz: string): void {
  cachedTimezone = tz;
}

/**
 * Gets a quick fallback timezone synchronously.
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
}

/**
 * Formats a UTC date string or Date object into a localized string in the target timezone.
 * Perfectly accounts for daylight saving changes dynamically.
 */
export function formatInTimezone(
  date: Date | string | number,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';

  return d.toLocaleString(undefined, {
    ...options,
    timeZone,
  });
}

/**
 * Converts a UTC Date or ISO string from the database (e.g. "2023-10-15T23:00:00.000Z")
 * to a local date string in YYYY-MM-DDTHH:MM format in the target timezone, suitable
 * for use in <input type="datetime-local">.
 */
export function utcToZonedInputValue(utcString: string | Date | number, timeZone: string): string {
  if (!utcString) return '';
  const date =
    typeof utcString === 'string' || typeof utcString === 'number'
      ? new Date(utcString)
      : utcString;
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  let hour = getPart('hour');
  const minute = getPart('minute');

  // Normalize midnight "24" hour string to "00"
  if (hour === '24') {
    hour = '00';
  }

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Converts a YYYY-MM-DDTHH:MM datetime-local value (representing the local time in the
 * target timezone) back into a UTC ISO string ("2023-10-15T23:00:00.000Z") to store in the database.
 * Uses exact reverse calculation by querying the target timezone offset on the candidate date,
 * ensuring proper daylight savings adjustments via iterative refinement.
 */
export function zonedInputValueToUtc(localString: string, timeZone: string): string {
  if (!localString) return '';

  const parts = localString.split('T');
  if (parts.length !== 2) return new Date(localString).toISOString();

  const [datePart, timePart] = parts;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  // 1. Construct standard UTC Date using the target numbers as a baseline guess
  let utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  // 2. We do up to 3 iterative passes to converge to the exact correct offset
  for (let iter = 0; iter < 3; iter++) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const formattedParts = formatter.formatToParts(utcDate);
    const getPart = (type: string) =>
      Number(formattedParts.find((p) => p.type === type)?.value || '0');

    const formattedYear = getPart('year');
    const formattedMonth = getPart('month');
    const formattedDay = getPart('day');
    let formattedHour = getPart('hour');
    const formattedMinute = getPart('minute');
    const formattedSecond = getPart('second');

    if (formattedHour === 24) {
      formattedHour = 0;
    }

    // Compute target zoned timestamp representation for the current candidate UTC date
    const zonedTimestamp = Date.UTC(
      formattedYear,
      formattedMonth - 1,
      formattedDay,
      formattedHour,
      formattedMinute,
      formattedSecond
    );

    // Offset difference is: candidate UTC - candidate zoned local representation
    const offsetMs = utcDate.getTime() - zonedTimestamp;

    // Adjust target UTC by the calculated offset
    const targetZonedTimestamp = Date.UTC(year, month - 1, day, hours, minutes);
    const candidateUtcTime = targetZonedTimestamp + offsetMs;

    if (utcDate.getTime() === candidateUtcTime) {
      break; // Converged!
    }
    utcDate = new Date(candidateUtcTime);
  }

  return utcDate.toISOString();
}
