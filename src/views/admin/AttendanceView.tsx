import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance } from '../../hooks/useAttendance';
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
  const [filterVoicePart, setFilterVoicePart] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
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
  
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [selectedDeclinedProfileId, setSelectedDeclinedProfileId] = useState('');
  const { labels: voicePartLabels } = useVoiceParts();

  useEffect(() => {
    settingsService.getRosterSettings()
      .then(settings => {
        if (settings?.maxRehearsalMisses !== undefined) {
          setMaxRehearsalMisses(settings.maxRehearsalMisses);
        }
      })
      .catch(err => console.error('Failed to load roster settings:', err));
  }, []);

  // Compute missed rehearsals count for each singer in the performance cycle
  useEffect(() => {
    if (!selectedEventId || events.length === 0) {
      setMissCounts({});
      return;
    }

    const event = events.find(e => e.id === selectedEventId);
    if (!event) return;

    const isPerformance = event.type === 'Performance';
    const linkedPerfId = isPerformance ? event.id : event.parentPerformanceId;

    if (!linkedPerfId) {
      setMissCounts({});
      return;
    }

    const cycleRehearsals = events.filter(e => e.type === 'Rehearsal' && e.parentPerformanceId === linkedPerfId);
    if (cycleRehearsals.length === 0) {
      setMissCounts({});
      return;
    }

    const fetchMissCounts = async () => {
      try {
        const nowMs = Date.now();
        const pastRehearsals = cycleRehearsals.filter(reh => new Date(reh.date).getTime() < nowMs);

        const perfRosters = linkedPerfId ? await pb.collection('eventRosters').getFullList({
          filter: pb.filter('event = {:linkedPerfId} && rsvp = "Yes"', { linkedPerfId })
        }) : [];
        const performingProfileIds = new Set(perfRosters.map(r => r.profile));

        const rehearsalIds = pastRehearsals.map(reh => reh.id);
        const idChunks = chunkArray(rehearsalIds, 50);

        const allRosters: EventRoster[] = [];

        const chunkPromises = idChunks.map(chunk => {
          const filterStr = chunk.map((_, i) => `event = {:id${i}}`).join(' || ');
          const params = Object.fromEntries(chunk.map((id, i) => [`id${i}`, id]));
          return pb.collection('eventRosters').getFullList<EventRoster>({
            filter: pb.filter(filterStr, params)
          });
        });

        const chunkResults = await Promise.all(chunkPromises);
        for (const chunkRosters of chunkResults) {
          allRosters.push(...chunkRosters);
        }

        const rostersLists = pastRehearsals.map(reh =>
          allRosters.filter(r => r.event === reh.id)
        );

        const rosterMaps = rostersLists.map(rosters => {
          const map = new Map();
          for (const r of rosters) {
            map.set(r.profile, r);
          }
          return map;
        });

        const counts: Record<string, number> = {};

        performingProfileIds.forEach(profileId => {
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

  const { onRetry: onAttendanceRateLimitRetry, reset: resetAttendanceRateLimitToast } = useRateLimitRetryToast(
    'Attendance action is being rate-limited; retrying automatically...',
  );

  const { items, isLoading, error, setAttendance, setRSVP, setAllAttendance, refresh } = useAttendance(selectedEventId, {
    onRateLimitRetry: onAttendanceRateLimitRetry,
  });

  useEffect(() => {
    if (isLoading) {
      resetAttendanceRateLimitToast();
    }
  }, [isLoading, resetAttendanceRateLimitToast]);

  const selectedEvent = useMemo(() => 
    events.find(e => e.id === selectedEventId), 
    [events, selectedEventId]
  );

  // Compute filtered items dynamically
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Filter by Name (case-insensitive search)
      if (filterName.trim()) {
        const query = filterName.toLowerCase();
        if (!item.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 2. Filter by Voice Part
      if (filterVoicePart) {
        if (item.voicePart !== filterVoicePart) {
          return false;
        }
      }

      // 3. Filter by Attendance Status
      if (filterStatus) {
        if (item.attendance !== filterStatus) {
          return false;
        }
      }

      return true;
    });
  }, [items, filterName, filterVoicePart, filterStatus]);

  const checkInItems = useMemo(() => {
    return filteredItems.filter(item => {
      if (rsvpFilter === 'Yes') {
        return item.rsvp === 'Yes';
      }
      if (rsvpFilter === 'Pending') {
        return item.rsvp === 'Pending';
      }
      return item.rsvp === 'Yes' || item.rsvp === 'Pending';
    });
  }, [filteredItems, rsvpFilter]);

  const declinedSingers = useMemo(() => {
    return items.filter(item => item.rsvp === 'No');
  }, [items]);

  const attendanceCounts = useMemo(() => {
    const present = items.filter((item) => item.attendance === 'Present').length;
    const absent = items.filter((item) => item.attendance === 'Absent').length;
    const unmarked = items.filter((item) => item.attendance === 'Pending').length;

    return {
      total: items.length,
      present,
      absent,
      unmarked,
    };
  }, [items]);

  const remainingUnmarkedProfileIds = useMemo(() => {
    return items
      .filter((item) => item.attendance === 'Pending')
      .map((item) => item.profileId);
  }, [items]);

  const handleRescueDeclined = async (profileId: string) => {
    if (!profileId) return;
    try {
      await setRSVP(profileId, 'Yes');
      setSelectedDeclinedProfileId('');
      dialog.showToast('The singer has been successfully set to Attending and added to the check-in list.');
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Error Adding Singer',
        message: err instanceof Error ? err.message : 'Failed to update RSVP',
        variant: 'danger'
      });
    }
  };

  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const handleResetFilters = () => {
    setFilterName('');
    setFilterVoicePart('');
    setFilterStatus('');
  };

  const handleSetAttendance = async (profileId: string, next: 'Present' | 'Absent' | 'Pending') => {
    try {
      const originalItem = items.find(i => i.profileId === profileId);
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div className="flex flex-col justify-between gap-6 border-b border-border pb-6 md:flex-row md:items-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-text">Attendance Check-in</h1>
        
        <div className="flex w-full flex-row items-center gap-6 md:w-auto md:min-w-[320px]">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                handleResetFilters(); // Reset filters when changing active event
              }}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              <option value="">-- Choose an Event --</option>
              {sortedEvents.map(e => (
                <option key={e.id} value={e.id}>{formatInTimezone(e.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {e.title || e.expand?.venue?.name || ''} ({e.type})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary-light/50 p-4 transition-all duration-200 shadow-xs">
          <div className="flex w-full cursor-pointer flex-row items-center justify-between" onClick={() => setIsEventExpanded(!isEventExpanded)}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted">Active Event</span>
              <div className="flex flex-row items-center gap-2">
                {selectedEvent.title && <h2 className="m-0 text-xl font-extrabold tracking-tight text-primary-deep">{selectedEvent.title}</h2>}
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[0.625rem] font-bold tracking-wider uppercase ${selectedEvent.type === 'Performance' ? 'bg-performance-bg text-performance-text' : 'bg-primary/20 text-primary-deep'}`}>
                  {selectedEvent.type}
                </span>
              </div>
            </div>
            
            <button 
              type="button" 
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-text-muted transition-colors hover:bg-black/5 active:bg-black/10"
              onClick={(e) => {
                e.stopPropagation();
                setIsEventExpanded(!isEventExpanded);
              }}
              aria-expanded={isEventExpanded}
            >
              {isEventExpanded ? '▲ Hide' : '▼ Details'}
            </button>
          </div>
          
          <div className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.expand?.venue?.address || selectedEvent.expand?.venue?.name || '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-bold text-primary-deep transition-colors hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span>📍</span>
              {selectedEvent.expand?.venue?.name || 'Unknown Venue'}
            </a>
            <span className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
              <span>📅</span>
              {formatInTimezone(selectedEvent.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-bold text-text">
              👥 {attendanceCounts.total} Singers
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[0.7rem] font-bold text-text-muted shadow-xs">
              Present {attendanceCounts.present}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[0.7rem] font-bold text-text-muted shadow-xs">
              Absent {attendanceCounts.absent}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[0.7rem] font-bold text-text-muted shadow-xs">
              Unmarked {attendanceCounts.unmarked}
            </span>
          </div>

          <div className="flex flex-col items-end gap-2 lg:items-center">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md bg-surface border border-border px-3 py-1.5 text-xs font-bold text-text-muted shadow-xs transition-colors hover:bg-gray-50 active:bg-gray-100 lg:hidden"
              onClick={() => setIsMobileActionsOpen((previous) => !previous)}
              aria-expanded={isMobileActionsOpen}
              aria-controls="attendance-mobile-actions"
            >
              {isMobileActionsOpen ? '⚡ Hide Bulk Actions ▲' : '⚡ Bulk Actions ▼'}
            </button>

            <div
              className={`flex-row flex-wrap items-center gap-2.5 ${isMobileActionsOpen ? 'flex' : 'hidden lg:flex'}`}
              id="attendance-mobile-actions"
            >
              {/* Refresh Button */}
              <button
                onClick={() => refresh()}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-lg shadow-xs transition-all hover:bg-gray-50 active:scale-95"
                title="Refresh Roster"
                aria-label="Refresh roster"
              >
                🔄
              </button>

              <span className="h-5 w-px bg-border"></span>

              {/* Bulk Present */}
              <button
                onClick={async () => {
                  const isFiltered = Boolean(filterName || filterVoicePart || filterStatus);
                  const confirmed = await dialog.confirm({
                    title: 'Mark All Present',
                    message: `Are you sure you want to mark all ${isFiltered ? `${filteredItems.length} filtered singers` : 'singers'} as Present?`,
                    confirmLabel: 'Mark Present',
                    variant: 'info'
                  });
                  if (confirmed) {
                    try {
                      await setAllAttendance('Present', isFiltered ? filteredItems.map(i => i.profileId) : undefined);
                    } catch (err: unknown) {
                      await dialog.showMessage({
                        title: 'Error updating attendance',
                        message: err instanceof Error ? err.message : 'Failed to bulk update',
                        variant: 'danger'
                      });
                    }
                  }
                }}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary-deep shadow-xs transition-all hover:bg-primary/20 active:scale-95"
              >
                ✅ Mark All Present
              </button>

              {/* Bulk Absent */}
              <button
                onClick={async () => {
                  if (remainingUnmarkedProfileIds.length === 0) return;
                  const confirmed = await dialog.confirm({
                    title: 'Mark Remaining Absent',
                    message: `Mark the remaining ${attendanceCounts.unmarked} unmarked singers as Absent? Singers already marked Present will not be changed.`,
                    confirmLabel: 'Mark Remaining Absent',
                    variant: 'warning'
                  });
                  if (confirmed) {
                    try {
                      await setAllAttendance('Absent', remainingUnmarkedProfileIds);
                    } catch (err: unknown) {
                      await dialog.showMessage({
                        title: 'Error updating attendance',
                        message: err instanceof Error ? err.message : 'Failed to bulk update',
                        variant: 'danger'
                      });
                    }
                  }
                }}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-4 text-xs font-bold text-warning-text shadow-xs transition-all enabled:hover:bg-warning/20 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={remainingUnmarkedProfileIds.length === 0}
              >
                ⚠️ Mark Remaining Absent
              </button>

              {/* Bulk Reset */}
              <button
                onClick={async () => {
                  const isFiltered = Boolean(filterName || filterVoicePart || filterStatus);
                  const confirmed = await dialog.confirm({
                    title: 'Reset Attendance',
                    message: `Are you sure you want to reset all ${isFiltered ? `${filteredItems.length} filtered singers` : 'singers'} to unmarked status?`,
                    confirmLabel: 'Reset All',
                    variant: 'warning'
                  });
                  if (confirmed) {
                    try {
                      await setAllAttendance('Pending', isFiltered ? filteredItems.map(i => i.profileId) : undefined);
                    } catch (err: unknown) {
                      await dialog.showMessage({
                        title: 'Error updating attendance',
                        message: err instanceof Error ? err.message : 'Failed to bulk update',
                        variant: 'danger'
                      });
                    }
                  }
                }}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-border bg-surface px-4 text-xs font-bold text-text-muted shadow-xs transition-all hover:bg-gray-50 active:scale-95"
              >
                ⏳ Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div className="flex flex-row flex-wrap items-end gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs">
          {/* Name Search */}
          <div className="flex flex-[1_1_240px] flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted">Search by Name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input 
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Search name..."
                className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Voice Part Filter */}
          <div className="flex w-[160px] flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted">Voice Part</label>
            <select
              value={filterVoicePart}
              onChange={(e) => setFilterVoicePart(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              <option value="">All Parts</option>
              {voicePartLabels.map(part => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div className="flex w-[160px] flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted">Attendance</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Pending">Unmarked</option>
            </select>
          </div>

          {/* RSVP Status Filter */}
          <div className="flex w-[160px] flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted">RSVP Status</label>
            <select
              value={rsvpFilter}
              onChange={(e) => handleRsvpFilterChange(e.target.value as 'Yes' | 'Pending' | 'Both')}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              <option value="Both">Both (Attending + Pending)</option>
              <option value="Yes">Attending Only</option>
              <option value="Pending">Pending Only</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div className="flex w-[160px] flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'lastName' | 'voicePart' | 'section')}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              <option value="lastName">Last Name</option>
              <option value="voicePart">Voice Part</option>
              <option value="section">Section</option>
            </select>
          </div>

          {/* Reset Action */}
          {(filterName || filterVoicePart || filterStatus) && (
            <button 
              onClick={handleResetFilters}
              className="h-10 self-end px-3 text-sm font-bold text-danger-text transition-colors hover:text-danger-text/80 active:opacity-70"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center shadow-xs">
          <p className="m-0 font-medium text-text-muted">Loading attendance data...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-danger-text/30 bg-danger-bg p-8 text-center shadow-xs">
          <p className="m-0 font-bold text-danger-text">{error}</p>
        </div>
      ) : selectedEventId ? (
        checkInItems.length === 0 && declinedSingers.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-border bg-surface/30 p-12 text-center shadow-xs">
            <span className="text-4xl">🔍</span>
            <h3 className="mt-4 mb-2 text-xl font-extrabold text-text">No Matching Singers</h3>
            <p className="mt-0 mb-6 max-w-sm text-sm font-medium text-text-muted">Try adjusting your search terms, voice parts, or attendance filters.</p>
            <button 
              onClick={handleResetFilters} 
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-deep active:scale-95"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-6">
            
            {/* Check-In List */}
            <div className="flex w-full flex-col gap-1">
              {checkInItems.length > 0 ? (
                <CheckInList
                  items={checkInItems}
                  onSetAttendance={handleSetAttendance}
                  onEdit={handleEditProfile}
                  sortBy={sortBy}
                  missCounts={missCounts}
                  maxRehearsalMisses={maxRehearsalMisses}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-surface/30 p-6 text-center shadow-xs">
                  <p className="m-0 text-sm font-medium text-text-muted">No singers match your RSVP filters.</p>
                </div>
              )}
            </div>

            {/* 3. Declined Singers Rescue Control */}
            {declinedSingers.length > 0 && (
              <div className="rounded-lg border border-danger-text/20 bg-danger-bg p-5 shadow-xs">
                <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-danger-text">Rescue Declined RSVP</h3>
                    <p className="m-0 text-xs font-medium text-warning-text/80">Did someone show up anyway? Change their RSVP and add them back to the active list instantly.</p>
                  </div>
                  
                  <div className="flex w-full min-w-[320px] flex-row items-center gap-3 md:w-auto">
                    <select
                      value={selectedDeclinedProfileId}
                      onChange={(e) => setSelectedDeclinedProfileId(e.target.value)}
                      className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm transition-colors focus:border-danger-text focus:ring-1 focus:ring-danger-text focus:outline-hidden md:w-64"
                    >
                      <option value="">-- Select Declined Singer --</option>
                      {declinedSingers.map(s => (
                        <option key={s.profileId} value={s.profileId}>{s.name} ({s.voicePart})</option>
                      ))}
                    </select>
                    <button
                      disabled={!selectedDeclinedProfileId}
                      onClick={() => handleRescueDeclined(selectedDeclinedProfileId)}
                      className="flex h-10 items-center gap-1.5 rounded-md border border-danger-text/30 bg-white px-4 text-xs font-bold text-danger-text shadow-sm transition-all enabled:hover:bg-danger-bg enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>+</span>
                      Add Back
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface/20 p-24 text-center shadow-xs">
          <span className="text-5xl opacity-40">📅</span>
          <p className="mt-6 text-lg font-semibold text-text-muted">Please select an event above to start check-in.</p>
        </div>
      )}

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
