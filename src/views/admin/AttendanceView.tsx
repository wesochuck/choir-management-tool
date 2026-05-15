import { useState } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance } from '../../hooks/useAttendance';
import { CheckInList } from '../../components/admin/CheckInList';

export default function AttendanceView() {
  const { events } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState('');
  const { rosters, isLoading, error, toggleAttendance } = useAttendance(selectedEventId);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      <h1>Attendance Check-in</h1>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Event</label>
        <select 
          value={selectedEventId} 
          onChange={(e) => setSelectedEventId(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '16px' }}
        >
          <option value="">-- Choose an Event --</option>
          {events.map(e => (
            <option key={e.id} value={e.id}>{new Date(e.date).toLocaleDateString()} - {e.title || e.location} ({e.type})</option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <div style={{ marginBottom: '20px' }}>
          {selectedEvent.title && <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>{selectedEvent.title}</h1>}
          <h2 style={{ fontSize: '18px', color: '#4a5568', marginBottom: '4px' }}>
            {selectedEvent.type} at {' '}
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#3182ce', textDecoration: 'none' }}
            >
              📍 {selectedEvent.location}
            </a>
          </h2>
          <p style={{ color: '#718096' }}>{new Date(selectedEvent.date).toLocaleString()}</p>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '20px' }}>Loading...</div>
      ) : error ? (
        <div style={{ padding: '20px', color: 'red' }}>{error}</div>
      ) : selectedEventId ? (
        <CheckInList rosters={rosters} onToggle={toggleAttendance} />
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', color: '#718096' }}>
          Please select an event above to start check-in.
        </div>
      )}
    </div>
  );
}
