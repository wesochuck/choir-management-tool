import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Event } from '../../services/eventService';
import { calendarUtils } from '../../lib/calendar';
import { getSingerSetListPreview } from '../../lib/eventUtils';
import type { EventRoster } from '../../services/rosterService';
import { AppCard } from '../common/AppCard';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { formatTime12h } from '../../lib/dateUtils';
import './EventCard.css';

interface EventCardProps {
  event: Event;
  rsvp?: 'Yes' | 'No' | 'Pending';
  onRSVP: (rsvp: 'Yes' | 'No') => Promise<void>;
  allEvents?: Event[];
  myRosters?: Record<string, EventRoster>;
  maxRehearsalMisses?: number;
}

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  rsvp = 'Pending', 
  onRSVP,
  allEvents = [],
  myRosters = {},
  maxRehearsalMisses = 3
}) => {
  const { timezone } = useChoirSettings();
  const navigate = useNavigate();
  const [now, setNow] = React.useState(() => Date.now());
  const isPerformance = event.type === 'Performance';
  const isWindowClosed = isPerformance ? !event.isOpenForRSVP : (new Date(event.date).getTime() < now);
  const labels = isPerformance ? {
    yes: rsvp === 'Yes' ? '✓ Attending' : 'Attend',
    no: rsvp === 'No' ? '✗ Declining' : 'Decline'
  } : {
    yes: rsvp === 'Yes' ? '✓ Attending' : "I'll be there",
    no: rsvp === 'No' ? '✗ Absence Reported' : 'Report absence'
  };
  const [submittingStatus, setSubmittingStatus] = React.useState<'Yes' | 'No' | null>(null);
  const previewData = getSingerSetListPreview(event, myRosters, allEvents);

  const missStats = React.useMemo(() => {
    if (!isPerformance || rsvp !== 'Yes' || !allEvents || !myRosters) return null;
    const linkedRehearsals = allEvents.filter(e => e.type === 'Rehearsal' && e.parentPerformanceId === event.id);
    const nowMs = Date.now();
    const pastRehearsals = linkedRehearsals.filter(reh => new Date(reh.date).getTime() < nowMs);
    let missedCount = 0;
    
    pastRehearsals.forEach(reh => {
      const roster = myRosters[reh.id];
      
      const wasDeclined = roster?.rsvp === 'No';
      const wasAbsent = roster?.attendance === 'Absent';
      const notMarkedPresent = roster?.attendance !== 'Present';
      
      if (wasDeclined || wasAbsent || notMarkedPresent) {
        missedCount++;
      }
    });
    
    return {
      missed: missedCount,
      total: pastRehearsals.length
    };
  }, [isPerformance, rsvp, event.id, allEvents, myRosters]);

  React.useEffect(() => {
    setNow(Date.now());
  }, [event.id]);

  const handleOpenPlayer = () => {
    navigate(`/player?eventId=${previewData.playerId}`);
  };

  const handleRSVP = async (status: 'Yes' | 'No') => {
    setSubmittingStatus(status);
    try {
      await onRSVP(status);
    } finally {
      setSubmittingStatus(null);
    }
  };

  return (
    <AppCard noPadding>
      <div className="flex-col" style={{ padding: 'var(--space-lg)', gap: 'var(--space-md)' }}>
        <div className="event-card-top-row flex-row" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span className={`badge ${isPerformance ? 'badge-performance' : 'badge-rehearsal'}`}>
               {event.type}
             </span>
             <div className="flex-row" style={{ gap: 'var(--space-xs)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
               <button 
                 onClick={() => calendarUtils.generateICS(event)}
                 className="btn btn-ghost btn-sm"
               >
                 📅 Add
               </button>
               {previewData.visible && previewData.setList && previewData.setList.length > 0 && (
                 <button 
                   onClick={handleOpenPlayer}
                   className="btn btn-primary btn-sm"
                 >
                   🎧 Practice
                 </button>
               )}
               {isPerformance && (
                 <Link 
                   to={`/seating/${event.id}`}
                   className="btn btn-secondary btn-sm"
                 >
                   🪑 Seating
                 </Link>
               )}
             </div>
        </div>


        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <h3 className="text-label" style={{ margin: 0, color: 'var(--primary)' }}>
              {formatInTimezone(event.date, timezone)}
            </h3>
            {event.callTime && (
              <span className="badge" style={{
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                border: '1px solid #c7d2fe',
                fontWeight: 800,
                fontSize: '0.8rem',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(67, 56, 202, 0.05)'
              }}>
                📢 Call Time: {formatTime12h(event.callTime)}
              </span>
            )}
          </div>
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
          {missStats && (
            <div style={{
              marginTop: 'var(--space-xs)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: missStats.missed > maxRehearsalMisses ? '#fef2f2' : '#fffbeb',
              border: missStats.missed > maxRehearsalMisses ? '1px solid #fca5a5' : '1px solid #fde68a',
              color: missStats.missed > maxRehearsalMisses ? '#991b1b' : '#92400e',
              fontWeight: 600
            }}>
              <span>
                Rehearsal Attendance: {missStats.missed} missed of {missStats.total} rehearsals
              </span>
              <span className="badge" style={{
                backgroundColor: missStats.missed > maxRehearsalMisses ? '#ef4444' : '#f59e0b',
                color: 'white',
                fontWeight: 800,
                border: 'none',
                padding: '2px 6px',
                fontSize: '0.75rem'
              }}>
                {missStats.missed > maxRehearsalMisses ? 'EXCEEDED LIMIT' : `LIMIT: ${maxRehearsalMisses}`}
              </span>
            </div>
          )}
        </div>

        {previewData.visible && previewData.setList.length > 0 && (
          <div
            className="setlist-preview-box"
            style={{
              padding: 'var(--space-md)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              margin: 'var(--space-sm) 0',
              background: 'var(--surface)',
            }}
          >
            <h5 style={{ margin: '0 0 var(--space-xs) 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              📋 {previewData.label}
            </h5>

            <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
              {previewData.setList.map((item, idx) => {
                const rawItem = item as unknown as Record<string, unknown>;
                const itemTitle = (rawItem.title || rawItem.pieceTitle || 'Untitled Piece') as string;
                return (
                  <li key={item.id || `${itemTitle}-${idx}`} style={{ marginBottom: '4px' }}>
                    <strong>{itemTitle}</strong>
                    {item.composer && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {' '}— {item.composer}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="event-card-rsvp-actions flex-responsive" style={{ gap: 'var(--space-md)', width: '100%' }}>
          <button 
            onClick={() => handleRSVP('Yes')}
            className={`btn ${rsvp === 'Yes' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            disabled={isWindowClosed || submittingStatus !== null}
          >
            {submittingStatus === 'Yes' ? 'Processing...' : labels.yes}
          </button>
          <button 
            onClick={() => handleRSVP('No')}
            className={`btn ${rsvp === 'No' ? 'btn-danger' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            disabled={isWindowClosed || submittingStatus !== null}
          >
            {submittingStatus === 'No' ? 'Processing...' : labels.no}
          </button>
        </div>
        {isWindowClosed && (
          <div className="rsvp-closed-message text-center text-xs text-muted" style={{ marginTop: 'var(--space-xs)', textAlign: 'center', width: '100%' }}>
            {isPerformance 
              ? 'The RSVP window for this performance is closed. Contact choir admins if you need help changing your commitment.' 
              : 'This rehearsal has already passed.'}
          </div>
        )}
      </div>
    </AppCard>
  );
};
