import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { AppCard } from '../../components/common/AppCard';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import EventRosterView from './EventRosterView';

export default function RsvpDashboardView() {
  const [searchParams] = useSearchParams();
  const { timezone } = useChoirSettings();
  const { events, isLoading, error } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState('');
  const hasDefaultedRef = useRef(false);

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

  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  );

  const selectedEvent = useMemo(() => 
    events.find(e => e.id === selectedEventId), 
    [events, selectedEventId]
  );

  return (
    <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-md)' }}>
        <h1 className="text-display" style={{ margin: 0, fontSize: '2.25rem' }}>Event RSVPs</h1>
        
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
                <option key={e.id} value={e.id}>{formatInTimezone(e.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {e.title || e.expand?.venue?.name || ''} ({e.type})</option>
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
              📅 {formatInTimezone(selectedEvent.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <AppCard style={{ textAlign: 'center', padding: '32px' }}>
          <p className="text-muted">Loading events...</p>
        </AppCard>
      ) : error ? (
        <AppCard style={{ textAlign: 'center', border: '1px solid var(--color-danger-text)', padding: '24px' }}>
          <p style={{ color: 'var(--color-danger-text)', fontWeight: 600 }}>{error}</p>
        </AppCard>
      ) : selectedEventId ? (
        <EventRosterView eventIdProp={selectedEventId} />
      ) : (
        <AppCard style={{ textAlign: 'center', padding: '48px', border: '2px dashed var(--border)', backgroundColor: 'transparent', boxShadow: 'none' }}>
          <p className="text-muted" style={{ fontSize: '1rem', margin: 0 }}>Please select an event above to view and manage RSVPs.</p>
        </AppCard>
      )}
    </div>
  );
}
