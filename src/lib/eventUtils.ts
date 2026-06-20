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
    filtered = filtered.filter((e) => e.type === type);
  }
  if (futureOnly) {
    filtered = filtered.filter((e) => new Date(e.date).getTime() >= targetTime);
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
  if (urlEventId && events.some((e) => e.id === urlEventId)) {
    return urlEventId;
  }
  const nearest = findNearestEvent(events, options);
  return nearest ? nearest.id : null;
}

export function getSetListVisibility(
  event: EventLike | null | undefined,
  userRole: string
): boolean {
  if (!event) return false;
  if (userRole === 'admin') return true;
  if (event.isPublic) return true;
  if (event.status !== 'published') return false;
  return true;
}

export interface SingerSetListPreviewResult {
  visible: boolean;
  setList: SetListItem[];
  label: string;
  playerId: string;
}

export function getSingerSetListPreview(
  event: Event,
  myRosters: Record<string, Pick<EventRoster, 'rsvp'>> = {},
  allEvents: Event[] = []
): SingerSetListPreviewResult {
  const defaultResult: SingerSetListPreviewResult = {
    visible: false,
    setList: [],
    label: '',
    playerId: event.id,
  };

  const eventRsvp = myRosters?.[event.id]?.rsvp;

  // 1. Performance Processing Logic
  if (event.type === 'Performance') {
    if (event.setListApproved === false || eventRsvp !== 'Yes') return defaultResult;
    const setList = event.setList || [];
    if (setList.length === 0) return defaultResult;

    return {
      visible: true,
      setList,
      label: 'Performance Set List',
      playerId: event.id,
    };
  }

  // 2. Rehearsal Processing Logic
  if (event.type === 'Rehearsal') {
    const parent =
      allEvents.find((e) => e.id === event.parentPerformanceId) ||
      event.expand?.parentPerformanceId;
    const parentRsvp = parent ? myRosters?.[parent.id]?.rsvp : undefined;

    // Singer must be attending either the rehearsal itself or the main show context
    if (eventRsvp !== 'Yes' && parentRsvp !== 'Yes') return defaultResult;

    // Check rehearsal-specific focus pieces first
    const rehearsalSetList = event.setList || [];
    if (rehearsalSetList.length > 0) {
      if (event.setListApproved === false) return defaultResult;
      return {
        visible: true,
        setList: rehearsalSetList,
        label: 'Rehearsal Focus Pieces',
        playerId: event.id,
      };
    }

    // Fall back to the parent performance set list if no rehearsal-specific list exists
    const parentSetList = parent?.setList || [];
    if (parent && parentSetList.length > 0 && parent.setListApproved !== false) {
      return {
        visible: true,
        setList: parentSetList,
        label: `Set List for ${parent.title || 'Concert'}`,
        playerId: parent.id,
      };
    }
  }

  return defaultResult;
}

export function getSetListVisibilityResult(
  event: Event,
  myRosters: Record<string, Pick<EventRoster, 'rsvp'>> = {},
  allEvents: Event[] = []
) {
  const result = getSingerSetListPreview(event, myRosters, allEvents);
  if (!result.visible) {
    return { showSetList: false };
  }
  return {
    showSetList: result.visible,
    setList: result.setList,
    headerLabel: result.label === 'Performance Set List' ? 'Set List' : result.label,
  };
}
