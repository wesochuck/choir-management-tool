import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { eventService, type Event } from '../services/eventService';
import { rosterService, type EventRoster } from '../services/rosterService';
import { profileService, type Profile } from '../services/profileService';
import { getVoicePartsAndSections, settingsService, type VoicePartDef, type SectionDef } from '../services/settingsService';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { pb } from '../lib/pocketbase';
import { retryOn429 } from '../lib/networkSafety';
import { queryKeys } from '../lib/queryKeys';
import {
  mapSingersToRosters,
  calculateRsvpCounts,
  calculateSectionCounts,
  calculatePartCounts,
  filterMappedSingers,
  sortMappedSingers,
} from '../lib/eventRosterUtils';

export interface UseEventRosterDataOptions {
  eventId: string | undefined;
  isInline: boolean;
}

interface EventRosterQueryData {
  event: Event;
  activeProfiles: Profile[];
  eventRoster: EventRoster[];
  voiceParts: VoicePartDef[];
  sections: SectionDef[];
  defaultSort: 'lastName' | 'voicePart';
  maxRehearsalMisses: number;
  pastRehearsals: Event[];
  pastRosters: EventRoster[];
}

export function useEventRosterData({ eventId, isInline }: UseEventRosterDataOptions) {
  const navigate = useNavigate();
  const dialog = useDialog();
  const { user, updatePreferences } = useAuth();
  const queryClient = useQueryClient();

  const eventRosterQuery = useQuery({
    queryKey: queryKeys.eventRoster.byEventId(eventId ?? ''),
    queryFn: async (): Promise<EventRosterQueryData> => {
      if (!eventId) throw new Error('No event ID');

      const [evt, profiles, rosters, settings, rosterSettings] = await Promise.all([
        eventService.getEventById(eventId),
        profileService.getActiveProfiles(),
        rosterService.getEventRoster(eventId),
        getVoicePartsAndSections(),
        settingsService.getRosterSettings(),
      ]);

      let pastRehearsals: Event[] = [];
      let pastRosters: EventRoster[] = [];

      const linkedPerfId = evt.type === 'Performance' ? evt.id : evt.parentPerformanceId;
      if (linkedPerfId) {
        const cycleRehearsals = await eventService.getRehearsalsForPerformance(linkedPerfId);
        const nowMs = Date.now();
        pastRehearsals = cycleRehearsals.filter(reh => new Date(reh.date).getTime() < nowMs);

        if (pastRehearsals.length > 0) {
          const filterParts = pastRehearsals.map((_, idx) => `event = {:id${idx}}`).join(' || ');
          const filterParams = pastRehearsals.reduce((acc, reh, idx) => {
            acc[`id${idx}`] = reh.id;
            return acc;
          }, {} as Record<string, string>);
          pastRosters = await retryOn429(() =>
            pb.collection('eventRosters').getFullList<EventRoster>({ filter: pb.filter(filterParts, filterParams) })
          );
        }
      }

      return {
        event: evt,
        activeProfiles: profiles,
        eventRoster: rosters,
        voiceParts: settings.voiceParts,
        sections: settings.sections,
        defaultSort: rosterSettings?.defaultRsvpSort ?? 'lastName',
        maxRehearsalMisses: rosterSettings?.maxRehearsalMisses ?? 3,
        pastRehearsals,
        pastRosters,
      };
    },
    enabled: !!eventId,
    retry: false,
  });

  useEffect(() => {
    if (!eventId && !isInline) {
      navigate('/admin/events');
    }
  }, [eventId, isInline, navigate]);

  useEffect(() => {
    if (eventRosterQuery.error) {
      console.error('Failed to load roster data', eventRosterQuery.error);
      dialog
        .showMessage({
          title: 'Event Not Found',
          message: 'The requested event or its RSVP roster could not be loaded.',
          variant: 'danger',
        })
        .then(() => {
          if (!isInline) {
            navigate('/admin/events');
          }
        });
    }
  }, [eventRosterQuery.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = eventRosterQuery.data;
  const event = data?.event ?? null;
  const activeProfiles = data?.activeProfiles ?? [];
  const eventRoster = data?.eventRoster ?? [];
  const voiceParts = data?.voiceParts ?? [];
  const sections = data?.sections ?? [];
  const pastRehearsals = data?.pastRehearsals ?? [];
  const pastRosters = data?.pastRosters ?? [];
  const defaultSort = data?.defaultSort ?? 'lastName';
  const maxRehearsalMisses = data?.maxRehearsalMisses ?? 3;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoiceParts, setSelectedVoiceParts] = useState<string[]>([]);
  const [rsvpFilter, setRsvpFilter] = useState<'All' | 'Yes' | 'No' | 'Pending'>('All');

  const sortBy = user?.preferences?.rsvpSort || defaultSort;
  const setSortBy = useCallback(
    (val: 'lastName' | 'voicePart') => {
      updatePreferences({ rsvpSort: val });
    },
    [updatePreferences],
  );

  const mappedSingers = useMemo(() => mapSingersToRosters(activeProfiles, eventRoster), [activeProfiles, eventRoster]);

  const { yesCount, noCount, pendingCount } = useMemo(() => calculateRsvpCounts(mappedSingers), [mappedSingers]);

  const activeCountSingers = useMemo(() => {
    return mappedSingers.filter(s => {
      if (rsvpFilter === 'All') return true;
      return s.rsvp === rsvpFilter;
    });
  }, [mappedSingers, rsvpFilter]);

  const sectionCounts = useMemo(
    () => calculateSectionCounts(activeCountSingers, sections, voiceParts),
    [activeCountSingers, sections, voiceParts],
  );

  const partCounts = useMemo(() => calculatePartCounts(activeCountSingers, voiceParts), [activeCountSingers, voiceParts]);

  const filteredSingers = useMemo(
    () => filterMappedSingers(mappedSingers, rsvpFilter, selectedVoiceParts, voiceParts, searchQuery),
    [mappedSingers, rsvpFilter, selectedVoiceParts, voiceParts, searchQuery],
  );

  const sortedSingers = useMemo(
    () => sortMappedSingers(filteredSingers, sortBy, voiceParts),
    [filteredSingers, sortBy, voiceParts],
  );

  const missCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (pastRehearsals.length === 0) return counts;

    activeProfiles.forEach(profile => {
      let missCount = 0;
      pastRehearsals.forEach(reh => {
        const r = pastRosters.find(x => x.profile === profile.id && x.event === reh.id);
        const wasDeclined = r?.rsvp === 'No';
        const wasAbsent = r?.attendance === 'Absent';
        const notMarkedPresent = r?.attendance !== 'Present';
        if (wasDeclined || wasAbsent || notMarkedPresent) missCount++;
      });
      if (missCount > 0) counts[profile.id] = missCount;
    });

    return counts;
  }, [activeProfiles, pastRehearsals, pastRosters]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.eventRoster.byEventId(eventId ?? '') });
  }, [queryClient, eventId]);

  const refreshProfiles = invalidate;
  const refreshRosters = invalidate;

  const setEventRoster = useCallback(
    (rosters: EventRoster[]) => {
      queryClient.setQueryData(queryKeys.eventRoster.byEventId(eventId ?? ''), (old: EventRosterQueryData | undefined) => {
        if (!old) return old;
        return { ...old, eventRoster: rosters };
      });
    },
    [queryClient, eventId],
  );

  return {
    event,
    activeProfiles,
    eventRoster,
    voiceParts,
    sections,
    isLoading: eventRosterQuery.isLoading,
    loadError: eventRosterQuery.error,

    searchQuery,
    setSearchQuery,
    selectedVoiceParts,
    setSelectedVoiceParts,
    rsvpFilter,
    setRsvpFilter,

    sortBy,
    setSortBy,

    mappedSingers,
    filteredSingers,
    sortedSingers,
    yesCount,
    noCount,
    pendingCount,
    sectionCounts,
    partCounts,
    missCounts,
    maxRehearsalMisses,

    refreshProfiles,
    refreshRosters,
    reload: invalidate,
    setEventRoster,
  };
}
