import { useState, useMemo } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance } from '../../hooks/useAttendance';
import { useProfiles } from '../../hooks/useProfiles';
import { CheckInList } from '../../components/admin/CheckInList';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { SingerModal } from '../../components/admin/SingerModal';
import type { Profile, ProfileInput } from '../../services/profileService';

export default function AttendanceView() {
  const dialog = useDialog();
  const { events } = useEvents();
  const { profiles, editProfile } = useProfiles();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  
  const { items, isLoading, error, setAttendance, updateFolder } = useAttendance(selectedEventId);

  const selectedEvent = useMemo(() => 
    events.find(e => e.id === selectedEventId), 
    [events, selectedEventId]
  );

  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const handleUpdateFolder = async (profileId: string, folderNumber: string, folderReturned: boolean) => {
    try {
      await updateFolder(profileId, folderNumber, folderReturned);
    } catch (err: any) {
      await dialog.showMessage({
        title: 'Could Not Update Folder',
        message: err.message || 'Failed to update folder',
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
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <h1 className="text-display" style={{ marginBottom: 'var(--space-lg)' }}>Attendance Check-in</h1>
      
      <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
        <label className="text-label">Select Event</label>
        <select 
          value={selectedEventId} 
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="card"
          style={{ width: '100%', padding: '0 12px', height: '48px', border: '1px solid var(--border)' }}
        >
          <option value="">-- Choose an Event --</option>
          {sortedEvents.map(e => (
            <option key={e.id} value={e.id}>{new Date(e.date).toLocaleDateString()} - {e.title || e.location} ({e.type})</option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
          {selectedEvent.title && <h2 className="text-headline" style={{ margin: 0 }}>{selectedEvent.title}</h2>}
          <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
            <span className={`badge ${selectedEvent.type === 'Performance' ? 'badge-performance' : 'badge-rehearsal'}`}>
              {selectedEvent.type}
            </span>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-label"
              style={{ fontWeight: 600 }}
            >
              📍 {selectedEvent.location}
            </a>
          </div>
          <p className="text-muted text-sm">{new Date(selectedEvent.date).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        </div>
      )}

      {isLoading ? (
        <AppCard style={{ textAlign: 'center' }}>
          <p className="text-muted">Loading attendance data...</p>
        </AppCard>
      ) : error ? (
        <AppCard style={{ textAlign: 'center', border: '1px solid var(--color-danger-text)' }}>
          <p style={{ color: 'var(--color-danger-text)' }}>{error}</p>
        </AppCard>
      ) : selectedEventId ? (
        <CheckInList
          items={items}
          onSetAttendance={setAttendance}
          onUpdateFolder={handleUpdateFolder}
          onEdit={handleEditProfile}
        />
      ) : (
        <AppCard style={{ textAlign: 'center' }}>
          <p className="text-muted">Please select an event above to start check-in.</p>
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
