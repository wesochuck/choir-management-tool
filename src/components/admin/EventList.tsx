import React from 'react';
import type { Event } from '../../services/eventService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';

function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return timeStr;
  const hrs = parseInt(match[1], 10);
  const mins = match[2];
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 || 12;
  return `${displayHrs}:${mins} ${ampm}`;
}

interface EventListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onSendMessage: (event: Event) => void;
  onViewRoster: (event: Event) => void;
  onCheckAttendance?: (event: Event) => void;
  onViewSeating?: (event: Event) => void;
  onOpenPlayer?: (event: Event) => void;
  onClone?: (event: Event) => void;
  openAuditionEventId?: string;
}
import { AppCard } from '../common/AppCard';

export const EventList: React.FC<EventListProps> = ({ 
  events, 
  onEdit, 
  onSendMessage, 
  onViewRoster, 
  onCheckAttendance,
  onViewSeating,
  onOpenPlayer,
  onClone,
  openAuditionEventId
}) => {
  const { timezone } = useChoirSettings();
  const [activeDropdownId, setActiveDropdownId] = React.useState<string | null>(null);

  // Click outside to dismiss open dropdowns
  React.useEffect(() => {
    if (!activeDropdownId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeDropdownId]);

  return (
    <AppCard noPadding style={{ gap: 0 }}>
      {events.map((e) => (
        <div 
          key={e.id} 
          className="flex-responsive relative-row clickable-row event-row" 
          onClick={() => onEdit(e)}
          role="button"
          tabIndex={0}
          aria-label={`Edit ${e.title || e.type} event`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onEdit(e);
            }
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
                {formatInTimezone(e.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {e.callTime && (
                <span className="badge" style={{
                  backgroundColor: '#eef2ff',
                  color: '#4338ca',
                  border: '1px solid #c7d2fe',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  📢 Call: {formatTime12h(e.callTime)}
                </span>
              )}
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
          <div className="admin-event-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onViewRoster(e);
              }}
              className={e.type === 'Rehearsal' && !e.isOpenForRSVP ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
              style={{ fontWeight: 700 }}
            >
              RSVP Roster
            </button>
            {onCheckAttendance && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onCheckAttendance(e);
                }}
                className="btn btn-secondary btn-sm"
                title="Take attendance for this event"
                style={{ fontWeight: 700 }}
              >
                📋 Attendance
              </button>
            )}
            {onViewSeating && e.type === 'Performance' && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onViewSeating(e);
                }}
                className="btn btn-secondary btn-sm"
                title="Open seating chart for this performance"
                style={{ fontWeight: 700 }}
              >
                🪑 Seating
              </button>
            )}

            {/* Actions Dropdown Button Panel */}
            <div className="actions-dropdown-container" style={{ position: 'relative' }}>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveDropdownId(activeDropdownId === e.id ? null : e.id);
                }}
                className="btn btn-secondary btn-sm"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  border: '1px solid var(--border)'
                }}
                title="More Actions"
              >
                ⋮
              </button>

              {activeDropdownId === e.id && (
                <div 
                  className="dropdown-menu shadow-lg" 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    width: '180px',
                    backgroundColor: 'var(--surface, #ffffff)',
                    border: '1px solid var(--border, #cbd5e1)',
                    borderRadius: 'var(--radius-md, 8px)',
                    padding: '6px 0',
                    zIndex: 250,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
                  }}
                >
                  {onOpenPlayer && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDropdownId(null);
                        onOpenPlayer(e);
                      }}
                      className="dropdown-item btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(event) => event.currentTarget.style.backgroundColor = 'var(--primary-light, #f1f5f9)'}
                      onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      🎧 Practice Player
                    </button>
                  )}
                  <button 
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDropdownId(null);
                      onSendMessage(e);
                    }}
                    className="dropdown-item btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(event) => event.currentTarget.style.backgroundColor = 'var(--primary-light, #f1f5f9)'}
                    onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ✉️ Send Message
                  </button>
                  {onClone && e.type === 'Performance' && (
                    <button 
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDropdownId(null);
                        onClone(e);
                      }}
                      className="dropdown-item btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(event) => event.currentTarget.style.backgroundColor = 'var(--primary-light, #f1f5f9)'}
                      onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      👯 Clone Performance
                    </button>
                  )}
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  <button 
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDropdownId(null);
                      onEdit(e);
                    }}
                    className="dropdown-item btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--primary-deep, #345940)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 700,
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(event) => event.currentTarget.style.backgroundColor = 'var(--primary-light, #f1f5f9)'}
                    onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ✏️ Edit Event
                  </button>
                </div>
              )}
            </div>
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
