import React from 'react';
import type { Event } from '../../services/eventService';

interface EventListProps {
  events: Event[];
  onEdit: (event: Event) => void;
}

export const EventList: React.FC<EventListProps> = ({ events, onEdit }) => {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      {events.map((e) => (
        <div key={e.id} style={{ 
          padding: '16px', 
          borderBottom: '1px solid #f0f4f8', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 'bold', 
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: e.type === 'Performance' ? '#fed7d7' : '#ebf8ff',
                color: e.type === 'Performance' ? '#9b2c2c' : '#2c5282'
              }}>
                {e.type}
              </span>
              <span style={{ fontWeight: '600' }}>{new Date(e.date).toLocaleDateString()}</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '14px', color: '#4a5568' }}>
              <strong>{e.location}</strong>
            </div>
            {e.details && <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>{e.details}</div>}
          </div>
          <button 
            onClick={() => onEdit(e)}
            style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #cbd5e0' }}
          >
            Edit
          </button>
        </div>
      ))}
      {events.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>No events scheduled.</div>
      )}
    </div>
  );
};
