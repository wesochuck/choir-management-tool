import React from 'react';
import type { Event } from '../../services/eventService';
import { calendarUtils } from '../../lib/calendar';

interface EventCardProps {
  event: Event;
  rsvp?: 'Yes' | 'No' | 'Pending';
  onRSVP: (rsvp: 'Yes' | 'No') => Promise<void>;
}

export const EventCard: React.FC<EventCardProps> = ({ event, rsvp = 'Pending', onRSVP }) => {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '20px', 
      borderRadius: '12px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
         <span style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: event.type === 'Performance' ? '#fed7d7' : '#ebf8ff',
            color: event.type === 'Performance' ? '#9b2c2c' : '#2c5282'
          }}>
            {event.type}
          </span>
          <button 
            onClick={() => calendarUtils.generateICS(event)}
            style={{ fontSize: '12px', background: 'none', border: 'none', color: '#3182ce', cursor: 'pointer' }}
          >
            📅 Add to Calendar
          </button>
      </div>

      <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</h3>
      {event.title && <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2d3748', margin: '8px 0' }}>{event.title}</div>}
      <div style={{ color: '#4a5568', fontWeight: '500', marginBottom: '4px' }}>
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#3182ce', textDecoration: 'none' }}
        >
          📍 {event.location}
        </a>
      </div>
      {event.details && <div style={{ fontSize: '14px', color: '#718096', marginBottom: '16px' }}>{event.details}</div>}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => onRSVP('Yes')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '8px', 
            border: '2px solid #48bb78',
            backgroundColor: rsvp === 'Yes' ? '#48bb78' : 'white',
            color: rsvp === 'Yes' ? 'white' : '#2f855a',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {rsvp === 'Yes' ? '✓ Attending' : 'Attend'}
        </button>
        <button 
          onClick={() => onRSVP('No')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '8px', 
            border: '2px solid #e53e3e',
            backgroundColor: rsvp === 'No' ? '#e53e3e' : 'white',
            color: rsvp === 'No' ? 'white' : '#c53030',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {rsvp === 'No' ? '✗ Declining' : 'Decline'}
        </button>
      </div>
    </div>
  );
};
