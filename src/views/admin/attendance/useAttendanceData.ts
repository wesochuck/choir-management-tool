import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { settingsService } from '../../../services/settingsService';
import { rosterService } from '../../../services/rosterService';
import { chunkArray } from '../../../lib/networkSafety';
import { getLastName } from '../../../lib/stringUtils';
import { getSingerSection } from './getSingerSection';

interface VoicePartDef {
  label: string;
  sectionCode?: string;
}

interface SectionDef {
  code: string;
  name: string;
}

interface EventDef {
  id: string;
  type: string;
  date: string;
  parentPerformanceId?: string;
  expand?: {
    venue?: { name: string };
  };
}

interface AttendanceItemDef {
  id: string;
  profileId: string;
  name: string;
  voicePart: string;
  attendance: 'Present' | 'Absent' | 'Pending';
  rsvp: 'Yes' | 'No' | 'Pending';
  rsvpNote?: string;
  rosterId?: string;
}

interface ProfileDef {
  id: string;
  voicePart?: string;
}

const MODULE_LOAD_TIME = Date.now();

export function useAttendanceData(
  events: EventDef[],
  selectedEventId: string,
  profiles: ProfileDef[],
  filter: 'All' | 'Present' | 'Absent' | 'Unmarked',
  items: AttendanceItemDef[],
  voiceParts: VoicePartDef[],
  sections: SectionDef[]
) {
  const rosterSettingsQuery = useQuery({
    queryKey: queryKeys.appSettings.roster,
    queryFn: () => settingsService.getRosterSettings(),
  });
  const maxRehearsalMisses = rosterSettingsQuery.data?.maxRehearsalMisses ?? 3;

  const eventIds = useMemo(() => events.map((e) => e.id).sort(), [events]);

  const allRostersQuery = useQuery({
    queryKey: queryKeys.eventRoster.recordsForEvents(eventIds),
    queryFn: () => rosterService.getEventRostersBatch(eventIds),
    enabled: eventIds.length > 0,
  });

  const activeSingersCount = useMemo(
    () => profiles.filter((p) => !!p.voicePart).length,
    [profiles]
  );

  const eventStats = useMemo(() => {
    const rosters = allRostersQuery.data ?? [];
    const stats: Record<string, { present: number; expected: number }> = {};

    const rostersByEvent: Record<string, typeof rosters> = {};
    for (const r of rosters) {
      if (!rostersByEvent[r.event]) {
        rostersByEvent[r.event] = [];
      }
      rostersByEvent[r.event].push(r);
    }

    for (const ev of events) {
      const evRosters = rostersByEvent[ev.id] ?? [];
      const declinedCount = evRosters.filter((r) => r.rsvp === 'No').length;
      const present = evRosters.filter((r) => r.attendance === 'Present').length;
      const expected = Math.max(0, activeSingersCount - declinedCount);
      stats[ev.id] = { present, expected };
    }
    return stats;
  }, [allRostersQuery.data, events, activeSingersCount]);

  const missCountsQuery = useQuery({
    queryKey: queryKeys.attendance.missCounts(selectedEventId),
    queryFn: async () => {
      const event = events.find((e) => e.id === selectedEventId);
      if (!event) return {};

      const isPerformance = event.type === 'Performance';
      const linkedPerfId = isPerformance ? event.id : event.parentPerformanceId;
      if (!linkedPerfId) return {};

      const cycleRehearsals = events.filter(
        (e) => e.type === 'Rehearsal' && e.parentPerformanceId === linkedPerfId
      );
      if (cycleRehearsals.length === 0) return {};

      const nowMs = Date.now();
      const pastRehearsals = cycleRehearsals.filter((reh) => new Date(reh.date).getTime() < nowMs);

      const perfRosters = linkedPerfId
        ? await rosterService.getAcceptedRostersForEvent(linkedPerfId)
        : [];
      const performingProfileIds = new Set(perfRosters.map((r) => r.profile));

      const rehearsalIds = pastRehearsals.map((reh) => reh.id);
      const idChunks = chunkArray(rehearsalIds, 50);

      const allRosters: import('../../../services/rosterService').EventRoster[] = [];
      const chunkPromises = idChunks.map((chunk) => rosterService.getRostersForEvents(chunk));
      const chunkResults = await Promise.all(chunkPromises);
      for (const chunkRosters of chunkResults) {
        allRosters.push(...chunkRosters);
      }

      const eventRosterMap = new Map<
        string,
        Map<string, import('../../../services/rosterService').EventRoster>
      >();
      for (const r of allRosters) {
        let eventMap = eventRosterMap.get(r.event);
        if (!eventMap) {
          eventMap = new Map();
          eventRosterMap.set(r.event, eventMap);
        }
        eventMap.set(r.profile, r);
      }

      const counts: Record<string, number> = {};
      performingProfileIds.forEach((profileId) => {
        let missCount = 0;
        pastRehearsals.forEach((reh) => {
          const eventMap = eventRosterMap.get(reh.id);
          const roster = eventMap?.get(profileId);

          const wasDeclined = roster?.rsvp === 'No';
          const wasAbsent = roster?.attendance === 'Absent';
          const notMarkedPresent = roster?.attendance !== 'Present';

          if (wasDeclined || wasAbsent || notMarkedPresent) {
            missCount++;
          }
        });
        if (missCount > 0) {
          counts[profileId] = missCount;
        }
      });

      return counts;
    },
    enabled: !!selectedEventId && events.length > 0,
  });
  const missCounts = missCountsQuery.data ?? {};

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const expectedSingers = useMemo(
    () => items.filter((item) => item.rsvp === 'Yes' || item.rsvp === 'Pending'),
    [items]
  );

  const declinedSingers = useMemo(() => items.filter((item) => item.rsvp === 'No'), [items]);

  const expectedCount = expectedSingers.length;

  const presentCount = useMemo(
    () => expectedSingers.filter((item) => item.attendance === 'Present').length,
    [expectedSingers]
  );

  const filteredSingers = useMemo(() => {
    return expectedSingers.filter((s) => {
      if (filter === 'All') return true;
      if (filter === 'Present') return s.attendance === 'Present';
      if (filter === 'Absent') return s.attendance === 'Absent';
      if (filter === 'Unmarked') return s.attendance === 'Pending';
      return true;
    });
  }, [expectedSingers, filter]);

  const grouped = useMemo(() => {
    const sectionsFound = new Set(
      expectedSingers.map((s) => getSingerSection(s.voicePart, voiceParts, sections))
    );
    const SECTION_ORDER = ['Soprano', 'Mezzo-Soprano', 'Alto', 'Tenor', 'Baritone', 'Bass'];
    sectionsFound.forEach((sec) => {
      if (!SECTION_ORDER.includes(sec)) {
        SECTION_ORDER.push(sec);
      }
    });

    const compareSingers = (a: AttendanceItemDef, b: AttendanceItemDef) => {
      const lastA = getLastName(a.name);
      const lastB = getLastName(b.name);
      const cmp = lastA.localeCompare(lastB);
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name);
    };

    const groupedBySection: Record<string, AttendanceItemDef[]> = {};
    for (const s of filteredSingers) {
      const section = getSingerSection(s.voicePart, voiceParts, sections);
      if (!groupedBySection[section]) {
        groupedBySection[section] = [];
      }
      groupedBySection[section].push(s);
    }

    const acc: Record<string, AttendanceItemDef[]> = {};
    SECTION_ORDER.forEach((section) => {
      if (groupedBySection[section] && groupedBySection[section].length > 0) {
        acc[section] = groupedBySection[section].sort(compareSingers);
      }
    });
    return acc;
  }, [filteredSingers, expectedSingers, voiceParts, sections]);

  return {
    sortedEvents,
    selectedEvent,
    eventStats,
    missCounts,
    maxRehearsalMisses,
    expectedSingers,
    declinedSingers,
    expectedCount,
    presentCount,
    filteredSingers,
    grouped,
    isLoadingRosters: allRostersQuery.isLoading,
    isLoadingMissCounts: missCountsQuery.isLoading,
    MODULE_LOAD_TIME,
  };
}
