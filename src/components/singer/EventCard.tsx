import React from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../../services/eventService';
import { calendarUtils } from '../../lib/calendar';

interface EventCardProps {
  event: Event;
  rsvp?: 'Yes' | 'No' | 'Pending';
  onRSVP: (rsvp: 'Yes' | 'No') => Promise<void>;
}

import { AppCard } from '../common/AppCard';

export const EventCard: React.FC<EventCardProps> = ({ event, rsvp = 'Pending', onRSVP }) => {
  const isPerformance = event.type === 'Performance';

  return (
    <AppCard noPadding>
      <div className="flex-col" style={{ padding: 'var(--space-lg)', gap: 'var(--space-md)' }}>
        <div className="flex-row" style={{ justifyContent: 'space-between', width: '100%' }}>
           <span className={`badge ${isPerformance ? 'badge-performance' : 'badge-rehearsal'}`}>
              {event.type}
            </span>
            <button 
              onClick={() => calendarUtils.generateICS(event)}
              className="btn btn-ghost btn-sm"
            >
              📅 Add to Calendar
            </button>
        </div>

        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <h3 className="text-label" style={{ margin: 0, color: 'var(--primary)' }}>
            {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </h3>
          {event.title && <div className="text-headline">{event.title}</div>}
          <div className="text-label">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.expand?.venue?.address || event.expand?.venue?.name || '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              📍 {event.expand?.venue?.name || ''}
            </a>
          </div>
          {event.details && <p className="text-muted text-sm">{event.details}</p>}
        </div>

        <div className="flex-responsive" style={{ gap: 'var(--space-md)', width: '100%' }}>
          <button 
            onClick={() => onRSVP('Yes')}
            className={`btn ${rsvp === 'Yes' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
          >
            {rsvp === 'Yes' ? '✓ Attending' : 'Attend'}
          </button>
          <button 
            onClick={() => onRSVP('No')}
            className={`btn ${rsvp === 'No' ? 'btn-danger' : 'btn-ghost'}`}
            style={{ flex: 1 }}
          >
            {rsvp === 'No' ? '✗ Declining' : 'Decline'}
          </button>
        </div>

        {isPerformance && (
          <Link 
            to={`/seating/${event.id}`}
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            🪑 Find My Seat
          </Link>
        )}
      </div>
    </AppCard>
  );
};
