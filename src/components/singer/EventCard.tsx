import React from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../../services/eventService';
import { calendarUtils } from '../../lib/calendar';
import { getSetListVisibilityResult } from '../../lib/eventUtils';
import type { EventRoster } from '../../services/rosterService';
import { AppCard } from '../common/AppCard';
import { musicLibraryService, type MusicPiece } from '../../services/musicLibraryService';
import { resolveRecommendedTracks } from '../../lib/musicPieceUtils';
import { pb } from '../../lib/pocketbase';
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

interface EventCardProps {
  event: Event;
  rsvp?: 'Yes' | 'No' | 'Pending';
  onRSVP: (rsvp: 'Yes' | 'No') => Promise<void>;
  allEvents?: Event[];
  myRosters?: Record<string, EventRoster>;
  voicePart?: string;
}

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  rsvp = 'Pending', 
  onRSVP,
  allEvents = [],
  myRosters = {},
  voicePart
}) => {
  const { timezone } = useChoirSettings();
  const isPerformance = event.type === 'Performance';
  const { showSetList, setList, headerLabel } = getSetListVisibilityResult(event, myRosters, allEvents);

  const [library, setLibrary] = React.useState<MusicPiece[]>([]);
  const [playingTrack, setPlayingTrack] = React.useState<{ songId: string; label: string; url: string } | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = React.useState(false);

  const handleOpenPlayer = async () => {
    try {
      setIsGeneratingToken(true);
      // Since this is the singer dashboard, we are authenticated. 
      // We can use the admin-only token generation API if we have permission,
      // or we can just navigate to /player and let it handle auth.
      // But the spec says standalone links use HMAC.
      
      // Let's check if there's a public way to get a player token or if we should 
      // just pass the eventId if authenticated.
      
      // For now, let's assume the singer can generate their own practice token 
      // via a dedicated endpoint or we just use eventId if auth is present.
      
      // Refined Approach: Redirect to /player?eventId=xxx if authenticated.
      window.open(`/player?eventId=${event.id}`, '_blank');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  React.useEffect(() => {
    if (showSetList) {
      musicLibraryService.getLibrary().then(setLibrary).catch(console.error);
    }
  }, [showSetList]);

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
            {showSetList && setList && setList.length > 0 && (
              <button 
                onClick={handleOpenPlayer}
                className="btn btn-primary btn-sm"
                disabled={isGeneratingToken}
              >
                🎧 Practice Player
              </button>
            )}
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
          
          {showSetList && setList && setList.length > 0 && (
            <div className="flex-col" style={{ marginTop: 'var(--space-sm)', backgroundColor: 'var(--bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
              <div className="text-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>{headerLabel || 'Set List'}</div>
              <ol style={{ margin: 0, paddingLeft: 'var(--space-lg)', gap: '8px', display: 'flex', flexDirection: 'column' }}>
                {setList.map(item => {
                  const isIntermission = item.type === 'intermission';
                  if (isIntermission) {
                    return (
                      <li key={item.id} className="text-muted text-sm" style={{ listStyleType: 'none', margin: 'var(--space-xs) 0 var(--space-xs) calc(-1 * var(--space-lg))', padding: 'var(--space-xs) var(--space-sm)', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)' }}>
                        <strong style={{ color: 'var(--primary-deep)' }}>⏸️ {item.title}</strong> {item.duration && <span className="text-muted">({item.duration})</span>}
                        {item.notes && <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: '2px' }}>{item.notes}</div>}
                      </li>
                    );
                  }
                  
                  const piece = item.pieceId ? library.find(p => p.id === item.pieceId) : null;
                  const movements = piece ? library.filter(p => p.parentId === piece.id).sort((a, b) => (a.created || '').localeCompare(b.created || '')) : [];
                  const resolvedComposer = item.composer || piece?.composer || '';

                  if (movements.length > 0) {
                    return (
                      <li key={item.id} className="text-body text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>
                          <strong>{item.title}</strong>
                          {resolvedComposer && <span className="text-muted"> ({resolvedComposer})</span>}
                          {item.notes && <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: '2px' }}>{item.notes}</div>}
                        </div>
                        
                        {/* Nested movements */}
                        <ol style={{ margin: '4px 0 0 0', paddingLeft: 'var(--space-lg)', gap: '8px', display: 'flex', flexDirection: 'column', listStyleType: 'decimal' }}>
                          {movements.map(m => {
                            const recommendedTracks = resolveRecommendedTracks(voicePart, m.audioTrackMapping);
                            const movementTrackId = `${item.id}_${m.id}`;
                            return (
                              <li key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                                  <span className="text-sm">
                                    {m.title} {m.duration && <span className="text-xs text-muted">({m.duration})</span>}
                                  </span>
                                  {recommendedTracks.length > 0 && (
                                    <div className="flex-row" style={{ gap: '4px', flexWrap: 'wrap' }}>
                                      {recommendedTracks.map(trackKey => {
                                        const filename = m.audioTrackMapping?.[trackKey];
                                        if (!filename) return null;
                                        const url = pb.files.getURL(m, filename);
                                        const isCurrent = playingTrack?.songId === movementTrackId && playingTrack?.label === trackKey;
                                        return (
                                          <button
                                            key={trackKey}
                                            type="button"
                                            onClick={() => {
                                              if (isCurrent) {
                                                setPlayingTrack(null);
                                              } else {
                                                setPlayingTrack({
                                                  songId: movementTrackId,
                                                  label: trackKey === 'tutti' ? 'Tutti' : trackKey,
                                                  url
                                                });
                                              }
                                            }}
                                            className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                            style={{
                                              fontSize: '11px',
                                              padding: '2px 8px',
                                              height: '22px',
                                              minHeight: '22px',
                                              borderRadius: '12px',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                              margin: 0
                                            }}
                                          >
                                            🎵 {trackKey === 'tutti' ? 'Tutti' : trackKey}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                
                                {playingTrack && playingTrack.songId === movementTrackId && (
                                  <div className="flex-row" style={{ 
                                    alignItems: 'center', 
                                    gap: 'var(--space-sm)', 
                                    padding: '6px 10px', 
                                    backgroundColor: 'rgba(74, 124, 89, 0.05)', 
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px', 
                                    marginTop: '4px' 
                                  }}>
                                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                                      {playingTrack.label}
                                    </span>
                                    <audio 
                                      src={playingTrack.url} 
                                      controls 
                                      autoPlay 
                                      style={{ height: '26px', flex: 1, minWidth: '0' }} 
                                    />
                                    <button 
                                      type="button" 
                                      onClick={() => setPlayingTrack(null)}
                                      style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: 'var(--text-muted)', 
                                        cursor: 'pointer', 
                                        fontSize: '14px', 
                                        padding: '2px 6px',
                                        lineHeight: 1
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      </li>
                    );
                  }

                  const recommendedTracks = piece ? resolveRecommendedTracks(voicePart, piece.audioTrackMapping) : [];

                  return (
                    <li key={item.id} className="text-body text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                        <div>
                          <strong>{item.title}</strong>
                          {(resolvedComposer || item.duration) && <span className="text-muted"> ({resolvedComposer}{resolvedComposer && item.duration ? ' • ' : ''}{item.duration})</span>}
                          {item.notes && <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: '2px' }}>{item.notes}</div>}
                        </div>
                        
                        {recommendedTracks.length > 0 && piece && (
                          <div className="flex-row" style={{ gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {recommendedTracks.map(trackKey => {
                              const filename = piece.audioTrackMapping?.[trackKey];
                              if (!filename) return null;
                              const url = pb.files.getURL(piece, filename);
                              const isCurrent = playingTrack?.songId === item.id && playingTrack?.label === trackKey;
                              return (
                                <button
                                  key={trackKey}
                                  type="button"
                                  onClick={() => {
                                    if (isCurrent) {
                                      setPlayingTrack(null);
                                    } else {
                                      setPlayingTrack({
                                        songId: item.id,
                                        label: trackKey === 'tutti' ? 'Tutti' : trackKey,
                                        url
                                      });
                                    }
                                  }}
                                  className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    height: '22px',
                                    minHeight: '22px',
                                    borderRadius: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    margin: 0
                                  }}
                                >
                                  🎵 {trackKey === 'tutti' ? 'Tutti' : trackKey}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {playingTrack && playingTrack.songId === item.id && (
                        <div className="flex-row" style={{ 
                          alignItems: 'center', 
                          gap: 'var(--space-sm)', 
                          padding: '6px 10px', 
                          backgroundColor: 'rgba(74, 124, 89, 0.05)', 
                          border: '1px solid var(--border)',
                          borderRadius: '8px', 
                          marginTop: '4px' 
                        }}>
                          <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                            {playingTrack.label}
                          </span>
                          <audio 
                            src={playingTrack.url} 
                            controls 
                            autoPlay 
                            style={{ height: '26px', flex: 1, minWidth: '0' }} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setPlayingTrack(null)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: 'var(--text-muted)', 
                              cursor: 'pointer', 
                              fontSize: '14px', 
                              padding: '2px 6px',
                              lineHeight: 1
                            }}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
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
