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

  const baseBtnClasses = 'inline-flex items-center justify-center rounded-md font-sans font-medium border cursor-pointer gap-2 whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed h-8 px-4 text-xs';

  return (
    <AppCard noPadding>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex w-full flex-row items-center justify-between max-sm:flex-col max-sm:items-stretch max-sm:gap-2">
          <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold tracking-wider uppercase ${isPerformance ? 'bg-danger-bg text-danger-text' : 'bg-primary-light text-primary-deep'}`}>
             {event.type}
           </span>
           <div className="flex flex-row flex-wrap justify-end gap-1 max-sm:grid max-sm:w-full max-sm:grid-cols-[repeat(auto-fit,minmax(80px,1fr))] max-sm:gap-1.5">
             <button 
               onClick={() => calendarUtils.generateICS(event)}
               className={`${baseBtnClasses} border-border bg-transparent text-text-muted hover:bg-primary-light hover:text-primary-deep max-sm:w-full max-sm:justify-center max-sm:px-1 max-sm:py-1.5 max-sm:text-xs`}
             >
               📅 Add
             </button>
             {previewData.visible && previewData.setList && previewData.setList.length > 0 && (
               <button 
                 onClick={handleOpenPlayer}
                 className={`${baseBtnClasses} bg-primary text-surface hover:bg-primary-deep hover:shadow-md max-sm:w-full max-sm:justify-center max-sm:px-1 max-sm:py-1.5 max-sm:text-xs`}
               >
                 🎧 Practice
               </button>
             )}
             {isPerformance && rsvp !== 'No' && (
               <Link 
                 to={`/seating/${event.id}`}
                  className={`${baseBtnClasses} bg-primary-light text-primary-deep hover:bg-primary-deep/10 max-sm:w-full max-sm:justify-center max-sm:px-1 max-sm:py-1.5 max-sm:text-xs`}
               >
                 🪑 Seating
               </Link>
             )}
           </div>
        </div>


        <div className="flex flex-col gap-1">
          <div className="flex flex-row flex-wrap items-center gap-2">
            <h3 className="m-0 text-sm font-medium text-primary">
              {formatInTimezone(event.date, timezone)}
            </h3>
            {event.callTime && (
              <span className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold tracking-wider text-indigo-700 uppercase shadow-sm">
                📢 Call Time: {formatTime12h(event.callTime)}
              </span>
            )}
          </div>
          {event.title && <div className="text-lg font-semibold text-text">{event.title}</div>}
          <div className="text-sm font-medium text-text">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.expand?.venue?.address || event.expand?.venue?.name || '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1"
            >
              📍 {event.expand?.venue?.name || ''}
            </a>
          </div>
          {event.details && <p className="text-sm text-text-muted">{event.details}</p>}
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
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold"
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
                  className="inline-flex rounded border-none px-1.5 py-0.5 text-xs font-bold"
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
          <div className="my-2 rounded-xl border border-border bg-surface p-4">
            <h5 className="m-0 mb-1 text-sm text-text-muted">
              📋 {previewData.label}
            </h5>

            <ol className="m-0 pl-5 text-sm">
              {previewData.setList.map((item, idx) => {
                const rawItem = item as unknown as Record<string, unknown>;
                const itemTitle = (rawItem.title || rawItem.pieceTitle || 'Untitled Piece') as string;
                return (
                  <li key={item.id || `${itemTitle}-${idx}`} className="mb-1">
                    <strong>{itemTitle}</strong>
                    {item.composer && (
                      <span className="text-xs text-text-muted">
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
          <div className="mt-1 w-full rounded-md border border-dashed border-border bg-bg p-2.5 text-center text-xs text-text-muted">
            🚫 Excused (Parent Performance Declined)
          </div>
        ) : (
          <>
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
              <button 
                onClick={() => handleRSVP('Yes')}
                className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border font-sans font-medium whitespace-nowrap transition-all disabled:cursor-not-allowed disabled:opacity-50 ${rsvp === 'Yes' ? 'bg-primary text-surface hover:bg-primary-deep hover:shadow-md' : 'border-border bg-transparent text-text-muted hover:bg-primary-light hover:text-primary-deep'} max-sm:min-h-[44px]`}
                disabled={isWindowClosed || submittingStatus !== null}
              >
                {submittingStatus === 'Yes' ? 'Processing...' : labels.yes}
              </button>
              <button 
                onClick={() => handleRSVP('No')}
                className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border font-sans font-medium whitespace-nowrap transition-all disabled:cursor-not-allowed disabled:opacity-50 ${rsvp === 'No' ? 'bg-danger-bg text-danger-text hover:border-red-300 hover:bg-red-200' : 'border-border bg-transparent text-text-muted hover:bg-primary-light hover:text-primary-deep'} max-sm:min-h-[44px]`}
                disabled={isWindowClosed || submittingStatus !== null}
              >
                {submittingStatus === 'No' ? 'Processing...' : labels.no}
              </button>
            </div>
            {isWindowClosed && (
              <div className="mt-1 w-full text-center text-xs text-text-muted">
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
