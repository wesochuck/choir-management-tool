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

export interface SetListVisibilityResult {
  showSetList: boolean;
  setList?: any[];
  headerLabel?: string;
}

export function getSetListVisibility(
  event: any,
  myRosters: Record<string, { rsvp: string }> = {},
  allEvents: any[] = []
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

