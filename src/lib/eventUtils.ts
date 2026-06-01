import type { Event, SetListItem } from '../services/eventService';
import type { EventRoster } from '../services/rosterService';

export interface EventLike {
  id: string;
  date: string;
  [key: string]: unknown;
}

export interface FindNearestEventOptions {
  relativeTo?: Date;
  futureOnly?: boolean;
  type?: string;
}

/**
 * Finds the event closest in time to relativeTo (defaulting to today's date/time).
 * Supports both options object and backward-compatible Date parameter.
 */
export function findNearestEvent<T extends EventLike>(
  events: T[],
  optionsOrRelativeTo?: FindNearestEventOptions | Date
): T | null {
  if (!events || events.length === 0) return null;

  let options: FindNearestEventOptions = {};
  if (optionsOrRelativeTo instanceof Date) {
    options = { relativeTo: optionsOrRelativeTo };
  } else if (optionsOrRelativeTo) {
    options = optionsOrRelativeTo;
  }

  const { relativeTo = new Date(), futureOnly = false, type } = options;
  const targetTime = relativeTo.getTime();

  let filtered = events;

  // Apply filters if provided
  if (type) {
    filtered = filtered.filter(e => e.type === type);
  }
  if (futureOnly) {
    filtered = filtered.filter(e => new Date(e.date).getTime() >= targetTime);
  }

  // Fallback mechanism to ensure a selection if strict filtering yields no results
  if (filtered.length === 0) {
    if (futureOnly || type) {
      return findNearestEvent(events, { relativeTo });
    }
    return null;
  }

  let nearest = filtered[0];
  let minDiff = Math.abs(new Date(nearest.date).getTime() - targetTime);

  for (let i = 1; i < filtered.length; i++) {
    const diff = Math.abs(new Date(filtered[i].date).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = filtered[i];
    }
  }

  return nearest;
}

/**
 * Determines which event ID to initially select.
 * Prefers urlEventId when it matches an event in the list,
 * otherwise falls back to the nearest event by date.
 */
export function resolveInitialEventId<T extends EventLike>(
  events: T[],
  urlEventId?: string | null,
  options: FindNearestEventOptions = {}
): string | null {
  if (urlEventId && events.some(e => e.id === urlEventId)) {
    return urlEventId;
  }
  const nearest = findNearestEvent(events, options);
  return nearest ? nearest.id : null;
}

export function getSetListVisibility(event: EventLike | null | undefined, userRole: string): boolean {
  if (!event) return false;
  if (userRole === 'admin') return true;
  if (event.isPublic) return true;
  if (event.status !== 'published') return false;
  return true;
}

export interface SetListVisibilityResult {
  showSetList: boolean;
  setList?: SetListItem[];
  headerLabel?: string;
}

export function getSetListVisibilityResult(
  event: Event,
  myRosters: Record<string, Pick<EventRoster, 'rsvp'>> = {},
  allEvents: Event[] = []
): SetListVisibilityResult {
  if (!event) return { showSetList: false };

  const isPerformance = event.type === 'Performance';
  const isRehearsal = event.type === 'Rehearsal';

  if (isPerformance) {
    if (event.setListApproved === false) {
      return { showSetList: false };
    }
    const rsvp = myRosters?.[event.id]?.rsvp;
    if (rsvp === 'Yes') {
      return {
        showSetList: true,
        setList: event.setList || [],
        headerLabel: 'Set List'
      };
    }
    return { showSetList: false };
  }

  if (isRehearsal) {
    const parentId = event.parentPerformanceId;
    if (!parentId) return { showSetList: false };

    const parentPerformance = allEvents.find(e => e.id === parentId) || event.expand?.parentPerformanceId;
    if (!parentPerformance) return { showSetList: false };

    if (parentPerformance.setListApproved === false) {
      return { showSetList: false };
    }

    const parentRsvp = myRosters?.[parentId]?.rsvp;
    if (parentRsvp === 'Yes') {
      return {
        showSetList: true,
        setList: parentPerformance.setList || [],
        headerLabel: `Set List for ${parentPerformance.title || 'Concert'}`
      };
    }
  }

  return { showSetList: false };
}
