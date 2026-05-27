import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService, type Event } from '../services/eventService';
import { rosterService, type EventRoster } from '../services/rosterService';
import { profileService, type Profile } from '../services/profileService';
import { getVoicePartsAndSections, settingsService, type VoicePartDef, type SectionDef } from '../services/settingsService';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import {
  mapSingersToRosters,
  calculateRsvpCounts,
  calculateSectionCounts,
  calculatePartCounts,
  filterMappedSingers,
  sortMappedSingers
} from '../lib/eventRosterUtils';

export interface UseEventRosterDataOptions {
  eventId: string | undefined;
  isInline: boolean;
}

export function useEventRosterData({ eventId, isInline }: UseEventRosterDataOptions) {
  const navigate = useNavigate();
  const dialog = useDialog();
  const { user, updatePreferences } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [eventRoster, setEventRoster] = useState<EventRoster[]>([]);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoiceParts, setSelectedVoiceParts] = useState<string[]>([]);
  const [rsvpFilter, setRsvpFilter] = useState<'All' | 'Yes' | 'No' | 'Pending'>('All');

  const [defaultSort, setDefaultSort] = useState<'lastName' | 'voicePart'>('lastName');
  const sortBy = user?.preferences?.rsvpSort || defaultSort;
  const setSortBy = useCallback((val: 'lastName' | 'voicePart') => {
    updatePreferences({ rsvpSort: val });
  }, [updatePreferences]);

  const loadData = useCallback(async () => {
    if (!eventId) {
      if (!isInline) {
        navigate('/admin/events');
      }
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const [evt, profiles, rosters, settings, rosterSettings] = await Promise.all([
        eventService.getEventById(eventId),
        profileService.getActiveProfiles(),
        rosterService.getEventRoster(eventId),
        getVoicePartsAndSections(),
        settingsService.getRosterSettings()
      ]);

      setEvent(evt);
      setActiveProfiles(profiles);
      setEventRoster(rosters);
      setVoiceParts(settings.voiceParts);
      setSections(settings.sections);
      if (rosterSettings && rosterSettings.defaultRsvpSort) {
        setDefaultSort(rosterSettings.defaultRsvpSort);
      }
      setIsLoading(false);
    } catch (err: unknown) {
      console.error('Failed to load roster data', err);
      setLoadError(err);
      setIsLoading(false);

      dialog.showMessage({
        title: 'Event Not Found',
        message: 'The requested event or its RSVP roster could not be loaded.',
        variant: 'danger',
      }).then(() => {
        if (!isInline) {
          navigate('/admin/events');
        }
      });
    }
  }, [eventId, isInline, navigate, dialog]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const mappedSingers = useMemo(() => {
    return mapSingersToRosters(activeProfiles, eventRoster);
  }, [activeProfiles, eventRoster]);

  const { yesCount, noCount, pendingCount } = useMemo(() => {
    return calculateRsvpCounts(mappedSingers);
  }, [mappedSingers]);

  const activeCountSingers = useMemo(() => {
    return mappedSingers.filter(s => {
      if (rsvpFilter === 'All') return true;
      return s.rsvp === rsvpFilter;
    });
  }, [mappedSingers, rsvpFilter]);

  const sectionCounts = useMemo(() => {
    return calculateSectionCounts(activeCountSingers, sections, voiceParts);
  }, [activeCountSingers, sections, voiceParts]);

  const partCounts = useMemo(() => {
    return calculatePartCounts(activeCountSingers, voiceParts);
  }, [activeCountSingers, voiceParts]);

  const filteredSingers = useMemo(() => {
    return filterMappedSingers(mappedSingers, rsvpFilter, selectedVoiceParts, voiceParts, searchQuery);
  }, [mappedSingers, rsvpFilter, selectedVoiceParts, voiceParts, searchQuery]);

  const sortedSingers = useMemo(() => {
    return sortMappedSingers(filteredSingers, sortBy, voiceParts);
  }, [filteredSingers, sortBy, voiceParts]);

  const refreshProfiles = useCallback(async () => {
    try {
      const activeProfs = await profileService.getActiveProfiles();
      setActiveProfiles(activeProfs);
    } catch (err) {
      console.error('Failed to refresh active profiles', err);
    }
  }, []);

  const refreshRosters = useCallback(async () => {
    if (eventId) {
      try {
        const rosters = await rosterService.getEventRoster(eventId);
        setEventRoster(rosters);
      } catch (err) {
        console.error('Failed to refresh rosters', err);
      }
    }
  }, [eventId]);

  return {
    event,
    activeProfiles,
    eventRoster,
    voiceParts,
    sections,
    isLoading,
    loadError,

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

    refreshProfiles,
    refreshRosters,
    reload: loadData,
    setEventRoster,
  };
}
