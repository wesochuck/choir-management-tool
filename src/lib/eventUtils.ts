export interface EventLike {
  id: string;
  date: string;
  [key: string]: any;
}

/**
 * Finds the event closest in time to relativeTo (defaulting to today's date/time).
 */
export function findNearestEvent<T extends EventLike>(events: T[], relativeTo: Date = new Date()): T | null {
  if (!events || events.length === 0) return null;
  
  const targetTime = relativeTo.getTime();
  let nearest = events[0];
  let minDiff = Math.abs(new Date(nearest.date).getTime() - targetTime);

  for (let i = 1; i < events.length; i++) {
    const diff = Math.abs(new Date(events[i].date).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = events[i];
    }
  }

  return nearest;
}
