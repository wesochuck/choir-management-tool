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

  const isParentPerformanceDeclined = React.useMemo(() => {
    if (event.type !== 'Rehearsal' || !event.parentPerformanceId || !myRosters) return false;
    return myRosters[event.parentPerformanceId]?.rsvp === 'No';
  }, [event.type, event.parentPerformanceId, myRosters]);

  const missStats = React.useMemo(() => {
    if (!isPerformance || rsvp !== 'Yes' || !allEvents || !myRosters) return null;
    const linkedRehearsals = allEvents.filter(e => e.type === 'Rehearsal' && e.parentPerformanceId === event.id);
    const nowMs = now;
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
  }, [isPerformance, rsvp, event.id, allEvents, myRosters, now]);

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
      <div className="flex-col ec-card-content">
        <div className="event-card-top-row flex-row ec-top-row">
            <span className={`badge ${isPerformance ? 'badge-performance' : 'badge-rehearsal'}`}>
               {event.type}
             </span>
             <div className="flex-row ec-actions">
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
               {isPerformance && rsvp !== 'No' && (
                 <Link 
                   to={`/seating/${event.id}`}
                   className="btn btn-secondary btn-sm"
                 >
                   🪑 Seating
                 </Link>
               )}
             </div>
        </div>


        <div className="flex-col ec-info-wrapper">
          <div className="flex-row ec-date-call-row">
            <h3 className="text-label ec-date-text">
              {formatInTimezone(event.date, timezone)}
            </h3>
            {event.callTime && (
              <span className="badge ec-call-time-badge">
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
              className="ec-venue-link"
            >
              📍 {event.expand?.venue?.name || ''}
            </a>
          </div>
          {event.details && <p className="text-muted text-sm">{event.details}</p>}
          {missStats && (() => {
            const styles = (() => {
              if (missStats.missed > maxRehearsalMisses) {
                return {
                  containerBg: '#fef2f2',
                  containerBorder: '1px solid #fca5a5',
                  containerColor: '#991b1b',
                  badgeBg: '#ef4444',
                  badgeText: 'EXCEEDED LIMIT'
                };
              }
              if (missStats.missed > 0) {
                return {
                  containerBg: '#fffbeb',
                  containerBorder: '1px solid #fde68a',
                  containerColor: '#92400e',
                  badgeBg: '#f59e0b',
                  badgeText: `LIMIT: ${maxRehearsalMisses}`
                };
              }
              return {
                containerBg: '#f0fdf4',
                containerBorder: '1px solid #bbf7d0',
                containerColor: '#166534',
                badgeBg: '#22c55e',
                badgeText: `LIMIT: ${maxRehearsalMisses}`
              };
            })();

            return (
              <div 
                className="ec-miss-stats-container"
                // @allow-inline-style - Dynamic colors for attendance miss stats
                style={{
                  backgroundColor: styles.containerBg,
                  border: styles.containerBorder,
                  color: styles.containerColor,
                }}
              >
                <span>
                  Rehearsal Attendance: {missStats.missed} missed of {missStats.total} rehearsals
                </span>
                <span 
                  className="badge ec-miss-stats-badge"
                  // @allow-inline-style - Dynamic color for miss stats limit badge
                  style={{
                    backgroundColor: styles.badgeBg,
                  }}
                >
                  {styles.badgeText}
                </span>
              </div>
            );
          })()}
        </div>

        {previewData.visible && previewData.setList.length > 0 && (
          <div className="setlist-preview-box ec-setlist-preview-box">
            <h5 className="ec-setlist-label">
              📋 {previewData.label}
            </h5>

            <ol className="ec-setlist-list">
              {previewData.setList.map((item, idx) => {
                const rawItem = item as unknown as Record<string, unknown>;
                const itemTitle = (rawItem.title || rawItem.pieceTitle || 'Untitled Piece') as string;
                return (
                  <li key={item.id || `${itemTitle}-${idx}`} className="ec-setlist-item">
                    <strong>{itemTitle}</strong>
                    {item.composer && (
                      <span className="ec-composer-text">
                        {' '}— {item.composer}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {isParentPerformanceDeclined ? (
          <div className="text-center text-xs text-muted ec-excused-message">
            🚫 Excused (Parent Performance Declined)
          </div>
        ) : (
          <>
            <div className="event-card-rsvp-actions flex-responsive ec-rsvp-actions">
              <button 
                onClick={() => handleRSVP('Yes')}
                className={`btn ec-rsvp-btn ${rsvp === 'Yes' ? 'btn-primary' : 'btn-ghost'}`}
                disabled={isWindowClosed || submittingStatus !== null}
              >
                {submittingStatus === 'Yes' ? 'Processing...' : labels.yes}
              </button>
              <button 
                onClick={() => handleRSVP('No')}
                className={`btn ec-rsvp-btn ${rsvp === 'No' ? 'btn-danger' : 'btn-ghost'}`}
                disabled={isWindowClosed || submittingStatus !== null}
              >
                {submittingStatus === 'No' ? 'Processing...' : labels.no}
              </button>
            </div>
            {isWindowClosed && (
              <div className="rsvp-closed-message text-center text-xs text-muted ec-rsvp-closed-message">
                {isPerformance 
                  ? 'The RSVP window for this performance is closed. Contact choir admins if you need help changing your commitment.' 
                  : 'This rehearsal has already passed.'}
              </div>
            )}
          </>
        )}
      </div>
    </AppCard>
  );
};
