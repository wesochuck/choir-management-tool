import { useState, useMemo, useEffect, useRef } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance } from '../../hooks/useAttendance';
import { useProfiles } from '../../hooks/useProfiles';
import { CheckInList } from '../../components/admin/CheckInList';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { SingerModal } from '../../components/admin/SingerModal';
import type { Profile, ProfileInput } from '../../services/profileService';
import { settingsService } from '../../services/settingsService';
import { findNearestEvent } from '../../lib/eventUtils';

export default function AttendanceView() {
  const dialog = useDialog();
  const { events } = useEvents();
  const { profiles, editProfile } = useProfiles();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const hasDefaultedRef = useRef(false);
  
  // Filter States
  const [filterName, setFilterName] = useState('');
  const [filterVoicePart, setFilterVoicePart] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'lastName' | 'voicePart'>('lastName');

  useEffect(() => {
    settingsService.getAttendanceSettings()
      .then((settings) => {
        setSortBy(settings.defaultSort);
      })
      .catch((err) => {
        console.error('Failed to load attendance settings', err);
      });
  }, []);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId && !hasDefaultedRef.current) {
      const nearest = findNearestEvent(events);
      if (nearest) {
        setSelectedEventId(nearest.id);
        hasDefaultedRef.current = true;
      }
    }
  }, [events, selectedEventId]);

  const { items, isLoading, error, setAttendance, setAllAttendance, updateFolder, refresh } = useAttendance(selectedEventId);

  const selectedEvent = useMemo(() => 
    events.find(e => e.id === selectedEventId), 
    [events, selectedEventId]
  );

  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
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

  const handleResetFilters = () => {
    setFilterName('');
    setFilterVoicePart('');
    setFilterStatus('');
  };

  const handleSetAttendance = async (profileId: string, next: 'Present' | 'Absent' | 'Pending') => {
    try {
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
    <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-md)' }}>
        <h1 className="text-display" style={{ margin: 0, fontSize: '2.25rem' }}>Attendance Check-in</h1>
        
        <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center', minWidth: '320px' }}>
          <div className="flex-col" style={{ gap: '4px', flex: 1 }}>
            <label className="text-label" style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                handleResetFilters(); // Reset filters when changing active event
              }}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">-- Choose an Event --</option>
              {sortedEvents.map(e => (
                <option key={e.id} value={e.id}>{new Date(e.date).toLocaleDateString()} - {e.title || e.expand?.venue?.name || ''} ({e.type})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div 
          className="card" 
          style={{ 
            padding: '12px 18px', 
            backgroundColor: 'var(--primary-light)', 
            border: '1px solid rgba(74, 117, 89, 0.2)',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div className="flex-col" style={{ gap: '2px' }}>
            <span className="text-muted text-xs" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Event</span>
            {selectedEvent.title && <h2 className="text-headline" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-deep)' }}>{selectedEvent.title}</h2>}
          </div>
          
          <div className="flex-row" style={{ gap: 'var(--space-lg)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`badge ${selectedEvent.type === 'Performance' ? 'badge-performance' : 'badge-rehearsal'}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
              {selectedEvent.type}
            </span>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.expand?.venue?.address || selectedEvent.expand?.venue?.name || '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-label"
              style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-deep)' }}
            >
              📍 {selectedEvent.expand?.venue?.name || ''}
            </a>
            <span className="text-muted text-sm" style={{ fontWeight: 500 }}>
              📅 {new Date(selectedEvent.date).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div
          className="flex-responsive"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: '4px 0'
          }}
        >
          {/* Left Side: Summary info */}
          <span 
            style={{ 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              color: 'var(--text-muted)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
          >
            👥 Roster: {items.length} singers
          </span>

          {/* Right Side: Bulk actions and Refresh */}
          <div className="flex-row" style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Refresh Button */}
            <button
              onClick={() => {
                refresh();
              }}
              className="btn btn-ghost btn-sm"
              title="Refresh Roster"
              style={{
                height: '34px',
                width: '34px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🔄
            </button>

            <span style={{ height: '20px', width: '1px', backgroundColor: 'var(--border)' }}></span>

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
              className="btn btn-sm"
              style={{
                height: '34px',
                padding: '0 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: 'rgba(74, 117, 89, 0.1)',
                color: 'var(--primary-deep)',
                border: '1px solid rgba(74, 117, 89, 0.25)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ✅ Mark All Present
            </button>

            {/* Bulk Absent */}
            <button
              onClick={async () => {
                const isFiltered = Boolean(filterName || filterVoicePart || filterStatus);
                const confirmed = await dialog.confirm({
                  title: 'Mark All Absent',
                  message: `Are you sure you want to mark all ${isFiltered ? `${filteredItems.length} filtered singers` : 'singers'} as Absent?`,
                  confirmLabel: 'Mark Absent',
                  variant: 'danger'
                });
                if (confirmed) {
                  try {
                    await setAllAttendance('Absent', isFiltered ? filteredItems.map(i => i.profileId) : undefined);
                  } catch (err: unknown) {
                    await dialog.showMessage({
                      title: 'Error updating attendance',
                      message: err instanceof Error ? err.message : 'Failed to bulk update',
                      variant: 'danger'
                    });
                  }
                }
              }}
              className="btn btn-sm"
              style={{
                height: '34px',
                padding: '0 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#b91c1c',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ❌ Mark All Absent
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
              className="btn btn-ghost btn-sm"
              style={{
                height: '34px',
                padding: '0 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                border: '1px dashed var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ⏳ Reset All
            </button>
          </div>
        </div>
      )}

      {selectedEventId && !isLoading && !error && (
        <div 
          className="card" 
          style={{ 
            padding: '16px 20px', 
            display: 'flex', 
            flexDirection: 'row', 
            gap: 'var(--space-md)', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            border: '1px solid var(--border)', 
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          {/* Name Search */}
          <div className="flex-col" style={{ flex: '1 1 200px', gap: '6px' }}>
            <label className="text-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Search by Name</label>
            <input 
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="🔍 Search name..."
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          {/* Voice Part Filter */}
          <div className="flex-col" style={{ width: '140px', gap: '6px' }}>
            <label className="text-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Voice Part</label>
            <select
              value={filterVoicePart}
              onChange={(e) => setFilterVoicePart(e.target.value)}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">All Parts</option>
              {['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'].map(part => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div className="flex-col" style={{ width: '160px', gap: '6px' }}>
            <label className="text-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Pending">Unmarked</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div className="flex-col" style={{ width: '180px', gap: '6px' }}>
            <label className="text-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'lastName' | 'voicePart')}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="lastName">Last Name</option>
              <option value="voicePart">Voice Part + Last Name</option>
            </select>
          </div>

          {/* Reset Action */}
          {(filterName || filterVoicePart || filterStatus) && (
            <button 
              onClick={handleResetFilters}
              className="btn btn-ghost"
              style={{ 
                height: '40px', 
                alignSelf: 'flex-end', 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                color: '#ef4444',
                padding: '0 8px'
              }}
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
        filteredItems.length === 0 ? (
          <AppCard style={{ textAlign: 'center', padding: '48px', border: '1px dashed var(--border)', backgroundColor: 'transparent', boxShadow: 'none' }}>
            <span style={{ fontSize: '2rem' }}>🔍</span>
            <h3 style={{ marginTop: '12px', marginBottom: '4px', fontWeight: 800, fontSize: '1.25rem' }}>No Matching Singers</h3>
            <p className="text-muted text-sm" style={{ marginTop: '0', marginBottom: '16px' }}>Try adjusting your search terms, voice parts, or attendance filters.</p>
            <button onClick={handleResetFilters} className="btn btn-primary btn-sm">Reset All Filters</button>
          </AppCard>
        ) : (
          <CheckInList
            items={filteredItems}
            onSetAttendance={handleSetAttendance}
            onUpdateFolder={handleUpdateFolder}
            onEdit={handleEditProfile}
            sortBy={sortBy}
          />
        )
      ) : (
        <AppCard style={{ textAlign: 'center', padding: '48px', border: '2px dashed var(--border)', backgroundColor: 'transparent', boxShadow: 'none' }}>
          <p className="text-muted" style={{ fontSize: '1rem', margin: 0 }}>Please select an event above to start check-in.</p>
        </AppCard>
      )}

      <SingerModal
        isOpen={Boolean(editingProfile)}
        onClose={() => setEditingProfile(null)}
        onSave={handleSaveProfile}
        initialData={editingProfile}
      />
    </div>
  );
}
