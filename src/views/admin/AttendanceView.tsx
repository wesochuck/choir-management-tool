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
import { Input } from '../../components/ui';
import { Button, Select } from '../../components/ui';
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

        const eventRosterMap = new Map<string, Map<string, EventRoster>>();
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
            const r = eventMap?.get(profileId);

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
              <span className="text-overline text-text-muted">
                Select Event
              </span>
              <Select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  handleResetFilters(); // Reset filters when changing active event
                }}
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
              </Select>
            </div>
          </div>
        }
      >
        {!selectedEventId ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface/20 p-24 text-center shadow-xs">
            <span className="text-5xl opacity-40">📅</span>
            <p className="mt-6 text-lg font-semibold text-text-muted">
              Please select an event above to start check-in.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Event Summary Details Block */}
            {selectedEvent && (
              <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary-light/30 p-5 shadow-xs transition-all duration-200">
                <div
                  className="flex w-full cursor-pointer flex-row items-center justify-between"
                  onClick={() => selectedEvent.details && setIsEventExpanded(!isEventExpanded)}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-overline text-text-muted">
                      Active Event
                    </span>
                    <div className="flex flex-row items-center gap-2.5">
                      <h2 className="m-0 text-xl font-extrabold tracking-tight text-primary-deep">
                        {selectedEvent.title ||
                          selectedEvent.expand?.venue?.name ||
                          'Untitled Event'}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-overline ${selectedEvent.type === 'Performance' ? 'bg-danger-bg text-danger-text' : 'bg-primary/20 text-primary-deep'}`}
                      >
                        {selectedEvent.type}
                      </span>
                    </div>
                  </div>

                  {selectedEvent.details && (
                    <button
                      type="button"
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/40 bg-white/50 px-3 py-1.5 text-xs font-bold text-primary-deep transition-all hover:bg-white hover:shadow-xs active:scale-95"
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

                <div className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2 border-t border-primary/10 pt-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.expand?.venue?.address || selectedEvent.expand?.venue?.name || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary-deep hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg
                      className="size-4 text-primary"
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
                  <span className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
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
                  <div className="mt-3 border-t border-primary/10 pt-3 text-sm text-text-muted">
                    <span className="mb-1.5 block text-overline text-text-muted">
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
                <div className="flex items-center justify-between text-overline text-slate-500">
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
                <div className="flex items-center justify-between text-overline text-slate-500">
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
                <div className="flex items-center justify-between text-overline text-slate-500">
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
                <div className="flex items-center justify-between text-overline text-slate-500">
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
              <div className="mt-1 flex flex-col gap-3">
                {/* Row 1 — Search + filter selects inline on desktop */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search input — grows to fill remaining space */}
                  <Input
                    type="text"
                    placeholder="Search active singers..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="min-w-[200px] flex-1"
                  >
                    <span slot="prefix" className="flex items-center text-gray-500">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    {filterName && (
                      <button
                        slot="suffix"
                        type="button"
                        onClick={() => setFilterName('')}
                        className="flex items-center rounded-full p-0.5 text-gray-500 hover:text-gray-800"
                        aria-label="Clear search"
                      >
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </Input>

                  {/* Sort By — wrapper constrains w-full select to content width */}
                  <div className="shrink-0">
                    <Select
                      value={sortBy}
                      onChange={(e) =>
                        handleSortChange(e.target.value as 'lastName' | 'voicePart' | 'section')
                      }
                      aria-label="Sort singers"
                    >
                      <option value="lastName">Last Name</option>
                      <option value="voicePart">Voice Part + Last Name</option>
                      <option value="section">Section + Last Name</option>
                    </Select>
                  </div>

                  {/* RSVP Filter — wrapper constrains w-full select to content width */}
                  <div className="shrink-0">
                    <Select
                      value={rsvpFilter}
                      onChange={(e) =>
                        handleRsvpFilterChange(e.target.value as 'Yes' | 'Pending' | 'Both')
                      }
                      aria-label="RSVP Status Filter"
                    >
                      <option value="Both">Both (Attending + Pending)</option>
                      <option value="Yes">Attending Only</option>
                      <option value="Pending">Pending RSVP Only</option>
                    </Select>
                  </div>

                  {/* Voice Part Filter — wrapper constrains w-full select to content width */}
                  <div className="shrink-0">
                    <Select
                      value={selectedVoiceParts[0] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedVoiceParts(val ? [val] : []);
                      }}
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
                    </Select>
                  </div>

                  {/* Reset Filters action */}
                  {(filterName ||
                    selectedVoiceParts.length > 0 ||
                    filterStatus !== '' ||
                    rsvpFilter !== 'Both') && (
                    <Button
                      onClick={handleResetFilters}
                      variant="secondary"
                      className="flex h-11 shrink-0 items-center gap-1"
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

                {/* Row 2 — Bulk Actions */}
                <div
                  className="flex flex-wrap items-center justify-end gap-2"
                  aria-label="Bulk attendance actions"
                >
                  <span className="text-xs font-bold whitespace-nowrap text-gray-500">
                    {filteredCheckInItems.length} shown
                  </span>

                  {/* Refresh Button */}
                  <button
                    onClick={() => refresh()}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-lg shadow-xs transition-all hover:bg-gray-50 active:scale-95"
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
              <div className="rounded-lg border border-border bg-surface p-12 text-center shadow-xs">
                <p className="m-0 font-medium text-text-muted">Loading attendance data...</p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-danger-text/30 bg-danger-bg p-8 text-center shadow-xs">
                <p className="m-0 font-bold text-danger-text">{error}</p>
              </div>
            ) : filteredCheckInItems.length === 0 && declinedSingers.length === 0 ? (
              <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-border bg-surface/30 p-12 text-center shadow-xs">
                <span className="text-4xl">🔍</span>
                <h3 className="mt-4 mb-2 text-xl font-extrabold text-text">No Matching Singers</h3>
                <p className="mt-0 mb-6 max-w-sm text-sm font-medium text-text-muted">
                  Try adjusting your search terms, voice parts, or attendance filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="cursor-pointer rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-deep active:scale-95"
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
                    <div className="rounded-lg border border-dashed border-border bg-surface/30 p-6 text-center shadow-xs">
                      <p className="m-0 text-sm font-medium text-text-muted">
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
                        <Select
                          value={selectedDeclinedProfileId}
                          onChange={(e) => setSelectedDeclinedProfileId(e.target.value)}
                        >
                          <option value="">-- Select Declined Singer --</option>
                          {declinedSingers.map((s) => (
                            <option key={s.profileId} value={s.profileId}>
                              {s.name} ({s.voicePart})
                            </option>
                          ))}
                        </Select>
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
