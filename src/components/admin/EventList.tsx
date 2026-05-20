import React from 'react';
import type { Event } from '../../services/eventService';

interface EventListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onEmailReminder: (event: Event) => void;
  onTextReminder: (event: Event) => void;
  onViewRoster: (event: Event) => void;
  openAuditionEventId?: string;
  sendingEmailEventId?: string | null;
}
import { AppCard } from '../common/AppCard';

export const EventList: React.FC<EventListProps> = ({ 
  events, 
  onEdit, 
  onEmailReminder, 
  onTextReminder, 
  onViewRoster, 
  openAuditionEventId,
  sendingEmailEventId
}) => {
  return (
    <AppCard noPadding style={{ gap: 0 }}>
      {events.map((e) => (
        <div 
          key={e.id} 
          className="flex-responsive relative-row clickable-row" 
          onClick={() => onEdit(e)}
          style={{ 
            padding: 'var(--space-md) var(--space-lg)', 
            borderBottom: '1px solid var(--border)', 
            justifyContent: 'space-between', 
            width: '100%',
            gap: 'var(--space-md)',
            cursor: 'pointer'
          }}
        >
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
              <span className={`badge ${e.type === 'Performance' ? 'badge-performance' : 'badge-rehearsal'}`}>
                {e.type}
              </span>
              {openAuditionEventId === e.id && (
                <span className="badge badge-success" style={{ fontWeight: 'bold' }}>
                  🎵 Auditions Open
                </span>
              )}
              <span className="text-label" style={{ color: 'var(--primary)' }}>
                {new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {e.title && <div className="text-headline">{e.title}</div>}
            <div className="text-label">
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.expand?.venue?.address || e.expand?.venue?.name || '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                📍 <strong>{e.expand?.venue?.name || ''}</strong>
              </a>
            </div>
            {e.details && <div className="text-muted text-xs">{e.details}</div>}
          </div>
          <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onViewRoster(e);
              }}
              className="btn btn-ghost btn-sm"
            >
              RSVP List
            </button>
            <button 
              onClick={(event) => {
                event.stopPropagation();
                onEmailReminder(e);
              }}
              disabled={sendingEmailEventId === e.id}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {sendingEmailEventId === e.id ? (
                <>
                  <span className="spinner-small" style={{ margin: 0, width: '12px', height: '12px' }} />
                  <span>Sending...</span>
                </>
              ) : (
                'Email Reminder'
              )}
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onTextReminder(e);
              }}
              className="btn btn-secondary btn-sm"
            >
              Text Reminder
            </button>
            <button 
              onClick={(event) => {
                event.stopPropagation();
                onEdit(e);
              }}
              className="btn btn-ghost btn-sm"
            >
              Edit
            </button>
          </div>
        </div>
      ))}
      {events.length === 0 && (
        <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
          <p className="text-muted text-sm">No events scheduled.</p>
        </div>
      )}
    </AppCard>
  );
};
