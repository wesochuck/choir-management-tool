import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance } from '../../hooks/useAttendance';
import { useProfiles } from '../../hooks/useProfiles';
import { CheckInList } from '../../components/admin/CheckInList';
import { AppCard } from '../../components/common/AppCard';
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

  const { items, isLoading, error, setAttendance, setRSVP, setAllAttendance, updateFolder, refresh } = useAttendance(selectedEventId, {
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

  const handleUpdateFolder = async (profileId: string, folderNumber: string, folderReturned: boolean) => {
    try {
      await updateFolder(profileId, folderNumber, folderReturned);
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Update Folder',
        message: err instanceof Error ? err.message : 'Failed to update folder',
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
    <div className="flex-col gap-[var(--space-md)] p-[var(--space-md)_0]">
      <div className="flex flex-col md:flex-row justify-between items-center gap-[var(--space-md)] border-b border-[var(--border)] pb-[var(--space-md)]">
        <h1 className="text-display !m-0">Attendance Check-in</h1>
        
        <div className="flex-row gap-[var(--space-md)] items-center min-w-[320px]">
          <div className="flex-col gap-1 flex-1">
            <label className="text-label font-bold text-[0.75rem] uppercase text-[var(--text-muted)]">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                handleResetFilters(); // Reset filters when changing active event
              }}
              className="card w-full px-3 h-10 border border-[var(--border)] rounded-[var(--radius-md)]"
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
        <div className="p-[14px_20px] bg-[var(--primary-light)] border border-[rgb(74_117_89_/_20%)] flex flex-col gap-[var(--space-sm)] rounded-[var(--radius-md)] transition-all duration-200">
          <div className="flex flex-row justify-between items-center w-full cursor-pointer" onClick={() => setIsEventExpanded(!isEventExpanded)}>
            <div className="flex-col gap-[2px]">
              <span className="text-muted text-xs font-semibold uppercase tracking-[0.05em]">Active Event</span>
              <div className="flex-row items-center gap-2">
                {selectedEvent.title && <h2 className="text-headline !m-0 text-[1.4rem] font-extrabold text-[var(--primary-deep)]">{selectedEvent.title}</h2>}
                <span className={`inline-flex items-center text-[0.625rem] px-[8px] py-[3px] rounded font-semibold uppercase tracking-wider ${selectedEvent.type === 'Performance' ? 'bg-performance-bg text-performance-text' : 'bg-primary-light text-primary-deep'}`}>
                  {selectedEvent.type}
                </span>
              </div>
            </div>
            
            <button 
              type="button" 
              className="btn btn-ghost btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsEventExpanded(!isEventExpanded);
              }}
              aria-expanded={isEventExpanded}
            >
              {isEventExpanded ? '▲ Hide' : '▼ Details'}
            </button>
          </div>
          
          <div className="flex flex-row flex-wrap gap-6 items-center">
            <span className={`inline-flex items-center text-[0.625rem] px-[8px] py-[3px] rounded font-semibold uppercase tracking-wider bg-primary-light text-primary-deep ${selectedEvent.type === 'Performance' ? 'bg-performance-bg text-performance-text' : 'bg-primary-light text-primary-deep'}`}>
              {selectedEvent.type}
            </span>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.expand?.venue?.address || selectedEvent.expand?.venue?.name || '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-label font-semibold text-[0.85rem] text-[var(--primary-deep)] flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              📍 {selectedEvent.expand?.venue?.name || ''}
            </a>
            <span className="text-muted text-sm font-medium">
              📅 {formatInTimezone(selectedEvent.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-[var(--space-md)] py-1">
          {/* Left Side: Summary info */}
          <span className="text-[0.85rem] font-bold text-[var(--text-muted)] flex items-center gap-[6px]">
            👥 Roster: {attendanceCounts.total} singers
          </span>

          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setIsMobileActionsOpen((previous) => !previous)}
              aria-expanded={isMobileActionsOpen}
              aria-controls="attendance-mobile-actions"
            >
              {isMobileActionsOpen ? '⚡ Hide Bulk Actions  ▲' : '⚡ Bulk Actions  ▼'}
            </button>

            <div
              className={`flex-row gap-[10px] items-center flex-wrap ${isMobileActionsOpen ? 'is-open' : ''}`}
              id="attendance-mobile-actions"
            >
            {/* Refresh Button */}
            <button
              onClick={() => {
                refresh();
              }}
              className="btn btn-ghost btn-sm !h-[34px] !w-[34px] !p-0 flex items-center justify-center rounded-[8px] border border-[var(--border)]"
              title="Refresh Roster"
              aria-label="Refresh roster"
            >
              🔄
            </button>

            <span className="h-5 w-px bg-[var(--border)]"></span>

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
              className="btn btn-sm !h-[34px] px-3 text-[0.75rem] font-bold rounded-[8px] bg-[rgb(74_117_89_/_10%)] text-[var(--primary-deep)] border border-[rgb(74_117_89_/_25%)]"
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
              className="btn btn-sm !h-[34px] px-3 text-[0.75rem] font-bold rounded-[8px] bg-[rgb(251_191_36_/_14%)] text-[#92400e] border border-[rgb(217_119_6_/_30%)] disabled:opacity-55 disabled:cursor-not-allowed"
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
              className="btn btn-ghost btn-sm !h-[34px] px-3 text-[0.75rem] font-bold rounded-[8px] text-[var(--text-muted)] border border-dashed border-[var(--border)]"
            >
              ⏳ Reset All
            </button>
            </div>
          </div>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div className="flex flex-wrap gap-2" aria-label="Attendance progress">
          <span className="inline-flex border border-border rounded-full text-xs font-bold px-2.5 py-1 bg-surface text-text-muted">Present {attendanceCounts.present}</span>
          <span className="inline-flex border border-border rounded-full text-xs font-bold px-2.5 py-1 bg-surface text-text-muted">Absent {attendanceCounts.absent}</span>
          <span className="inline-flex border border-border rounded-full text-xs font-bold px-2.5 py-1 bg-surface text-text-muted">Unmarked {attendanceCounts.unmarked}</span>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div className="card p-4 flex flex-row flex-wrap gap-4 items-center border border-border bg-surface rounded-md">
          {/* Name Search */}
          <div className="flex flex-col flex-[1_1_200px] gap-1.5">
            <label className="text-label font-bold text-xs uppercase text-text-muted">Search by Name</label>
            <input 
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="🔍 Search name..."
              className="card w-full px-3 h-10 border border-border rounded-md"
            />
          </div>

          {/* Voice Part Filter */}
          <div className="flex flex-col w-[160px] gap-1.5">
            <label className="text-label font-bold text-xs uppercase text-text-muted">Voice Part</label>
            <select
              value={filterVoicePart}
              onChange={(e) => setFilterVoicePart(e.target.value)}
              className="card w-full px-3 h-10 border border-border rounded-md"
            >
              <option value="">All Parts</option>
              {voicePartLabels.map(part => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div className="flex flex-col w-[160px] gap-1.5">
            <label className="text-label font-bold text-xs uppercase text-text-muted">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="card w-full px-3 h-10 border border-border rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Pending">Unmarked</option>
            </select>
          </div>

          {/* RSVP Status Filter */}
          <div className="flex flex-col w-[160px] gap-1.5">
            <label className="text-label font-bold text-xs uppercase text-text-muted">RSVP Status</label>
            <select
              value={rsvpFilter}
              onChange={(e) => handleRsvpFilterChange(e.target.value as 'Yes' | 'Pending' | 'Both')}
              className="card w-full px-3 h-10 border border-border rounded-md"
            >
              <option value="Both">Both (Attending + Pending)</option>
              <option value="Yes">Attending Only</option>
              <option value="Pending">Pending Only</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div className="flex flex-col w-[160px] gap-1.5">
            <label className="text-label font-bold text-xs uppercase text-text-muted">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'lastName' | 'voicePart' | 'section')}
              className="card w-full px-3 h-10 border border-border rounded-md"
            >
              <option value="lastName">Last Name</option>
              <option value="voicePart">Voice Part + Last Name</option>
              <option value="section">Section + Last Name</option>
            </select>
          </div>

          {/* Reset Action */}
          {(filterName || filterVoicePart || filterStatus) && (
            <button 
              onClick={handleResetFilters}
              className="btn btn-ghost !h-10 self-end text-[0.85rem] font-bold text-[#ef4444] px-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <AppCard className="text-center p-[var(--space-xl)]">
          <p className="text-muted">Loading attendance data...</p>
        </AppCard>
      ) : error ? (
        <AppCard className="p-[var(--space-xl)] border-[var(--color-danger-text)] bg-[var(--color-danger-bg)]">
          <p className="text-strong text-[var(--color-danger-text)]">{error}</p>
        </AppCard>
      ) : selectedEventId ? (
        checkInItems.length === 0 && declinedSingers.length === 0 ? (
          <AppCard className="flex flex-col items-center text-center p-[var(--space-xl)_var(--space-md)] border border-dashed border-[var(--border)] bg-transparent rounded-[var(--radius-md)]">
            <span className="text-[2rem]">🔍</span>
            <h3 className="mt-3 mb-1 font-extrabold text-[1.25rem] text-[var(--text)]">No Matching Singers</h3>
            <p className="text-muted text-sm mt-0 mb-[var(--space-md)]">Try adjusting your search terms, voice parts, or attendance filters.</p>
            <button onClick={handleResetFilters} className="btn btn-primary btn-sm">Reset All Filters</button>
          </AppCard>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            
            {/* Check-In List */}
            <div className="flex flex-col gap-1 w-full">
              {checkInItems.length > 0 ? (
                <CheckInList
                  items={checkInItems}
                  onSetAttendance={handleSetAttendance}
                  onUpdateFolder={handleUpdateFolder}
                  onEdit={handleEditProfile}
                  sortBy={sortBy}
                  missCounts={missCounts}
                  maxRehearsalMisses={maxRehearsalMisses}
                />
              ) : (
                <AppCard className="text-center p-[var(--space-md)] border border-dashed border-[var(--border)] bg-transparent shadow-none">
                  <p className="text-muted text-sm !m-0">No singers match your RSVP filters.</p>
                </AppCard>
              )}
            </div>

            {/* 3. Declined Singers Rescue Control */}
            {declinedSingers.length > 0 && (
              <div className="card p-4 border border-[#fecaca] rounded-md bg-[#fef2f2]">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-[0.85rem] font-bold text-[#991b1b]">Rescue Declined RSVP</h3>
                    <p className="text-muted text-xs text-[#92400e]">Did someone show up anyway? Change their RSVP and add them back to the active list instantly.</p>
                  </div>
                  
                  <div className="flex flex-row gap-2.5 items-center min-w-[280px] flex-wrap">
                    <select
                      value={selectedDeclinedProfileId}
                      onChange={(e) => setSelectedDeclinedProfileId(e.target.value)}
                      className="card flex-1 h-9 px-3 border border-border rounded-md bg-bg text-text text-[0.85rem]"
                    >
                      <option value="">-- Select Declined Singer --</option>
                      {declinedSingers.map(s => (
                        <option key={s.profileId} value={s.profileId}>{s.name} ({s.voicePart})</option>
                      ))}
                    </select>
                    <button
                      disabled={!selectedDeclinedProfileId}
                      onClick={() => handleRescueDeclined(selectedDeclinedProfileId)}
                      className="btn btn-secondary btn-sm !h-9 bg-[#fee2e2] text-[#991b1b] border border-[rgb(239_68_68_/_20%)] font-bold"
                    >
                      + Add Back
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )
      ) : (
        <AppCard className="text-center p-12 border-2 border-dashed border-[var(--border)] bg-transparent shadow-none">
          <p className="text-muted text-base !m-0">Please select an event above to start check-in.</p>
        </AppCard>
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
