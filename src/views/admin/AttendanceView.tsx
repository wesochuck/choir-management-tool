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
import { useRateLimitRetryToast } from '../../hooks/useRateLimitRetryToast';
import './AttendanceView.css';

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
  const [defaultSort, setDefaultSort] = useState<'lastName' | 'voicePart' | 'section'>('lastName');
  const sortBy = user?.preferences?.attendanceSort || defaultSort;
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
    settingsService.getAttendanceSettings()
      .then((settings) => {
        setDefaultSort(settings.defaultSort);
      })
      .catch((err) => {
        console.error('Failed to load attendance settings', err);
      });

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

        const rostersLists = await Promise.all(
          pastRehearsals.map(reh => pb.collection('eventRosters').getFullList({
            filter: pb.filter('event = {:eventId}', { eventId: reh.id })
          }))
        );

        const counts: Record<string, number> = {};

        performingProfileIds.forEach(profileId => {
          let missCount = 0;
          pastRehearsals.forEach((_, index) => {
            const rosters = rostersLists[index];
            const r = rosters.find(x => x.profile === profileId);

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
    <div className="flex-col attendance-page">
      <div className="flex-responsive attendance-header">
        <h1 className="text-display attendance-title">Attendance Check-in</h1>
        
        <div className="flex-row attendance-event-selector-wrap">
          <div className="flex-col attendance-event-selector-inner">
            <label className="text-label attendance-event-selector-label">Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                handleResetFilters(); // Reset filters when changing active event
              }}
              className="card attendance-event-select"
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
        <div className={`card attendance-active-event-card ${isEventExpanded ? 'is-expanded' : 'is-collapsed'}`}>
          <div className="attendance-active-event-header" onClick={() => setIsEventExpanded(!isEventExpanded)}>
            <div className="flex-col attendance-active-event-main">
              <span className="text-muted text-xs attendance-active-event-label">Active Event</span>
              <div className="flex-row attendance-active-event-title-row" style={{ alignItems: 'center', gap: '8px' }}>
                {selectedEvent.title && <h2 className="text-headline attendance-active-event-title">{selectedEvent.title}</h2>}
                <span className={`badge ${selectedEvent.type === 'Performance' ? 'badge-performance' : 'badge-rehearsal'}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
                  {selectedEvent.type}
                </span>
              </div>
            </div>
            
            <button 
              type="button" 
              className="btn btn-ghost btn-sm attendance-event-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsEventExpanded(!isEventExpanded);
              }}
              aria-expanded={isEventExpanded}
            >
              {isEventExpanded ? '▲ Hide' : '▼ Details'}
            </button>
          </div>
          
          <div className="attendance-active-event-details">
            <span className={`badge badge-desktop ${selectedEvent.type === 'Performance' ? 'badge-performance' : 'badge-rehearsal'}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
              {selectedEvent.type}
            </span>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.expand?.venue?.address || selectedEvent.expand?.venue?.name || '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-label attendance-active-event-venue"
              onClick={(e) => e.stopPropagation()}
              style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-deep)' }}
            >
              📍 {selectedEvent.expand?.venue?.name || ''}
            </a>
            <span className="text-muted text-sm attendance-active-event-date" style={{ fontWeight: 500 }}>
              📅 {formatInTimezone(selectedEvent.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div className="flex-responsive attendance-toolbar">
          {/* Left Side: Summary info */}
          <span className="attendance-roster-summary">
            👥 Roster: {attendanceCounts.total} singers
          </span>

          <div className="attendance-toolbar-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm attendance-mobile-actions-toggle"
              onClick={() => setIsMobileActionsOpen((previous) => !previous)}
              aria-expanded={isMobileActionsOpen}
              aria-controls="attendance-mobile-actions"
            >
              {isMobileActionsOpen ? '⚡ Hide Bulk Actions  ▲' : '⚡ Bulk Actions  ▼'}
            </button>

            <div
              className={`flex-row attendance-bulk-actions ${isMobileActionsOpen ? 'is-open' : ''}`}
              id="attendance-mobile-actions"
            >
            {/* Refresh Button */}
            <button
              onClick={() => {
                refresh();
              }}
              className="btn btn-ghost btn-sm attendance-refresh-btn"
              title="Refresh Roster"
              aria-label="Refresh roster"
            >
              🔄
            </button>

            <span className="attendance-actions-divider"></span>

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
              className="btn btn-sm attendance-bulk-present-btn"
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
              className="btn btn-sm attendance-bulk-remaining-absent-btn"
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
              className="btn btn-ghost btn-sm attendance-bulk-reset-btn"
            >
              ⏳ Reset All
            </button>
            </div>
          </div>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div className="attendance-mobile-progress" aria-label="Attendance progress">
          <span className="attendance-mobile-progress-chip">Present {attendanceCounts.present}</span>
          <span className="attendance-mobile-progress-chip">Absent {attendanceCounts.absent}</span>
          <span className="attendance-mobile-progress-chip">Unmarked {attendanceCounts.unmarked}</span>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div className="card attendance-filter-card">
          {/* Name Search */}
          <div className="flex-col attendance-search-control">
            <label className="text-label attendance-filter-label">Search by Name</label>
            <input 
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="🔍 Search name..."
              className="card attendance-filter-input"
            />
          </div>

          {/* Voice Part Filter */}
          <div className="flex-col attendance-filter-control">
            <label className="text-label attendance-filter-label">Voice Part</label>
            <select
              value={filterVoicePart}
              onChange={(e) => setFilterVoicePart(e.target.value)}
              className="card attendance-filter-input"
            >
              <option value="">All Parts</option>
              {voicePartLabels.map(part => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div className="flex-col attendance-filter-control">
            <label className="text-label attendance-filter-label">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="card attendance-filter-input"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Pending">Unmarked</option>
            </select>
          </div>

          {/* RSVP Status Filter */}
          <div className="flex-col attendance-filter-control">
            <label className="text-label attendance-filter-label">RSVP Status</label>
            <select
              value={rsvpFilter}
              onChange={(e) => handleRsvpFilterChange(e.target.value as 'Yes' | 'Pending' | 'Both')}
              className="card attendance-filter-input"
            >
              <option value="Both">Both (Attending + Pending)</option>
              <option value="Yes">Attending Only</option>
              <option value="Pending">Pending Only</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div className="flex-col attendance-filter-control">
            <label className="text-label attendance-filter-label">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'lastName' | 'voicePart' | 'section')}
              className="card attendance-filter-input"
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
              className="btn btn-ghost attendance-filter-reset-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <AppCard style={{ textAlign: 'center', padding: '32px' }}>
          <p className="text-muted">Loading attendance data...</p>
        </AppCard>
      ) : error ? (
        <AppCard style={{ textAlign: 'center', border: '1px solid var(--color-danger-text)', padding: '24px' }}>
          <p style={{ color: 'var(--color-danger-text)', fontWeight: 600 }}>{error}</p>
        </AppCard>
      ) : selectedEventId ? (
        checkInItems.length === 0 && declinedSingers.length === 0 ? (
          <AppCard style={{ textAlign: 'center', padding: '48px', border: '1px dashed var(--border)', backgroundColor: 'transparent', boxShadow: 'none' }}>
            <span style={{ fontSize: '2rem' }}>🔍</span>
            <h3 style={{ marginTop: '12px', marginBottom: '4px', fontWeight: 800, fontSize: '1.25rem' }}>No Matching Singers</h3>
            <p className="text-muted text-sm" style={{ marginTop: '0', marginBottom: '16px' }}>Try adjusting your search terms, voice parts, or attendance filters.</p>
            <button onClick={handleResetFilters} className="btn btn-primary btn-sm">Reset All Filters</button>
          </AppCard>
        ) : (
          <div className="flex-col" style={{ gap: 'var(--space-md)', width: '100%' }}>
            
            {/* Check-In List */}
            <div className="flex-col" style={{ gap: 'var(--space-xs)', width: '100%' }}>
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
                <AppCard style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', backgroundColor: 'transparent', boxShadow: 'none' }}>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>No singers match your RSVP filters.</p>
                </AppCard>
              )}
            </div>

            {/* 3. Declined Singers Rescue Control */}
            {declinedSingers.length > 0 && (
              <div 
                className="card" 
                style={{ 
                  marginTop: 'var(--space-md)', 
                  padding: '16px 20px', 
                  border: '1px dashed var(--border)', 
                  backgroundColor: 'rgba(239, 68, 68, 0.02)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div className="flex-col" style={{ gap: '2px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#991b1b' }}>Rescue Declined RSVP</h3>
                    <p className="text-muted text-xs" style={{ margin: 0 }}>Did someone show up anyway? Change their RSVP and add them back to the active list instantly.</p>
                  </div>
                  
                  <div className="flex-row" style={{ gap: '10px', alignItems: 'center', minWidth: '280px', flexWrap: 'wrap' }}>
                    <select
                      value={selectedDeclinedProfileId}
                      onChange={(e) => setSelectedDeclinedProfileId(e.target.value)}
                      className="card"
                      style={{ flex: 1, padding: '0 12px', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}
                    >
                      <option value="">-- Select Declined Singer --</option>
                      {declinedSingers.map(s => (
                        <option key={s.profileId} value={s.profileId}>{s.name} ({s.voicePart})</option>
                      ))}
                    </select>
                    <button
                      disabled={!selectedDeclinedProfileId}
                      onClick={() => handleRescueDeclined(selectedDeclinedProfileId)}
                      className="btn btn-secondary btn-sm"
                      style={{ 
                        height: '36px', 
                        backgroundColor: '#fee2e2', 
                        color: '#991b1b', 
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontWeight: 700 
                      }}
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
        <AppCard style={{ textAlign: 'center', padding: '48px', border: '2px dashed var(--border)', backgroundColor: 'transparent', boxShadow: 'none' }}>
          <p className="text-muted" style={{ fontSize: '1rem', margin: 0 }}>Please select an event above to start check-in.</p>
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
