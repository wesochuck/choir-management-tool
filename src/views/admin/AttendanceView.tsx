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
    <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-md)' }}>
        <h1 className="text-display" style={{ margin: 0, fontSize: '2.25rem' }}>Attendance Check-in</h1>
        
        <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center', minWidth: '320px' }}>
          <div className="flex-col" style={{ gap: '4px', flex: 1 }}>
            <label className="text-label" style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Select Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">-- Choose an Event --</option>
              {sortedEvents.map(e => (
                <option key={e.id} value={e.id}>{new Date(e.date).toLocaleDateString()} - {e.title || e.location} ({e.type})</option>
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
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-label"
              style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-deep)' }}
            >
              📍 {selectedEvent.location}
            </a>
            <span className="text-muted text-sm" style={{ fontWeight: 500 }}>
              📅 {new Date(selectedEvent.date).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
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
        <CheckInList
          items={items}
          onSetAttendance={setAttendance}
          onUpdateFolder={handleUpdateFolder}
          onEdit={handleEditProfile}
        />
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
