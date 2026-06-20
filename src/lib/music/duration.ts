/**
 * Parses a duration string and returns the total duration in seconds.
 * Supports:
 * - MM:SS (e.g. "3:45", "03:45")
 * - HH:MM:SS (e.g. "1:15:30")
 * - Minutes only (e.g. "15", "10")
 * - Suffixes (e.g. "15m", "15 min", "15 mins", "45s", "45 sec")
 * @param durationStr The duration string to parse.
 * @returns The duration in seconds, or 0 if invalid/empty.
 */
export function parseDurationToSeconds(durationStr: string | undefined): number {
  if (!durationStr) return 0;
  const cleaned = durationStr.trim().toLowerCase();
  if (!cleaned) return 0;
  if (!isValidDurationString(cleaned)) return 0;

  // Check if it's in format HH:MM:SS or MM:SS
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map((p) => Number.parseInt(p, 10));

    if (parts.length === 3) {
      // HH:MM:SS
      const [h, m, s] = parts;
      return h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
      // MM:SS
      const [m, s] = parts;
      return m * 60 + s;
    }
  }

  // Check if it contains suffix matches like 'm', 'min', 's', 'sec', 'h', 'hr'
  const hourMatch = cleaned.match(/(\d+)\s*(h|hr|hours?)/);
  const minMatch = cleaned.match(/(\d+)\s*(m|min|minutes?)/);
  const secMatch = cleaned.match(/(\d+)\s*(s|sec|seconds?)/);

  if (hourMatch || minMatch || secMatch) {
    let totalSec = 0;
    if (hourMatch) totalSec += parseInt(hourMatch[1], 10) * 3600;
    if (minMatch) totalSec += parseInt(minMatch[1], 10) * 60;
    if (secMatch) totalSec += parseInt(secMatch[1], 10);
    return totalSec;
  }

  // If it's a pure number, assume minutes
  const pureNum = parseInt(cleaned, 10);
  if (!isNaN(pureNum)) {
    return pureNum * 60; // minutes to seconds
  }

  return 0;
}

/**
 * Returns true when a duration is in one of the formats the app can safely parse.
 */
export function isValidDurationString(durationStr: string | undefined): boolean {
  if (!durationStr) return false;
  const cleaned = durationStr.trim().toLowerCase();
  if (!cleaned) return false;

  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length !== 2 && parts.length !== 3) return false;
    if (!parts.every((part) => /^\d+$/.test(part))) return false;

    const numbers = parts.map((part) => Number.parseInt(part, 10));
    if (parts.length === 2) {
      const [, seconds] = numbers;
      return seconds < 60;
    }

    const [, minutes, seconds] = numbers;
    return minutes < 60 && seconds < 60;
  }

  if (/^\d+$/.test(cleaned)) return true;

  const durationUnitsPattern =
    /^(?=.*\d)\s*(?:(\d+)\s*(?:h|hr|hrs|hours?)\s*)?(?:(\d+)\s*(?:m|min|mins|minutes?)\s*)?(?:(\d+)\s*(?:s|sec|secs|seconds?)\s*)?$/;
  const match = cleaned.match(durationUnitsPattern);
  return Boolean(match && (match[1] || match[2] || match[3]));
}

/**
 * Formats a duration in seconds to a human-readable HH:MM:SS or MM:SS string.
 * @param totalSeconds The total duration in seconds.
 * @returns A formatted duration string.
 */
export function formatSecondsToDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0:00';

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const sStr = s.toString().padStart(2, '0');

  if (h > 0) {
    const mStr = m.toString().padStart(2, '0');
    return `${h}:${mStr}:${sStr}`;
  }

  return `${m}:${sStr}`;
}
