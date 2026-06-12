import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance, type AttendanceItem } from '../../hooks/useAttendance';
import { useProfiles } from '../../hooks/useProfiles';
import { CheckInList } from '../../components/admin/CheckInList';
import { useDialog } from '../../contexts/DialogContext';
import { SingerModal } from '../../components/admin/SingerModal';
import type { Profile, ProfileInput } from '../../services/profileService';
import { settingsService } from '../../services/settingsService';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { pb } from '../../lib/pocketbase';
import type { EventRoster } from '../../services/rosterService';
import { chunkArray } from '../../lib/networkSafety';
import { useRateLimitRetryToast } from '../../hooks/useRateLimitRetryToast';
import { AppCard } from '../../components/common/AppCard';
import { Button } from '../../components/ui';
import { matchesVoiceParts } from '../../lib/voicePartUtils';

export default function AttendanceView() {
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  const { timezone } = useChoirSettings();
  const { events } = useEvents();
  const { profiles, editProfile } = useProfiles();
  const { user, updatePreferences } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState('');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const hasDefaultedRef = useRef(false);
  const [maxRehearsalMisses, setMaxRehearsalMisses] = useState(3);
  const [missCounts, setMissCounts] = useState<Record<string, number>>({});

  // Filter States
  const [filterName, setFilterName] = useState('');
  const [selectedVoiceParts, setSelectedVoiceParts] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'' | 'Present' | 'Absent' | 'Pending'>('');
  const [isEventExpanded, setIsEventExpanded] = useState(false);

  // Sorting preference state
  const sortBy = user?.preferences?.attendanceSort || 'lastName';
  const handleSortChange = (val: 'lastName' | 'voicePart' | 'section') => {
    updatePreferences({ attendanceSort: val });
  };

  // RSVP filter preference state
  const defaultRsvpFilter = 'Both';
  const rsvpFilter = user?.preferences?.attendanceRsvpFilter || defaultRsvpFilter;
  const handleRsvpFilterChange = (val: 'Yes' | 'Pending' | 'Both') => {
    updatePreferences({ attendanceRsvpFilter: val });
  };

  const [selectedDeclinedProfileId, setSelectedDeclinedProfileId] = useState('');
  const { voiceParts, sections } = useVoiceParts();

  useEffect(() => {
    settingsService
      .getRosterSettings()
      .then((settings) => {
        if (settings?.maxRehearsalMisses !== undefined) {
          setMaxRehearsalMisses(settings.maxRehearsalMisses);
        }
      })
      .catch((err) => console.error('Failed to load roster settings:', err));
  }, []);

  // Compute missed rehearsals count for each singer in the performance cycle
  useEffect(() => {
    if (!selectedEventId || events.length === 0) {
      setMissCounts({});
      return;
    }

    const event = events.find((e) => e.id === selectedEventId);
    if (!event) return;

    const isPerformance = event.type === 'Performance';
    const linkedPerfId = isPerformance ? event.id : event.parentPerformanceId;

    if (!linkedPerfId) {
      setMissCounts({});
      return;
    }

    const cycleRehearsals = events.filter(
      (e) => e.type === 'Rehearsal' && e.parentPerformanceId === linkedPerfId
    );
    if (cycleRehearsals.length === 0) {
      setMissCounts({});
      return;
    }

    const fetchMissCounts = async () => {
      try {
        const nowMs = Date.now();
        const pastRehearsals = cycleRehearsals.filter(
          (reh) => new Date(reh.date).getTime() < nowMs
        );

        const perfRosters = linkedPerfId
          ? await pb.collection('eventRosters').getFullList({
              filter: pb.filter('event = {:linkedPerfId} && rsvp = "Yes"', { linkedPerfId }),
            })
          : [];
        const performingProfileIds = new Set(perfRosters.map((r) => r.profile));

        const rehearsalIds = pastRehearsals.map((reh) => reh.id);
        const idChunks = chunkArray(rehearsalIds, 50);

        const allRosters: EventRoster[] = [];

        const chunkPromises = idChunks.map((chunk) => {
          const filterStr = chunk.map((_, i) => `event = {:id${i}}`).join(' || ');
          const params = Object.fromEntries(chunk.map((id, i) => [`id${i}`, id]));
          return pb.collection('eventRosters').getFullList<EventRoster>({
            filter: pb.filter(filterStr, params),
          });
        });

        const chunkResults = await Promise.all(chunkPromises);
        for (const chunkRosters of chunkResults) {
          allRosters.push(...chunkRosters);
        }

        const rostersLists = pastRehearsals.map((reh) =>
          allRosters.filter((r) => r.event === reh.id)
        );

        const rosterMaps = rostersLists.map((rosters) => {
          const map = new Map();
          for (const r of rosters) {
            map.set(r.profile, r);
          }
          return map;
        });

        const counts: Record<string, number> = {};

        performingProfileIds.forEach((profileId) => {
          let missCount = 0;
          pastRehearsals.forEach((_, index) => {
            const rosterMap = rosterMaps[index];
            const r = rosterMap.get(profileId);

            const wasDeclined = r?.rsvp === 'No';
            const wasAbsent = r?.attendance === 'Absent';
            const notMarkedPresent = r?.attendance !== 'Present';

            if (wasDeclined || wasAbsent || notMarkedPresent) {
              missCount++;
            }
          });

          if (missCount > 0) {
            counts[profileId] = missCount;
          }
        });

        setMissCounts(counts);
      } catch (err) {
        console.error('Failed to calculate rehearsal miss counts:', err);
      }
    };

    fetchMissCounts();
  }, [selectedEventId, events]);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId && !hasDefaultedRef.current) {
      const urlEventId = searchParams.get('eventId');
      const resolved = resolveInitialEventId(events, urlEventId);
      if (resolved) {
        setSelectedEventId(resolved);
        hasDefaultedRef.current = true;
      }
    }
  }, [events, selectedEventId, searchParams]);

  const { onRetry: onAttendanceRateLimitRetry, reset: resetAttendanceRateLimitToast } =
    useRateLimitRetryToast('Attendance action is being rate-limited; retrying automatically...');

  const { items, isLoading, error, setAttendance, setRSVP, setAllAttendance, refresh } =
    useAttendance(selectedEventId, {
      onRateLimitRetry: onAttendanceRateLimitRetry,
    });

  useEffect(() => {
    if (isLoading) {
      resetAttendanceRateLimitToast();
    }
  }, [isLoading, resetAttendanceRateLimitToast]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const handleResetFilters = () => {
    setFilterName('');
    setSelectedVoiceParts([]);
    setFilterStatus('');
    handleRsvpFilterChange('Both');
  };

  const matchesRsvpFilter = useCallback(
    (item: AttendanceItem) => {
      if (rsvpFilter === 'Yes') return item.rsvp === 'Yes';
      if (rsvpFilter === 'Pending') return item.rsvp === 'Pending';
      return item.rsvp === 'Yes' || item.rsvp === 'Pending';
    },
    [rsvpFilter]
  );

  // Compute filtered items dynamically for the check-in list
  const filteredCheckInItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Filter out Declined RSVPs (they are handled at the bottom rescue section)
      if (!matchesRsvpFilter(item)) return false;

      // 2. Filter by Attendance Status (Present, Absent, Unmarked)
      if (filterStatus && item.attendance !== filterStatus) return false;

      // 3. Filter by Search Name
      if (filterName.trim()) {
        const query = filterName.toLowerCase();
        if (!item.name.toLowerCase().includes(query)) return false;
      }

      // 4. Filter by Voice Part (selectedVoiceParts array)
      if (selectedVoiceParts.length > 0) {
        const matches = matchesVoiceParts(item.voicePart, selectedVoiceParts, voiceParts);
        if (!matches) return false;
      }

      return true;
    });
  }, [items, matchesRsvpFilter, filterStatus, filterName, selectedVoiceParts, voiceParts]);

  const declinedSingers = useMemo(() => {
    return items.filter((item) => item.rsvp === 'No');
  }, [items]);

  // Compute total counts for the summary card tabs
  const expectedCount = useMemo(
    () => items.filter(matchesRsvpFilter).length,
    [items, matchesRsvpFilter]
  );
  const presentCount = useMemo(
    () => items.filter((item) => matchesRsvpFilter(item) && item.attendance === 'Present').length,
    [items, matchesRsvpFilter]
  );
  const absentCount = useMemo(
    () => items.filter((item) => matchesRsvpFilter(item) && item.attendance === 'Absent').length,
    [items, matchesRsvpFilter]
  );
  const unmarkedCount = useMemo(
    () => items.filter((item) => matchesRsvpFilter(item) && item.attendance === 'Pending').length,
    [items, matchesRsvpFilter]
  );

  const remainingUnmarkedProfileIds = useMemo(() => {
    return items
      .filter((item) => item.attendance === 'Pending' && matchesRsvpFilter(item))
      .map((item) => item.profileId);
  }, [items, matchesRsvpFilter]);

  const handleRescueDeclined = async (profileId: string) => {
    if (!profileId) return;
    try {
      await setRSVP(profileId, 'Yes');
      setSelectedDeclinedProfileId('');
      dialog.showToast(
        'The singer has been successfully set to Attending and added to the check-in list.'
      );
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Error Adding Singer',
        message: err instanceof Error ? err.message : 'Failed to update RSVP',
        variant: 'danger',
      });
    }
  };

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const handleSetAttendance = async (profileId: string, next: 'Present' | 'Absent' | 'Pending') => {
    try {
      const originalItem = items.find((i) => i.profileId === profileId);
      if (originalItem && originalItem.rsvp === 'Pending' && next === 'Present') {
        // Automatically promote pending singers to Yes when marked Present
        await setRSVP(profileId, 'Yes');
      }
      await setAttendance(profileId, next);
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Update Attendance',
        message: err instanceof Error ? err.message : 'Failed to update attendance',
        variant: 'danger',
      });
    }
  };

  const handleEditProfile = (profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId);
    if (profile) setEditingProfile(profile);
  };

  const handleSaveProfile = async (data: ProfileInput) => {
    if (!editingProfile) return;
    await editProfile(editingProfile.id, data);
    setEditingProfile(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <AppCard
        title="Attendance Check-in"
        actions={
          <div className="flex flex-row items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-text-muted text-[0.65rem] font-bold tracking-wider uppercase">
                Select Event
              </span>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  handleResetFilters(); // Reset filters when changing active event
                }}
                className="border-border bg-surface focus:border-primary focus:ring-primary h-10 w-full min-w-[240px] rounded-md border px-3 text-sm text-slate-800 shadow-sm transition-colors focus:ring-1 focus:outline-hidden md:w-80"
              >
                <option value="">-- Choose an Event --</option>
                {sortedEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {formatInTimezone(e.date, timezone, {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                    })}{' '}
                    - {e.title || e.expand?.venue?.name || ''} ({e.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      >
        {!selectedEventId ? (
          <div className="border-border bg-surface/20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-24 text-center shadow-xs">
            <span className="text-5xl opacity-40">📅</span>
            <p className="text-text-muted mt-6 text-lg font-semibold">
              Please select an event above to start check-in.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Event Summary Details Block */}
            {selectedEvent && (
              <div className="border-primary/20 bg-primary-light/30 flex flex-col gap-3 rounded-xl border p-5 shadow-xs transition-all duration-200">
                <div
                  className="flex w-full cursor-pointer flex-row items-center justify-between"
                  onClick={() => selectedEvent.details && setIsEventExpanded(!isEventExpanded)}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-text-muted text-[0.65rem] font-bold tracking-wider uppercase">
                      Active Event
                    </span>
                    <div className="flex flex-row items-center gap-2.5">
                      <h2 className="text-primary-deep m-0 text-xl font-extrabold tracking-tight">
                        {selectedEvent.title ||
                          selectedEvent.expand?.venue?.name ||
                          'Untitled Event'}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[0.625rem] font-bold tracking-wider uppercase ${selectedEvent.type === 'Performance' ? 'bg-danger-bg text-danger-text' : 'bg-primary/20 text-primary-deep'}`}
                      >
                        {selectedEvent.type}
                      </span>
                    </div>
                  </div>

                  {selectedEvent.details && (
                    <button
                      type="button"
                      className="border-border/40 text-primary-deep flex cursor-pointer items-center gap-1.5 rounded-lg border bg-white/50 px-3 py-1.5 text-xs font-bold transition-all hover:bg-white hover:shadow-xs active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEventExpanded(!isEventExpanded);
                      }}
                      aria-expanded={isEventExpanded}
                    >
                      {isEventExpanded ? '▲ Hide Details' : '▼ View Details'}
                    </button>
                  )}
                </div>

                <div className="border-primary/10 flex flex-row flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.expand?.venue?.address || selectedEvent.expand?.venue?.name || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-deep flex items-center gap-1.5 text-sm font-bold transition-colors hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg
                      className="text-primary size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {selectedEvent.expand?.venue?.name || 'Unknown Venue'}
                  </a>
                  <span className="text-text-muted flex items-center gap-1.5 text-sm font-medium">
                    <svg
                      className="size-4 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                    {formatInTimezone(selectedEvent.date, timezone, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {isEventExpanded && selectedEvent.details && (
                  <div className="border-primary/10 text-text-muted mt-3 border-t pt-3 text-sm">
                    <span className="text-text-muted mb-1.5 block text-[0.65rem] font-bold tracking-wider uppercase">
                      Details / Notes
                    </span>
                    <p className="m-0 leading-relaxed whitespace-pre-wrap text-slate-600">
                      {selectedEvent.details}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Attendance Status Stat Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {/* Expected Card */}
              <button
                type="button"
                onClick={() => setFilterStatus('')}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  filterStatus === ''
                    ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                    : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-[0.65rem] font-bold tracking-wider text-slate-500 uppercase">
                  <span>👥 Expected</span>
                  {filterStatus === '' && (
                    <span className="size-2 animate-pulse rounded-full bg-blue-500" />
                  )}
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-slate-800">
                  {expectedCount}
                </div>
              </button>

              {/* Present Card */}
              <button
                type="button"
                onClick={() => setFilterStatus('Present')}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  filterStatus === 'Present'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                    : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-[0.65rem] font-bold tracking-wider text-slate-500 uppercase">
                  <span>🟢 Present</span>
                  {filterStatus === 'Present' && (
                    <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                  )}
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-slate-800">
                  {presentCount}
                </div>
              </button>

              {/* Absent Card */}
              <button
                type="button"
                onClick={() => setFilterStatus('Absent')}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  filterStatus === 'Absent'
                    ? 'border-red-500 bg-red-50/40 ring-1 ring-red-500'
                    : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-[0.65rem] font-bold tracking-wider text-slate-500 uppercase">
                  <span>🔴 Absent</span>
                  {filterStatus === 'Absent' && (
                    <span className="size-2 animate-pulse rounded-full bg-red-500" />
                  )}
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-slate-800">
                  {absentCount}
                </div>
              </button>

              {/* Unmarked Card */}
              <button
                type="button"
                onClick={() => setFilterStatus('Pending')}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  filterStatus === 'Pending'
                    ? 'border-slate-500 bg-slate-100/40 ring-1 ring-slate-500'
                    : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-[0.65rem] font-bold tracking-wider text-slate-500 uppercase">
                  <span>⏳ Unmarked</span>
                  {filterStatus === 'Pending' && (
                    <span className="size-2 animate-pulse rounded-full bg-slate-500" />
                  )}
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-slate-800">
                  {unmarkedCount}
                </div>
              </button>
            </div>

            {/* Filter and Bulk Action Toolbar */}
            {!isLoading && !error && (
              <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-[280px] flex-[1_1_520px] flex-wrap items-center gap-2">
                  {/* Search active singers */}
                  <div className="relative min-w-[240px] flex-[1_1_280px]">
                    <span
                      className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 text-gray-500"
                      aria-hidden="true"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Search active singers..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="bg-surface focus:border-primary focus:ring-primary h-11 w-full rounded-lg border border-gray-200 px-[42px] pl-[38px] text-gray-800 focus:ring-1 focus:outline-hidden"
                    />
                    {filterName && (
                      <button
                        type="button"
                        onClick={() => setFilterName('')}
                        className="absolute top-1/2 right-2 inline-flex size-7.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-none p-1 text-gray-500 hover:bg-black/5"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Sort By selector */}
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      handleSortChange(e.target.value as 'lastName' | 'voicePart' | 'section')
                    }
                    className="bg-surface focus:border-primary focus:ring-primary h-11 w-[210px] rounded-lg border border-gray-200 px-3 pr-9 text-sm text-gray-800 focus:ring-1 focus:outline-hidden"
                    aria-label="Sort singers"
                  >
                    <option value="lastName">Last Name</option>
                    <option value="voicePart">Voice Part + Last Name</option>
                    <option value="section">Section + Last Name</option>
                  </select>

                  {/* RSVP Filter Selection */}
                  <select
                    value={rsvpFilter}
                    onChange={(e) =>
                      handleRsvpFilterChange(e.target.value as 'Yes' | 'Pending' | 'Both')
                    }
                    className="bg-surface focus:border-primary focus:ring-primary h-11 w-[240px] rounded-lg border border-gray-200 px-3 pr-9 text-sm text-gray-800 focus:ring-1 focus:outline-hidden"
                    aria-label="RSVP Status Filter"
                  >
                    <option value="Both">Both (Attending + Pending)</option>
                    <option value="Yes">Attending Only</option>
                    <option value="Pending">Pending RSVP Only</option>
                  </select>

                  {/* Voice Part Filter Selection */}
                  <select
                    value={selectedVoiceParts[0] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedVoiceParts(val ? [val] : []);
                    }}
                    className="bg-surface focus:border-primary focus:ring-primary h-11 w-[230px] rounded-lg border border-gray-200 px-3 pr-9 text-sm text-gray-800 focus:ring-1 focus:outline-hidden"
                    aria-label="Filter by Voice Part"
                  >
                    <option value="">All Voice Parts / Sections</option>
                    <optgroup label="Sections">
                      {sections.map((sec) => (
                        <option key={sec.code} value={sec.code}>
                          {sec.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Voice Parts">
                      {voiceParts.map((vp) => (
                        <option key={vp.label} value={vp.label}>
                          {vp.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {/* Reset Filters action */}
                  {(filterName ||
                    selectedVoiceParts.length > 0 ||
                    filterStatus !== '' ||
                    rsvpFilter !== 'Both') && (
                    <Button
                      onClick={handleResetFilters}
                      variant="secondary"
                      className="flex h-11 items-center gap-1 font-bold whitespace-nowrap"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                      </svg>
                      Reset Filters
                    </Button>
                  )}
                </div>

                {/* Bulk Actions Panel */}
                <div
                  className="ml-auto flex flex-[0_1_auto] flex-wrap items-center justify-end gap-2"
                  aria-label="Bulk attendance actions"
                >
                  <span className="text-xs font-bold whitespace-nowrap text-gray-500">
                    {filteredCheckInItems.length} shown
                  </span>

                  {/* Refresh Button */}
                  <button
                    onClick={() => refresh()}
                    className="border-border bg-surface flex size-9 cursor-pointer items-center justify-center rounded-lg border text-lg shadow-xs transition-all hover:bg-gray-50 active:scale-95"
                    title="Refresh Roster"
                    aria-label="Refresh roster"
                  >
                    🔄
                  </button>

                  {/* Bulk Present */}
                  <Button
                    onClick={async () => {
                      const isFiltered = Boolean(
                        filterName || selectedVoiceParts.length > 0 || filterStatus
                      );
                      const confirmed = await dialog.confirm({
                        title: 'Mark All Present',
                        message: `Are you sure you want to mark all ${isFiltered ? `${filteredCheckInItems.length} filtered singers` : 'singers'} as Present?`,
                        confirmLabel: 'Mark Present',
                        variant: 'info',
                      });
                      if (confirmed) {
                        try {
                          await setAllAttendance(
                            'Present',
                            isFiltered ? filteredCheckInItems.map((i) => i.profileId) : undefined
                          );
                        } catch (err: unknown) {
                          await dialog.showMessage({
                            title: 'Error updating attendance',
                            message: err instanceof Error ? err.message : 'Failed to bulk update',
                            variant: 'danger',
                          });
                        }
                      }
                    }}
                    variant="primary"
                    className="font-bold"
                  >
                    Mark Present
                  </Button>

                  {/* Bulk Absent */}
                  <Button
                    onClick={async () => {
                      if (remainingUnmarkedProfileIds.length === 0) return;
                      const confirmed = await dialog.confirm({
                        title: 'Mark Remaining Absent',
                        message: `Mark the remaining ${unmarkedCount} unmarked singers as Absent? Singers already marked Present will not be changed.`,
                        confirmLabel: 'Mark Remaining Absent',
                        variant: 'warning',
                      });
                      if (confirmed) {
                        try {
                          await setAllAttendance('Absent', remainingUnmarkedProfileIds);
                        } catch (err: unknown) {
                          await dialog.showMessage({
                            title: 'Error updating attendance',
                            message: err instanceof Error ? err.message : 'Failed to bulk update',
                            variant: 'danger',
                          });
                        }
                      }
                    }}
                    variant="danger"
                    className="font-bold"
                    disabled={remainingUnmarkedProfileIds.length === 0}
                  >
                    Mark Remaining Absent
                  </Button>

                  {/* Bulk Reset */}
                  <Button
                    onClick={async () => {
                      const isFiltered = Boolean(
                        filterName || selectedVoiceParts.length > 0 || filterStatus
                      );
                      const confirmed = await dialog.confirm({
                        title: 'Reset Attendance',
                        message: `Are you sure you want to reset all ${isFiltered ? `${filteredCheckInItems.length} filtered singers` : 'singers'} to unmarked status?`,
                        confirmLabel: 'Reset All',
                        variant: 'warning',
                      });
                      if (confirmed) {
                        try {
                          await setAllAttendance(
                            'Pending',
                            isFiltered ? filteredCheckInItems.map((i) => i.profileId) : undefined
                          );
                        } catch (err: unknown) {
                          await dialog.showMessage({
                            title: 'Error updating attendance',
                            message: err instanceof Error ? err.message : 'Failed to bulk update',
                            variant: 'danger',
                          });
                        }
                      }
                    }}
                    variant="secondary"
                    className="font-bold"
                  >
                    Reset All
                  </Button>
                </div>
              </div>
            )}

            {/* Attendance List */}
            {isLoading ? (
              <div className="border-border bg-surface rounded-lg border p-12 text-center shadow-xs">
                <p className="text-text-muted m-0 font-medium">Loading attendance data...</p>
              </div>
            ) : error ? (
              <div className="border-danger-text/30 bg-danger-bg rounded-lg border p-8 text-center shadow-xs">
                <p className="text-danger-text m-0 font-bold">{error}</p>
              </div>
            ) : filteredCheckInItems.length === 0 && declinedSingers.length === 0 ? (
              <div className="border-border bg-surface/30 flex flex-col items-center rounded-lg border-2 border-dashed p-12 text-center shadow-xs">
                <span className="text-4xl">🔍</span>
                <h3 className="text-text mt-4 mb-2 text-xl font-extrabold">No Matching Singers</h3>
                <p className="text-text-muted mt-0 mb-6 max-w-sm text-sm font-medium">
                  Try adjusting your search terms, voice parts, or attendance filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="bg-primary hover:bg-primary-deep cursor-pointer rounded-md px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-6">
                {/* Main Check-In list table */}
                <div className="flex w-full flex-col gap-1">
                  {filteredCheckInItems.length > 0 ? (
                    <CheckInList
                      items={filteredCheckInItems}
                      onSetAttendance={handleSetAttendance}
                      onEdit={handleEditProfile}
                      sortBy={sortBy}
                      missCounts={missCounts}
                      maxRehearsalMisses={maxRehearsalMisses}
                    />
                  ) : (
                    <div className="border-border bg-surface/30 rounded-lg border border-dashed p-6 text-center shadow-xs">
                      <p className="text-text-muted m-0 text-sm font-medium">
                        No singers match your RSVP or attendance filters.
                      </p>
                    </div>
                  )}
                </div>

                {/* Declined Singers Rescue Control */}
                {declinedSingers.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-xs">
                    <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-red-800">Rescue Declined RSVP</h3>
                        <p className="m-0 text-xs font-medium text-red-600/80">
                          Did someone show up anyway? Change their RSVP and add them back to the
                          active list instantly.
                        </p>
                      </div>

                      <div className="flex w-full min-w-[320px] flex-row items-center gap-3 md:w-auto">
                        <select
                          value={selectedDeclinedProfileId}
                          onChange={(e) => setSelectedDeclinedProfileId(e.target.value)}
                          className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-xs transition-colors focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-hidden md:w-64"
                        >
                          <option value="">-- Select Declined Singer --</option>
                          {declinedSingers.map((s) => (
                            <option key={s.profileId} value={s.profileId}>
                              {s.name} ({s.voicePart})
                            </option>
                          ))}
                        </select>
                        <Button
                          disabled={!selectedDeclinedProfileId}
                          onClick={() => handleRescueDeclined(selectedDeclinedProfileId)}
                          variant="danger"
                          className="font-bold whitespace-nowrap"
                        >
                          + Add Back
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </AppCard>

      <SingerModal
        isOpen={Boolean(editingProfile)}
        onClose={() => {
          setEditingProfile(null);
          refresh();
        }}
        onSave={handleSaveProfile}
        initialData={editingProfile}
      />
    </div>
  );
}
