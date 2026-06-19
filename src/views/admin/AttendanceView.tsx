import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance, type AttendanceItem } from '../../hooks/useAttendance';
import { useProfiles } from '../../hooks/useProfiles';
import { useDialog } from '../../contexts/DialogContext';
import { SingerModal } from '../../components/admin/SingerModal';
import type { Profile, ProfileInput } from '../../services/profileService';
import { settingsService } from '../../services/settingsService';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { rosterService } from '../../services/rosterService';
import type { EventRoster } from '../../services/rosterService';
import { chunkArray } from '../../lib/networkSafety';
import { useRateLimitRetryToast } from '../../hooks/useRateLimitRetryToast';
import { AppCard } from '../../components/common/AppCard';
import { Button, Select } from '../../components/ui';
import { getLastName } from '../../lib/stringUtils';
import { MusicalNoteIcon, ChevronDownIcon, CheckIcon, XMarkIcon } from '../../components/ui/icons';

const MODULE_LOAD_TIME = Date.now();

export default function AttendanceView() {
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  const { timezone } = useChoirSettings();
  const { events } = useEvents();
  const { profiles, editProfile } = useProfiles();

  const [selectedEventId, setSelectedEventId] = useState('');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Present' | 'Absent' | 'Unmarked'>('All');
  const [selectedDeclinedProfileId, setSelectedDeclinedProfileId] = useState('');
  const hasDefaultedRef = useRef(false);

  const { voiceParts, sections } = useVoiceParts();

  const rosterSettingsQuery = useQuery({
    queryKey: queryKeys.appSettings.roster,
    queryFn: () => settingsService.getRosterSettings(),
  });
  const maxRehearsalMisses = rosterSettingsQuery.data?.maxRehearsalMisses ?? 3;

  // Query to get rosters for all events to display attendance statistics in the switcher
  const eventIds = useMemo(() => events.map((e) => e.id), [events]);
  const allRostersQuery = useQuery({
    queryKey: ['eventRosters', 'all', eventIds],
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

      const allRosters: EventRoster[] = [];
      const chunkPromises = idChunks.map((chunk) => rosterService.getRostersForEvents(chunk));
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

  const { items, isLoading, error, setAttendance, setRSVP, refresh } = useAttendance(
    selectedEventId,
    {
      onRateLimitRetry: onAttendanceRateLimitRetry,
    }
  );

  useEffect(() => {
    if (isLoading) {
      resetAttendanceRateLimitToast();
    }
  }, [isLoading, resetAttendanceRateLimitToast]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const expectedSingers = useMemo(
    () => items.filter((item) => item.rsvp === 'Yes' || item.rsvp === 'Pending'),
    [items]
  );

  const declinedSingers = useMemo(() => {
    return items.filter((item) => item.rsvp === 'No');
  }, [items]);

  // Compute total counts for the summary progress bar
  const expectedCount = expectedSingers.length;
  const presentCount = useMemo(
    () => expectedSingers.filter((item) => item.attendance === 'Present').length,
    [expectedSingers]
  );

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

  const formatDate = (dateStr: string) => {
    return formatInTimezone(dateStr, timezone, {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return formatInTimezone(dateStr, timezone, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getSingerSection = useCallback(
    (voicePart: string): string => {
      const vp = voiceParts.find((v) => v.label === voicePart);
      if (vp) {
        const sec = sections.find((s) => s.code === vp.sectionCode);
        if (sec) {
          const name = sec.name.toLowerCase();
          if (name.includes('soprano') && !name.includes('mezzo')) return 'Soprano';
          if (name.includes('mezzo')) return 'Mezzo-Soprano';
          if (name.includes('alto')) return 'Alto';
          if (name.includes('tenor')) return 'Tenor';
          if (name.includes('baritone')) return 'Baritone';
          if (name.includes('bass')) return 'Bass';
          return sec.name;
        }
      }

      const vpLower = (voicePart || '').toLowerCase();
      if (vpLower.includes('mezzo')) return 'Mezzo-Soprano';
      if (vpLower.includes('soprano') || vpLower.startsWith('s')) return 'Soprano';
      if (vpLower.includes('alto') || vpLower.startsWith('a')) return 'Alto';
      if (vpLower.includes('tenor') || vpLower.startsWith('t')) return 'Tenor';
      if (vpLower.includes('baritone')) return 'Baritone';
      if (vpLower.includes('bass') || vpLower.startsWith('b')) return 'Bass';
      return 'Other';
    },
    [voiceParts, sections]
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
    const sectionsFound = new Set(expectedSingers.map((s) => getSingerSection(s.voicePart)));
    const SECTION_ORDER = ['Soprano', 'Mezzo-Soprano', 'Alto', 'Tenor', 'Baritone', 'Bass'];
    sectionsFound.forEach((sec) => {
      if (!SECTION_ORDER.includes(sec)) {
        SECTION_ORDER.push(sec);
      }
    });

    const compareSingers = (a: AttendanceItem, b: AttendanceItem) => {
      const lastA = getLastName(a.name);
      const lastB = getLastName(b.name);
      const cmp = lastA.localeCompare(lastB);
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name);
    };

    const acc: Record<string, AttendanceItem[]> = {};
    SECTION_ORDER.forEach((section) => {
      const matches = filteredSingers.filter((s) => getSingerSection(s.voicePart) === section);
      if (matches.length > 0) {
        acc[section] = [...matches].sort(compareSingers);
      }
    });
    return acc;
  }, [filteredSingers, expectedSingers, getSingerSection]);

  return (
    <div className="flex flex-col gap-6">
      <AppCard title="Attendance Check-in" noPadding>
        {!selectedEventId ? (
          <div className="border-border bg-surface/20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-24 text-center shadow-xs">
            <span className="text-5xl opacity-40">📅</span>
            <p className="text-text-muted mt-6 text-lg font-semibold">
              Please select an event to start check-in.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Tappable event card */}
            {selectedEvent && (
              <div
                onClick={() => setShowSwitcher((prev) => !prev)}
                className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 hover:bg-gray-50"
                aria-expanded={showSwitcher}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setShowSwitcher((prev) => !prev);
                  }
                }}
              >
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <MusicalNoteIcon className="h-5 w-5 text-blue-600" />
                </div>

                {/* Event info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {selectedEvent.type} · {formatDate(selectedEvent.date)}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {selectedEvent.expand?.venue?.name || 'Unknown Venue'} ·{' '}
                    {formatTime(selectedEvent.date)}
                  </p>
                </div>

                {/* Chevron */}
                <ChevronDownIcon
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showSwitcher ? 'rotate-180' : ''}`}
                />
              </div>
            )}

            {/* Inline event switcher */}
            {showSwitcher && (
              <div className="max-h-[300px] overflow-y-auto border-b border-gray-100 bg-gray-50 px-4 py-3">
                <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                  Switch to
                </p>
                <ul className="flex flex-col gap-1">
                  {sortedEvents.map((ev) => {
                    const stats = eventStats[ev.id] || { present: 0, expected: 0 };
                    const isCompleted = new Date(ev.date).getTime() < MODULE_LOAD_TIME;
                    const isActive = ev.id === selectedEventId;
                    return (
                      <li
                        key={ev.id}
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          setShowSwitcher(false);
                        }}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                          isActive
                            ? 'border border-gray-200 bg-white shadow-sm'
                            : 'hover:bg-gray-100'
                        }`}
                        role="option"
                        aria-selected={isActive}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedEventId(ev.id);
                            setShowSwitcher(false);
                          }
                        }}
                      >
                        {/* Status dot */}
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            isCompleted ? 'bg-teal-500' : 'bg-gray-300'
                          }`}
                        />

                        {/* Name + time */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {ev.type} · {formatDate(ev.date)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ev.expand?.venue?.name || 'Unknown Venue'} · {formatTime(ev.date)}
                          </p>
                        </div>

                        {/* Attendance badge */}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isCompleted
                              ? 'border border-teal-100 bg-teal-50 text-teal-800'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {isCompleted ? `${stats.present}/${stats.expected}` : '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Progress bar */}
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-300"
                  // @allow-inline-style - dynamic width for progress bar
                  style={{
                    // @allow-inline-style - dynamic width for progress bar
                    width: `${expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="flex items-center gap-1 text-xs font-medium whitespace-nowrap text-teal-700">
                {presentCount === expectedCount && expectedCount > 0 && (
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 text-teal-700" />
                )}
                <span>
                  {presentCount} / {expectedCount}
                </span>
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2">
              {(['All', 'Present', 'Absent', 'Unmarked'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`h-7 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    filter === f
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Roster list */}
            {isLoading ? (
              <div className="border-border bg-surface m-4 rounded-lg border p-12 text-center shadow-xs">
                <p className="text-text-muted m-0 font-medium">Loading attendance data...</p>
              </div>
            ) : error ? (
              <div className="border-danger-text/30 bg-danger-bg m-4 rounded-lg border p-8 text-center shadow-xs">
                <p className="text-danger-text m-0 font-bold">{error}</p>
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="border-border bg-surface/30 m-4 flex flex-col items-center rounded-lg border-2 border-dashed p-12 text-center shadow-xs">
                <span className="text-4xl">🔍</span>
                <h3 className="text-text mt-4 mb-2 text-xl font-extrabold">No Matching Singers</h3>
                <p className="text-text-muted mt-0 mb-6 max-w-sm text-sm font-medium">
                  Try adjusting your filter pills or active event choice.
                </p>
              </div>
            ) : (
              <div className="flex w-full flex-col">
                {Object.entries(grouped).map(([section, members]) => (
                  <div key={section}>
                    {/* Section header */}
                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-1.5">
                      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        {section}
                      </p>
                    </div>

                    {members.map((singer) => (
                      <div
                        key={singer.id}
                        onClick={() => {
                          const nextStatus: Record<
                            'Present' | 'Absent' | 'Pending',
                            'Present' | 'Absent' | 'Pending'
                          > = {
                            Pending: 'Present',
                            Present: 'Absent',
                            Absent: 'Pending',
                          };
                          handleSetAttendance(singer.profileId, nextStatus[singer.attendance]);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            const nextStatus: Record<
                              'Present' | 'Absent' | 'Pending',
                              'Present' | 'Absent' | 'Pending'
                            > = {
                              Pending: 'Present',
                              Present: 'Absent',
                              Absent: 'Pending',
                            };
                            handleSetAttendance(singer.profileId, nextStatus[singer.attendance]);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Toggle attendance for ${singer.name}. Current state: ${singer.attendance}`}
                        className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-2.5 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        {/* Tap target status indicator */}
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            singer.attendance === 'Present'
                              ? 'border-teal-500 bg-teal-500'
                              : singer.attendance === 'Absent'
                                ? 'border-red-400 bg-red-400'
                                : 'border-gray-300 bg-white'
                          }`}
                        >
                          {singer.attendance === 'Present' && (
                            <CheckIcon className="h-3.5 w-3.5 text-white" />
                          )}
                          {singer.attendance === 'Absent' && (
                            <XMarkIcon className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>

                        {/* Voice Part Chip */}
                        <span className="bg-primary-light text-primary-deep border-primary-deep/10 inline-flex min-w-[32px] shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-bold">
                          {singer.voicePart}
                        </span>

                        {/* Name + details */}
                        <div className="flex flex-col">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProfile(singer.profileId);
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                              }}
                              className="cursor-pointer border-0 bg-transparent p-0 text-left text-lg font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                            >
                              {singer.name}
                            </button>
                            {missCounts[singer.profileId] > 0 && (
                              <span
                                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  missCounts[singer.profileId] > maxRehearsalMisses
                                    ? 'bg-red-50/80 text-red-700'
                                    : 'bg-amber-50/80 text-amber-700'
                                }`}
                              >
                                ⚠️ {missCounts[singer.profileId]} missed
                              </span>
                            )}
                          </div>
                          {singer.rsvpNote && (
                            <span className="mt-0.5 text-xs font-semibold text-red-600 italic">
                              📝 {singer.rsvpNote}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Declined Singers Rescue Control */}
            {declinedSingers.length > 0 && (
              <div className="border-t border-red-100 bg-red-50/50 p-4">
                <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-xs font-bold text-red-800">Rescue Declined RSVP</h3>
                    <p className="m-0 text-[11px] font-medium text-red-600/80">
                      Did someone show up anyway? Change RSVP to attending.
                    </p>
                  </div>

                  <div className="flex w-full min-w-[280px] flex-row items-center gap-2 md:w-auto">
                    <Select
                      value={selectedDeclinedProfileId}
                      onChange={(e) => setSelectedDeclinedProfileId(e.target.value)}
                      className="h-8 py-0 text-xs"
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
                      size="small"
                    >
                      + Add Back
                    </Button>
                  </div>
                </div>
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
